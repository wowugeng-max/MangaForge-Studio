import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
const defaultConfigPath = path.join(repoRoot, 'scripts', 'refactor-boundaries.json')
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const ignoredDirs = new Set(['.git', '.worktrees', 'node_modules', 'dist', 'build', 'coverage', 'vendor'])

function parseArgs(argv) {
  const args = { root: repoRoot, config: defaultConfigPath }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') args.root = path.resolve(argv[++index] || '')
    if (arg === '--config') args.config = path.resolve(argv[++index] || '')
  }
  return args
}

function fail(messages) {
  for (const message of messages) console.error(`[refactor-boundaries] ${message}`)
  process.exit(1)
}

function normalizeRelative(filePath) {
  return filePath.split(path.sep).join('/')
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail([`cannot read config ${filePath}: ${error.message}`])
  }
}

function countLines(text) {
  if (!text) return 0
  return text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0)
}

function countExportedDeclarations(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\s*export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+/.test(line))
    .length
}

function walkSourceFiles(root, relativeDir, output) {
  const absoluteDir = path.join(root, relativeDir)
  if (!fs.existsSync(absoluteDir)) return
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue
      walkSourceFiles(root, path.join(relativeDir, entry.name), output)
      continue
    }
    if (!entry.isFile()) continue
    if (!sourceExtensions.has(path.extname(entry.name))) continue
    output.push(normalizeRelative(path.join(relativeDir, entry.name)))
  }
}

function importPattern(moduleName) {
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:from\\s*['"]${escaped}['"]|import\\s*\\(\\s*['"]${escaped}['"]|require\\s*\\(\\s*['"]${escaped}['"])`)
}

function checkFileBoundaries(root, config) {
  const failures = []
  for (const item of Array.isArray(config.files) ? config.files : []) {
    const relativePath = normalizeRelative(String(item.path || ''))
    const absolutePath = path.join(root, relativePath)
    if (!relativePath || !fs.existsSync(absolutePath)) {
      failures.push(`${relativePath || '(missing path)'} is missing`)
      continue
    }
    const text = fs.readFileSync(absolutePath, 'utf8')
    const lineCount = countLines(text)
    const maxLines = Number(item.max_lines ?? item.maxLines)
    if (Number.isFinite(maxLines) && lineCount > maxLines) {
      failures.push(`${relativePath} has ${lineCount} lines, max ${maxLines}`)
    }
    const exportCount = countExportedDeclarations(text)
    const maxExports = Number(item.max_exported_declarations ?? item.maxExportedDeclarations)
    if (Number.isFinite(maxExports) && exportCount > maxExports) {
      failures.push(`${relativePath} has ${exportCount} exported declarations, max ${maxExports}`)
    }
  }
  return failures
}

function checkLegacyImports(root, config) {
  const failures = []
  const legacyImports = Array.isArray(config.legacy_imports) ? config.legacy_imports : []
  if (!legacyImports.length) return failures

  const scanRoots = Array.isArray(config.scan_roots) && config.scan_roots.length
    ? config.scan_roots
    : ['.']
  const files = []
  for (const scanRoot of scanRoots) {
    walkSourceFiles(root, scanRoot, files)
  }

  for (const rule of legacyImports) {
    const moduleName = String(rule.module || '')
    if (!moduleName) continue
    const allowed = new Set((rule.allowed_importers || rule.allowedImporters || []).map((item) => normalizeRelative(String(item))))
    const pattern = importPattern(moduleName)
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), 'utf8')
      if (!pattern.test(text) || allowed.has(file)) continue
      failures.push(`${file} imports ${moduleName}; allowed importers: ${Array.from(allowed).join(', ') || '(none)'}`)
    }
  }
  return failures
}

const args = parseArgs(process.argv.slice(2))
const config = readJson(args.config)
const failures = [
  ...checkFileBoundaries(args.root, config),
  ...checkLegacyImports(args.root, config),
]

if (failures.length) fail(failures)

console.log(`[refactor-boundaries] ok: ${(config.files || []).length} file boundaries, ${(config.legacy_imports || []).length} legacy import rules.`)
