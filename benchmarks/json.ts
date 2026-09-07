/*
 * @adonisjs/bodyparser
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { IncomingMessage } from 'node:http'
import { Socket } from 'node:net'
import { performance } from 'node:perf_hooks'
import { parseJSON, prepareJSONParserOptions } from '../src/parsers/json.ts'

const options = prepareJSONParserOptions({
  trimWhitespaces: true,
  convertEmptyStringsToNull: true,
  limit: '2mb',
})

function request(payload: Buffer) {
  const req = new IncomingMessage(new Socket())
  req.headers = { 'content-length': String(payload.length) }
  req.push(payload)
  req.push(null)
  return req
}

function createPayload(count: number) {
  return Buffer.from(
    JSON.stringify({
      users: Array.from({ length: count }, (_, id) => ({
        id,
        username: ` user_${id} `,
        email: ` user_${id}@example.com `,
        bio: '',
        active: id % 2 === 0,
        scores: [10, 20, null, ' 30 '],
        profile: { city: ' Lausanne ', tags: [' typescript ', '', ' node '] },
      })),
    })
  )
}

async function measure(payload: Buffer, count: number) {
  const start = performance.now()
  for (let index = 0; index < count; index++) {
    await parseJSON(request(payload), options)
  }
  return ((performance.now() - start) * 1000) / count
}

console.log(`Node ${process.version}, ${process.platform}/${process.arch}`)
console.log('25 samples, 20 parses/sample, 100 warmup parses/payload. Times in µs/parse.')

for (const count of [400, 5400]) {
  const payload = createPayload(count)
  await measure(payload, 100)

  const samples: number[] = []
  for (let sample = 0; sample < 25; sample++) {
    samples.push(await measure(payload, 20))
  }

  samples.sort((a, b) => a - b)
  console.table([
    {
      bytes: payload.length,
      min: Math.round(samples[0]),
      median: Math.round(samples[Math.floor(samples.length / 2)]),
      max: Math.round(samples[samples.length - 1]),
    },
  ])
}
