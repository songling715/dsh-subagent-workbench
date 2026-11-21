/**
 * Package-format self check. Run with `npm run check`.
 * Verifies publish-critical metadata, file completeness, and the three
 * places that must agree on the package name.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = relative => readFileSync(join(root, relative), 'utf8')
const errors = []
const need = (condition, message) => { if (!condition) errors.push(message) }

const pkg = JSON.parse(read('package.json'))

need(typeof pkg.name === 'string' && pkg.name.length > 0, 'package.json: name is required')
need(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(pkg.version)), 'package.json: version must be semver')
need(pkg.private !== true, 'package.json: remove "private" before publishing')
need(pkg.license === 'MIT', 'package.json: license must be MIT')
need(pkg.main === 'lib/index.js', 'package.json: main must be lib/index.js')
need(pkg.exports && pkg.exports['./client'] === './lib/client.js',
  "package.json: exports['./client'] must be ./lib/client.js")
need(pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch === './cordis.patch.yml', 'package.json: dsh.bundle.patch is required')
need(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web', 'package.json: dsh.client.platform must be web')
need(pkg.engines && typeof pkg.engines.dsh === 'string', 'package.json: engines.dsh is required')
need(Array.isArray(pkg.files) && pkg.files.includes('lib') && pkg.files.includes('src') && pkg.files.includes('index.js'),
  'package.json: files must include lib, src, and the loader compatibility entry index.js')

const requiredFiles = [
  'index.js',
  'lib/index.js',
  'lib/client.js',
  'src/index.js',
  'src/client.js',
  'cordis.patch.yml',
  'icon.svg',
  'docs/DETAIL.md',
  'locale/zh.json',
  'locale/en.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
]
for (const file of requiredFiles) need(existsSync(join(root, file)), `missing file: ${file}`)

const locale = (name) => JSON.parse(read(`locale/${name}.json`))
for (const name of ['zh', 'en']) {
  if (!existsSync(join(root, `locale/${name}.json`))) continue
  const data = locale(name)
  need(data.meta && data.meta.title, `locale/${name}.json: meta.title is required`)
  need(data.meta && data.meta.description, `locale/${name}.json: meta.description is required`)
  need(data.meta && data.meta.detail === 'docs/DETAIL.md', `locale/${name}.json: meta.detail must be docs/DETAIL.md`)
}

const patch = read('cordis.patch.yml')
need(patch.includes(pkg.name), 'cordis.patch.yml: row name must equal the package name')

const client = read('lib/client.js')
need(client.includes(`id: '${pkg.name}'`) || client.includes(`id: "${pkg.name}"`), 'lib/client.js: ModuleLoader id must equal the package name')
need(client === read('src/client.js'), 'lib/client.js must be built from src/client.js')

const host = await import(pathToFileURL(join(root, 'lib/index.js')).href)
need(typeof host.apply === 'function', 'lib/index.js: export apply(ctx)')
need(typeof host.name === 'string' && host.name.length > 0, 'lib/index.js: export name')
need(Array.isArray(host.inject) && host.inject.includes('subagents'), 'lib/index.js: inject must include "subagents"')

if (errors.length > 0) {
  console.error(`FAIL ${pkg.name}@${pkg.version}`)
  for (const error of errors) console.error(` - ${error}`)
  process.exit(1)
}
console.log(`OK ${pkg.name}@${pkg.version}`)
