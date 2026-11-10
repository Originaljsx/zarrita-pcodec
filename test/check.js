// Shared by the Node and browser tests: read every test array with zarrita +
// the plug-in and compare with the values zarr-python read (test/expected).
import { registerPcodec } from '../pcodec.js'

const CT = { int16: Int16Array, uint16: Uint16Array, int32: Int32Array, uint32: Uint32Array,
             int64: BigInt64Array, uint64: BigUint64Array, float32: Float32Array, float64: Float64Array,
             ...(typeof Float16Array !== 'undefined' ? { float16: Float16Array } : {}) }

// store: a zarrita store over test/data.zarr; readFile(name) -> ArrayBuffer of test/expected/<name>
export async function check(zarr, store, readFile) {
  registerPcodec(zarr)
  const expected = JSON.parse(new TextDecoder().decode(await readFile('arrays.json')))
  const lines = []
  let ok = true
  for (const [name, e] of Object.entries(expected)) {
    if (!CT[e.dtype]) { lines.push(`${name.padEnd(22)} skipped: no ${e.dtype} arrays in this JavaScript engine`); continue }
    const a = await zarr.open.v3(zarr.root(store).resolve(name), { kind: 'array' })
    const got = await zarr.get(a)
    const want = new CT[e.dtype](await readFile(`${name}.bin`))
    let diff = got.data.length === want.length ? 0 : -1
    for (let i = 0; diff >= 0 && i < want.length; i++) {
      const g = got.data[i], w = want[i]
      if (!(g === w || (g !== g && w !== w))) diff++            // NaN equals NaN here
    }
    const good = diff === 0 && String(got.shape) === String(e.shape)
    ok &&= good
    lines.push(`${name.padEnd(22)} ${String(want.length).padStart(5)} values, ${diff} differ  ${good ? 'OK' : 'FAIL'}`)
  }
  // part of one inner chunk
  const a = await zarr.open.v3(zarr.root(store).resolve('sharded_int32'), { kind: 'array' })
  const part = await zarr.get(a, [1, zarr.slice(40, 50), null])
  const good = String(part.shape) === '10,48'
  ok &&= good
  lines.push(`partial read            shape ${part.shape}  ${good ? 'OK' : 'FAIL'}`)
  lines.push(ok ? 'ALL OK' : 'SOME FAILED')
  return { ok, lines }
}
