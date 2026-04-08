import { spawn } from 'child_process'

function runStep(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true })
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const passThroughArgs = process.argv.slice(2)

  console.log('=== Manga Release Check ===')
  console.log('[1/2] Running export...')
  await runStep('bun', ['run', 'manga:export', ...passThroughArgs])

  console.log('\n[2/2] Verifying export artifacts...')
  await runStep('bun', ['run', 'manga:verify-exports', ...passThroughArgs])

  console.log('\nRelease check passed.')
}

main().catch(error => {
  console.error('\nRelease check failed:')
  console.error(error)
  process.exitCode = 1
})
