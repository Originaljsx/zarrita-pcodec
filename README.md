# zarrita-pcodec

A [pcodec](https://github.com/pcodec/pcodec) decoder for
[zarrita](https://github.com/manzt/zarrita.js). zarrita cannot open arrays
compressed with `numcodecs.pcodec`; with this it can, in the browser and in
Node. Decode only.

The decoder is the `pco` Rust crate compiled to WebAssembly (193 KB).

## Use

```js
import * as zarr from 'zarrita'
import { registerPcodec } from './pcodec.js'

registerPcodec(zarr)          // once, before opening arrays

const arr = await zarr.open.v3(zarr.root(store).resolve('ssha'), { kind: 'array' })
const part = await zarr.get(arr, [0, zarr.slice(0, 512), null])
```

Keep `pcodec.js` and `pcodec.wasm` in the same folder, or pass the wasm file's
URL: `registerPcodec(zarr, url)`.

`decodePcodec(bytes, dataType)` decodes one chunk without zarrita.

## Supported

- Zarr v3 arrays written by zarr-python with `zarr.codecs.numcodecs.PCodec`
  as the serializer, with or without sharding.
- int16, int32, int64, uint16, uint32, uint64, float32, float64. float16 where
  the JavaScript engine has `Float16Array` (current Chrome; not Node 22).
  pcodec has no 8-bit types.

Not supported: writing. Not tried: pcodec as a Zarr v2 compressor.

## Tests

```bash
npm install
npm test
```

`test/data.zarr` has 11 small arrays written by zarr-python 3.4.2 with pcodec
1.1.0 (`test/make_test_data.py`): each data type with sharding, one array
without shards, one with a chunk that was never written. The test reads them
with zarrita 0.7.5 and compares every value with what zarr-python read
(`test/expected/`).

For the browser, serve the repository root with a server that handles HTTP
Range requests (`python -m http.server` does not) and open
`/test/browser.html`.

Passing on Node 22.23 (float16 skipped) and Chrome 151.

## Rebuilding pcodec.wasm

```bash
rustup target add wasm32-unknown-unknown
./build.sh
```

Built with Rust 1.99.1 and `pco` 1.1.0; `rust/Cargo.lock` pins the crates.
`rust/src/lib.rs` wraps `pco::standalone::simple_decompress` behind a plain C
interface, so there is no bindings generator.

## Licence

Apache-2.0, as is `pco`.
