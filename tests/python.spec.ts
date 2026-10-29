// 0.3.1 / catalog 2026.10.10: Python projects get the same code-quality guarantees as JS ones.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { loadCatalog } from '../engine/src/catalog.ts'
import { checkPythonThresholds } from '../engine/src/quality.ts'
import { missingSignals } from '../engine/src/signals.ts'
import { REAL_CATALOG, makeRepo, profile } from './helpers.ts'

const real = loadCatalog(REAL_CATALOG)
const p = (partial = {}) => profile(real, { type: 'saas', signals: { has_python: true }, ...partial })

const pyproject = (opts: { complexity?: number; args?: number; statements?: number; select?: string } = {}) => `[project]
name = "x"

[tool.ruff.lint]
select = ${opts.select ?? '["E", "F", "C90", "PLR", "S"]'}

[tool.ruff.lint.mccabe]
max-complexity = ${opts.complexity ?? 10}

[tool.ruff.lint.pylint]
max-args = ${opts.args ?? 4}
max-statements = ${opts.statements ?? 50}
`

describe('Python code quality', () => {
  test('Ruff enforces the profile thresholds and the C90, PLR and S rule sets', () => {
    assert.equal(checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject() }), p()).ok, true)
    assert.equal(checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject({ complexity: 8, args: 3 }) }), p()).ok, true)
    assert.equal(checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject({ select: '["ALL"]' }) }), p()).ok, true)
  })

  test('a laxer threshold, a missing setting or a missing rule set fails and says which', () => {
    assert.match(checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject({ complexity: 15 }) }), p()).detail, /max-complexity 15 > 10/)
    assert.match(checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject({ args: 6 }) }), p()).detail, /max-args 6 > 4/)
    assert.match(checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject({ select: '["E", "F"]' }) }), p()).detail, /C90.*PLR.*S/)
    assert.match(checkPythonThresholds(makeRepo({ 'pyproject.toml': '[project]\nname = "x"\n' }), p()).detail, /falta max-complexity/)
    assert.match(checkPythonThresholds(makeRepo(), p()).detail, /falta pyproject\.toml/)
  })

  test('a relaxed profile threshold is respected', () => {
    assert.equal(checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject({ complexity: 15 }) }), p({ quality: { complexity: 15 } })).ok, true)
  })

  test('Python files longer than max_lines fail; virtual environments and caches are ignored', () => {
    const long = Array.from({ length: 301 }, (_, i) => `x${i} = ${i}`).join('\n')
    const r = checkPythonThresholds(makeRepo({ 'pyproject.toml': pyproject(), 'app/models.py': long }), p())
    assert.equal(r.ok, false)
    assert.match(r.detail, /app\/models\.py/)
    const ignored = { 'pyproject.toml': pyproject(), '.venv/lib/site.py': long, 'venv/x.py': long, '__pycache__/y.py': long }
    assert.equal(checkPythonThresholds(makeRepo(ignored), p()).ok, true)
  })

  test('has_python is detected from pyproject.toml, requirements or uv.lock', () => {
    for (const file of ['pyproject.toml', 'requirements.txt', 'requirements-dev.txt', 'uv.lock']) {
      const found = missingSignals(makeRepo({ [file]: '' }), profile(real, { type: 'saas' }), real)
      assert.ok(found.some(s => s.signal === 'has_python'), file)
    }
    assert.ok(!missingSignals(makeRepo({ 'package.json': '{}' }), profile(real, { type: 'saas' }), real).some(s => s.signal === 'has_python'))
  })

  test('every py-* item applies only to Python projects', () => {
    const py = real.items.filter(i => i.id.startsWith('py-'))
    assert.deepEqual(py.map(i => i.id).sort(), ['py-dead-code', 'py-deps-audit', 'py-lint-format', 'py-strict-types', 'py-tests'])
    for (const i of py) assert.deepEqual(i.when, { signals: { has_python: true } }, i.id)
  })
})
