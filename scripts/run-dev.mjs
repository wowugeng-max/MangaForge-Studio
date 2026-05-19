import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const processes = [
  {
    name: 'server',
    cwd: resolve(root, 'ui/server'),
    command: 'bun',
    args: ['run', 'dev'],
    url: 'http://localhost:8787',
  },
  {
    name: 'web',
    cwd: resolve(root, 'ui/web'),
    command: 'bun',
    args: ['run', 'dev'],
    url: 'http://localhost:5173',
  },
]

const children = []
let shuttingDown = false

function stopAll(signal = 'SIGTERM') {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

for (const item of processes) {
  const child = spawn(item.command, item.args, {
    cwd: item.cwd,
    stdio: 'inherit',
    env: { ...process.env },
  })
  children.push(child)
  console.log(`[dev] ${item.name} starting in ${item.cwd}`)
  console.log(`[dev] ${item.name} expected at ${item.url}`)
  child.on('exit', code => {
    if (!shuttingDown && code !== 0) {
      console.error(`[dev] ${item.name} exited with code ${code}`)
      stopAll()
      process.exitCode = code || 1
    }
  })
}

process.on('SIGINT', () => stopAll('SIGINT'))
process.on('SIGTERM', () => stopAll('SIGTERM'))
