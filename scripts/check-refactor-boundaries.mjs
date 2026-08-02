import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
const defaultConfigPath = path.join(repoRoot, 'scripts', 'refactor-boundaries.json')
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])
const runtimeExtensionRemaps = new Map([
  ['.js', ['.ts', '.tsx']],
  ['.jsx', ['.tsx']],
  ['.mjs', ['.mts']],
])
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

function readStringToken(text, start) {
  const quote = text[start]
  let value = ''
  let valid = true
  let index = start + 1
  while (index < text.length) {
    const char = text[index]
    if (char === quote) return { token: valid ? { type: 'string', value } : null, end: index + 1 }
    if (char === '\n' || char === '\r') return { token: null, end: index + 1 }
    if (char !== '\\') {
      value += char
      index += 1
      continue
    }

    index += 1
    if (index >= text.length) return { token: null, end: index }
    const escaped = text[index]
    const simpleEscapes = {
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\v',
      0: '\0',
    }
    if (Object.hasOwn(simpleEscapes, escaped)) {
      value += simpleEscapes[escaped]
      index += 1
      continue
    }
    if (escaped === '\n') {
      index += 1
      continue
    }
    if (escaped === '\r') {
      index += text[index + 1] === '\n' ? 2 : 1
      continue
    }
    if (escaped === 'x') {
      const digits = text.slice(index + 1, index + 3)
      if (/^[0-9A-Fa-f]{2}$/.test(digits)) value += String.fromCodePoint(Number.parseInt(digits, 16))
      else valid = false
      index += 3
      continue
    }
    if (escaped === 'u' && text[index + 1] === '{') {
      const endBrace = text.indexOf('}', index + 2)
      const digits = endBrace === -1 ? '' : text.slice(index + 2, endBrace)
      const codePoint = /^[0-9A-Fa-f]{1,6}$/.test(digits) ? Number.parseInt(digits, 16) : Number.NaN
      if (Number.isInteger(codePoint) && codePoint <= 0x10FFFF) value += String.fromCodePoint(codePoint)
      else valid = false
      index = endBrace === -1 ? index + 2 : endBrace + 1
      continue
    }
    if (escaped === 'u') {
      const digits = text.slice(index + 1, index + 5)
      if (/^[0-9A-Fa-f]{4}$/.test(digits)) value += String.fromCodePoint(Number.parseInt(digits, 16))
      else valid = false
      index += 5
      continue
    }
    value += escaped
    index += 1
  }
  return { token: null, end: index }
}

function tokenizeModuleSyntax(text) {
  const tokens = []

  function scanTemplate(start) {
    let index = start + 1
    while (index < text.length) {
      if (text[index] === '\\') {
        index += 2
        continue
      }
      if (text[index] === '`') return index + 1
      if (text[index] === '$' && text[index + 1] === '{') {
        index = scanCode(index + 2, true)
        continue
      }
      index += 1
    }
    return index
  }

  function scanCode(start, stopAtTemplateBrace = false) {
    let braceDepth = 0
    let index = start
    while (index < text.length) {
      const char = text[index]
      if (/\s/.test(char)) {
        index += 1
        continue
      }
      if (char === '/' && text[index + 1] === '/') {
        index = text.indexOf('\n', index + 2)
        if (index === -1) return text.length
        continue
      }
      if (char === '/' && text[index + 1] === '*') {
        const end = text.indexOf('*/', index + 2)
        index = end === -1 ? text.length : end + 2
        continue
      }
      if (char === '"' || char === "'") {
        const result = readStringToken(text, index)
        if (result.token) tokens.push(result.token)
        index = result.end
        continue
      }
      if (char === '`') {
        index = scanTemplate(index)
        continue
      }
      if (char === '{') {
        braceDepth += 1
        tokens.push({ type: 'punctuation', value: char })
        index += 1
        continue
      }
      if (char === '}') {
        if (stopAtTemplateBrace && braceDepth === 0) return index + 1
        braceDepth = Math.max(0, braceDepth - 1)
        tokens.push({ type: 'punctuation', value: char })
        index += 1
        continue
      }
      if (/[A-Za-z_$]/.test(char)) {
        const identifierStart = index
        index += 1
        while (index < text.length && /[A-Za-z0-9_$]/.test(text[index])) index += 1
        tokens.push({ type: 'identifier', value: text.slice(identifierStart, index) })
        continue
      }
      tokens.push({ type: 'punctuation', value: char })
      index += 1
    }
    return index
  }

  scanCode(0)
  return tokens
}

function extractRelativeModuleSpecifiers(text) {
  const tokens = tokenizeModuleSyntax(text)
  const specifiers = []
  const addStringToken = (token) => {
    if (token?.type === 'string' && token.value.startsWith('.')) specifiers.push(token.value)
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type !== 'identifier') continue
    if (tokens[index - 1]?.value === '.') continue

    if (token.value === 'require') {
      if (tokens[index + 1]?.value === '(' && tokens[index + 2]?.type === 'string') {
        addStringToken(tokens[index + 2])
      }
      continue
    }

    if (token.value !== 'import' && token.value !== 'export') continue
    if (token.value === 'import' && tokens[index + 1]?.value === '(') {
      addStringToken(tokens[index + 2])
      continue
    }
    if (token.value === 'import' && tokens[index + 1]?.type === 'string') {
      addStringToken(tokens[index + 1])
      continue
    }

    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      const candidate = tokens[cursor]
      if (candidate.value === ';') break
      if (cursor > index + 1 && candidate.type === 'identifier' && (candidate.value === 'import' || candidate.value === 'export')) break
      if (candidate.type === 'identifier' && candidate.value === 'from' && tokens[cursor + 1]?.type === 'string') {
        addStringToken(tokens[cursor + 1])
        break
      }
    }
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
    for (const extension of sourceExtensions) candidates.push(`${basePath}${extension}`)
    for (const extension of sourceExtensions) candidates.push(path.join(basePath, `index${extension}`))
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

  for (const rule of legacyImports) {
    const resolvedTarget = resolveLegacyTarget(root, rule)
    if (resolvedTarget.error) {
      failures.push(resolvedTarget.error)
      continue
    }
    const { canonicalTarget, target } = resolvedTarget
    const allowed = new Set((rule.allowed_importers || rule.allowedImporters || []).map((item) => normalizeRelative(String(item))))
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), 'utf8')
      const specifier = extractRelativeModuleSpecifiers(text)
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
