import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (!existsSync('.git/HEAD')) {
  console.log('Skipping Husky install: Git repository is not initialized.')
  process.exit(0)
}

const result = spawnSync('husky', { shell: true, stdio: 'inherit' })
process.exit(result.status ?? 1)
