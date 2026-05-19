#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import net from 'node:net'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const host = process.env.HOST || '127.0.0.1'
const bunBin = process.env.BUN_BIN || 'bun'
const startupTimeoutMs = Number(process.env.SMOKE_SERVER_TIMEOUT_MS || 30000)

async function findFreePort() {
  const server = net.createServer()
  server.unref()
  server.listen(0, host)
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  await new Promise(resolveClose => server.close(resolveClose))
  if (!port) throw new Error('Unable to allocate a local port')
  return port
}

function spawnLogged(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  })
  child.stdout.on('data', chunk => process.stdout.write(chunk))
  child.stderr.on('data', chunk => process.stderr.write(chunk))
  return child
}

async function waitForStatus(baseUrl, timeoutMs) {
  const startedAt = Date.now()
  let lastError = ''
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/status`)
      if (res.ok) return
      lastError = `${res.status} ${await res.text()}`
    } catch (error) {
      lastError = String(error?.message || error)
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 500))
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms: ${lastError}`)
}

async function waitForExit(child) {
  const [code, signal] = await once(child, 'exit')
  if (code === 0) return
  throw new Error(`Process exited with ${signal || `code ${code}`}`)
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode) return
  child.kill('SIGTERM')
  const timeout = setTimeout(() => child.kill('SIGKILL'), 3000)
  try {
    await once(child, 'exit')
  } finally {
    clearTimeout(timeout)
  }
}

const port = Number(process.env.PORT || await findFreePort())
const baseUrl = `http://${host}:${port}/api`
let server = null

try {
  console.log(`[smoke] Starting MangaForge server on ${baseUrl}`)
  server = spawnLogged(bunBin, ['ui/server/src/index.ts'], {
    env: {
      PORT: String(port),
      HOST: host,
    },
  })
  await waitForStatus(baseUrl, startupTimeoutMs)
  console.log('[smoke] Server is ready')

  const smoke = spawnLogged(process.execPath, ['scripts/check-novel-generation-workflow.mjs'], {
    env: {
      MANGAFORGE_API_URL: baseUrl,
    },
  })
  await waitForExit(smoke)
  console.log('[smoke] Novel workflow smoke passed')
} finally {
  await stopServer(server)
}
