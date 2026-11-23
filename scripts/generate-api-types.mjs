import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const services = [
  ['hotels', 'HOTELS_OPENAPI_URL'],
  ['bookings', 'BOOKINGS_OPENAPI_URL'],
  ['payments', 'PAYMENTS_OPENAPI_URL'],
]
const openapiTypescript = resolve(root, 'node_modules/.bin/openapi-typescript')
const isCheck = process.argv.includes('--check')
let generated = 0

for (const [service, environmentKey] of services) {
  const schema = process.env[environmentKey]
  if (!schema) continue

  const output = resolve(root, 'lib/modules', service, 'generated', 'openapi.ts')
  mkdirSync(dirname(output), { recursive: true })

  if (!existsSync(openapiTypescript)) {
    console.error('OpenAPI schema is configured, but openapi-typescript is not installed.')
    process.exitCode = 1
    continue
  }

  const result = spawnSync(openapiTypescript, [schema, '-o', output], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout)
    process.exitCode = result.status || 1
    continue
  }

  generated += 1
}

if (generated === 0 && !services.some(([, key]) => process.env[key])) {
  console.log('No OpenAPI URLs configured; skipping generated client check.')
}

if (isCheck && generated > 0) {
  const gitCheck = spawnSync('git', ['diff', '--exit-code', '--', 'lib/modules'], {
    cwd: root,
    encoding: 'utf8',
  })
  if (gitCheck.status !== 0) {
    console.error('OpenAPI generated files differ from the committed output. Run npm run api:generate and commit the result.')
    process.exitCode = 1
  }
} else if (!isCheck && generated > 0) {
  console.log(`Generated OpenAPI types for ${generated} service(s).`)
}
