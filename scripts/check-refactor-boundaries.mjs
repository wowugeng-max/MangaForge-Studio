import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
const requireFromWeb = createRequire(new URL('../ui/web/package.json', import.meta.url))
const ts = requireFromWeb('typescript')
const defaultConfigPath = path.join(repoRoot, 'scripts', 'refactor-boundaries.json')
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])
const extensionlessResolutionOrder = ['.tsx', '.jsx', '.mts', '.ts', '.mjs', '.js', '.cts', '.cjs']
const runtimeExtensionRemaps = new Map([
  ['.js', ['.ts', '.tsx']],
  ['.jsx', ['.tsx']],
  ['.mjs', ['.mts']],
])
const ignoredDirs = new Set(['.git', '.worktrees', 'node_modules', 'dist', 'build', 'coverage', 'vendor'])
const maxTemplateNesting = 128

class ModuleSyntaxScanError extends Error {}

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
  // This line ratchet counts directly named declarations; export {}, export type {}, and export * are re-exports.
  return text
    .split(/\r?\n/)
    .filter(line => /^\s*export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+[A-Za-z_$][A-Za-z0-9_$]*/.test(line))
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

function scriptKindForFile(file) {
  const extension = path.extname(file)
  if (extension === '.tsx') return ts.ScriptKind.TSX
  if (extension === '.jsx') return ts.ScriptKind.JSX
  if (['.js', '.mjs', '.cjs'].includes(extension)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

function extractRelativeModuleSpecifiers(text, file) {
  const specifiers = []
  const addStringLiteral = (node) => {
    if (node && ts.isStringLiteral(node) && node.text.startsWith('.')) specifiers.push(node.text)
  }
  let sourceFile
  try {
    sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, scriptKindForFile(file))
  } catch (error) {
    if (error instanceof RangeError) {
      throw new ModuleSyntaxScanError(`template nesting exceeds ${maxTemplateNesting}`)
    }
    throw error
  }

  const stack = [{ node: sourceFile, templateDepth: 0 }]
  while (stack.length) {
    const { node, templateDepth } = stack.pop()
    const nextTemplateDepth = templateDepth + (
      ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node) ? 1 : 0
    )
    if (nextTemplateDepth > maxTemplateNesting) {
      throw new ModuleSyntaxScanError(`template nesting exceeds ${maxTemplateNesting}`)
    }

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addStringLiteral(node.moduleSpecifier)
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      addStringLiteral(node.moduleReference.expression)
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const isBareRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
      if (isDynamicImport || isBareRequire) addStringLiteral(node.arguments[0])
    }

    ts.forEachChild(node, child => {
      stack.push({ node: child, templateDepth: nextTemplateDepth })
    })
  }
  return specifiers
}

function canonicalExistingPath(filePath) {
  try {
    return fs.realpathSync(filePath)
  } catch {
    return null
  }
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

function resolveLegacyTarget(root, rule) {
  const rawTarget = typeof rule?.target === 'string' ? rule.target.trim() : ''
  const label = rawTarget || '(missing target)'
  if (!rawTarget) return { error: `invalid legacy import target ${label}: target must be a non-empty relative path` }
  if (path.isAbsolute(rawTarget)) return { error: `invalid legacy import target ${label}: absolute paths are not allowed` }

  const lexicalRoot = path.resolve(root)
  const lexicalTarget = path.resolve(lexicalRoot, rawTarget)
  if (!isPathInside(lexicalRoot, lexicalTarget)) {
    return { error: `invalid legacy import target ${label}: path escapes repository root` }
  }

  const canonicalRoot = canonicalExistingPath(lexicalRoot)
  const canonicalTarget = canonicalExistingPath(lexicalTarget)
  if (!canonicalRoot || !canonicalTarget) {
    return { error: `invalid legacy import target ${label}: target must be an existing regular file` }
  }
  if (!isPathInside(canonicalRoot, canonicalTarget)) {
    return { error: `invalid legacy import target ${label}: real path escapes repository root` }
  }
  if (!fs.statSync(canonicalTarget).isFile()) {
    return { error: `invalid legacy import target ${label}: target must be an existing regular file` }
  }
  return {
    canonicalTarget,
    target: normalizeRelative(rawTarget),
  }
}

function resolveRelativeSource(root, importer, specifier) {
  if (!specifier.startsWith('.')) return null
  const basePath = path.resolve(root, path.dirname(importer), specifier)
  const candidates = []
  const requestedExtension = path.extname(basePath)
  if (sourceExtensions.has(requestedExtension)) {
    candidates.push(basePath)
    const remappedBase = basePath.slice(0, -requestedExtension.length)
    for (const extension of runtimeExtensionRemaps.get(requestedExtension) || []) {
      candidates.push(`${remappedBase}${extension}`)
    }
  } else {
    candidates.push(basePath)
    for (const extension of extensionlessResolutionOrder) candidates.push(`${basePath}${extension}`)
    for (const extension of extensionlessResolutionOrder) candidates.push(path.join(basePath, `index${extension}`))
  }
  for (const candidate of candidates) {
    const canonical = canonicalExistingPath(candidate)
    if (canonical && fs.statSync(canonical).isFile()) return canonical
  }
  return null
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
  const specifierCache = new Map()

  function readModuleSpecifiers(file) {
    if (specifierCache.has(file)) return specifierCache.get(file)
    try {
      const specifiers = extractRelativeModuleSpecifiers(fs.readFileSync(path.join(root, file), 'utf8'), file)
      specifierCache.set(file, specifiers)
      return specifiers
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${file} could not be scanned: ${message}`)
      specifierCache.set(file, null)
      return null
    }
  }

  for (const rule of legacyImports) {
    const resolvedTarget = resolveLegacyTarget(root, rule)
    if (resolvedTarget.error) {
      failures.push(resolvedTarget.error)
      continue
    }
    const { canonicalTarget, target } = resolvedTarget
    const allowed = new Set((rule.allowed_importers || rule.allowedImporters || []).map((item) => normalizeRelative(String(item))))
    for (const file of files) {
      const specifiers = readModuleSpecifiers(file)
      if (!specifiers) continue
      const specifier = specifiers
        .find((item) => resolveRelativeSource(root, file, item) === canonicalTarget)
      if (!specifier || allowed.has(file)) continue
      failures.push(`${file} imports ${specifier}, which resolves to legacy target ${target}; allowed importers: ${Array.from(allowed).join(', ') || '(none)'}`)
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
