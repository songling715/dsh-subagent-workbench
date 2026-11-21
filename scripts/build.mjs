/**
 * Build the published entry points from `src/`.
 *
 * The official DSH client packages publish `lib/index.js` and
 * `lib/client.js` built by tsdown. This plugin is authored in plain ESM, so
 * the build is a deterministic copy: the package `main` and the
 * `"./client"` export always point at `lib/`, never at source files.
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const files = ['index.js', 'client.js']

await mkdir(join(root, 'lib'), { recursive: true })
for (const file of files) {
  await copyFile(join(root, 'src', file), join(root, 'lib', file))
}

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
if (pkg.main !== 'lib/index.js') throw new Error('package.json main must be lib/index.js')
if (!pkg.exports || pkg.exports['./client'] !== './lib/client.js') {
  throw new Error("package.json exports['./client'] must be ./lib/client.js")
}

console.log(`built lib/ from src/ for ${pkg.name}@${pkg.version}`)
