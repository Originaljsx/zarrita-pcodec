// pcodec ("numcodecs.pcodec") decoding for zarrita. See README.md.
//
//   registerPcodec(zarr)      once, before opening arrays
//
// A chunk is the flattened array in C order, as numcodecs writes it.
const TYPES = {
  int16: [1, Int16Array], int32: [2, Int32Array], int64: [3, BigInt64Array],
  uint16: [4, Uint16Array], uint32: [5, Uint32Array], uint64: [6, BigUint64Array],
  float32: [7, Float32Array], float64: [8, Float64Array],
  ...(typeof Float16Array !== 'undefined' ? { float16: [9, Float16Array] } : {}),
}
let wasm = null
function load(url) {
  wasm ??= (async () => {
    if (typeof process !== 'undefined' && process.versions?.node && url.protocol === 'file:') {
      const { readFile } = await import('node:fs/promises')
      return (await WebAssembly.instantiate(await readFile(url))).instance.exports
    }
    // (not instantiateStreaming: that needs the server to send application/wasm)
    return (await WebAssembly.instantiate(await (await fetch(url)).arrayBuffer())).instance.exports
  })()
  return wasm
}
// compressed bytes -> a typed array of dataType (its own copy)
export async function decodePcodec(bytes, dataType, wasmUrl = new URL('./pcodec.wasm', import.meta.url)) {
  const t = TYPES[dataType]
  if (!t) throw new Error(`pcodec: data type ${dataType} is not supported`)
  const w = await load(wasmUrl)
  const p = w.alloc(bytes.length)
  new Uint8Array(w.memory.buffer, p, bytes.length).set(bytes)
  const status = w.decode(p, bytes.length, t[0])
  w.free_in(p, bytes.length)
  if (status !== 0) throw new Error('pcodec: could not decode the chunk')
  const out = new Uint8Array(w.memory.buffer, w.out_ptr(), w.out_len()).slice()
  return new t[1](out.buffer)
}
const strides = (shape) => { const s = new Array(shape.length); let k = 1; for (let i = shape.length - 1; i >= 0; i--) { s[i] = k; k *= shape[i] } return s }
export function registerPcodec(zarr, wasmUrl) {
  const Codec = {
    fromConfig(_config, meta) {
      return {
        kind: 'array_to_bytes',
        async decode(bytes) {
          return { data: await decodePcodec(bytes, meta.dataType ?? meta.data_type, wasmUrl), shape: meta.shape, stride: strides(meta.shape) }
        },
        encode() { throw new Error('pcodec: encoding is not supported') },
      }
    },
  }
  zarr.registry.set('numcodecs.pcodec', () => Codec)
  zarr.registry.set('pcodec', () => Codec)
}
