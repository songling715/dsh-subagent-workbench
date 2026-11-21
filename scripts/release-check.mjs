import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const fail = message => {
  console.error('release-check: ' + message)
  process.exit(1)
}

if (pkg.private === true) fail('package.json still has "private": true')
if (!pkg.name || !pkg.version) fail('package name/version is missing')
if (pkg.version.includes('+')) fail('build metadata is not supported in the release version')
if (!pkg.dsh || !pkg.dsh.bundle || !pkg.dsh.bundle.patch) fail('dsh.bundle.patch is missing')
if (!pkg.dsh.client) fail('dsh.client is missing')
if (!pkg.engines || !pkg.engines.dsh) fail('engines.dsh is missing')
if (!pkg.peerDependencies || !pkg.peerDependencies['@deepseek-ai/cordis']) {
  fail('@deepseek-ai/cordis peer dependency is missing')
}
if (!Array.isArray(pkg.files) || pkg.files.length === 0) fail('files[] is missing')

const tag = process.env.GITHUB_REF_NAME || ''
if (tag.startsWith('v') && tag !== 'v' + pkg.version) {
  fail(`tag ${tag} does not match v${pkg.version}`)
}

execFileSync(process.execPath, ['scripts/check.mjs'], { cwd: root, stdio: 'inherit' })

const host = readFileSync(resolve(root, 'lib', 'index.js'), 'utf8')
if (/\bspike_/u.test(host)) fail('lib/index.js still exposes spike_* tools')

const npmArgs = ['pack', '--dry-run', '--json', '--ignore-scripts']
const packed = process.platform === 'win32'
  ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm ' + npmArgs.join(' ')], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  : execFileSync('npm', npmArgs, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
const report = JSON.parse(packed)
const files = new Set((report[0]?.files || []).map(file => file.path))
const required = [
  'lib/index.js',
  'lib/client.js',
  'index.js',
  'cordis.patch.yml',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'COMPATIBILITY.md',
  'icon.svg',
  'locale/en.json',
  'locale/zh.json',
  'docs/DETAIL.md',
  'docs/PUBLISHING.md',
]
for (const file of required) {
  if (!files.has(file)) fail(`packed artifact is missing ${file}`)
}
for (const file of files) {
  if (file.endsWith('.log') || file.includes('node_modules/')) {
    fail(`unexpected packed file ${file}`)
  }
}

const prerelease = pkg.version.includes('-')
console.log('release-check: OK')
console.log('  package: ' + pkg.name + '@' + pkg.version)
console.log('  dist-tag: ' + (prerelease ? 'next' : 'latest'))
console.log('  tarball files: ' + files.size)
console.log('  tag: ' + (tag || '(not running on a tag)'))
