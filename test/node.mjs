// npm test: the check in Node, reading test/data.zarr from disk.
import * as zarr from 'zarrita'
import { open, readFile } from 'node:fs/promises'
import { check } from './check.js'

const dir = new URL('./', import.meta.url)
const path = (key) => new URL('data.zarr' + key, dir)
const store = {
  async get(key) { try { return new Uint8Array(await readFile(path(key))) } catch { return undefined } },
  async getRange(key, r) {
    let f
    try { f = await open(path(key)) } catch { return undefined }
    try {
      const size = (await f.stat()).size
      const [off, len] = 'suffixLength' in r ? [size - r.suffixLength, r.suffixLength] : [r.offset, r.length]
      const buf = new Uint8Array(len)
      await f.read(buf, 0, len, off)
      return buf
    } finally { await f.close() }
  },
}
const file = async (name) => { const b = await readFile(new URL('expected/' + name, dir)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }
const { ok, lines } = await check(zarr, store, file)
console.log(lines.join('\n'))
process.exit(ok ? 0 : 1)
