# zarrita-pcodec

Reads Zarr arrays compressed with [pcodec](https://github.com/pcodec/pcodec)
(`numcodecs.pcodec`) in [zarrita](https://github.com/manzt/zarrita.js), in the
browser and in Node.

zarrita has no pcodec codec, so it cannot open such arrays. This adds one. The
decoder is the `pco` Rust crate compiled to WebAssembly (193 KB), with about 55
lines of JavaScript that register it with zarrita.

Status: a side test. Decode only.

## Use

```js
import * as zarr from 'zarrita'
import { registerPcodec } from './pcodec.js'

registerPcodec(zarr)          // once, before opening arrays

const arr = await zarr.open.v3(zarr.root(store).resolve('ssha'), { kind: 'array' })
const chunk = await zarr.get(arr, [0, zarr.slice(0, 512), null])
```

`pcodec.js` and `pcodec.wasm` must sit in the same folder. To load the wasm
file from somewhere else, pass its URL: `registerPcodec(zarr, url)`.

`decodePcodec(bytes, dataType)` decodes one compressed chunk without zarrita.

## What it handles

- Arrays written by zarr-python with `zarr.codecs.numcodecs.PCodec` as the
  serializer, with or without sharding. In the array metadata the codec is
  named `numcodecs.pcodec`.
- Data types: int16, int32, int64, uint16, uint32, uint64, float32, float64,
  and float16 where the JavaScript engine has `Float16Array` (Node 22 does
  not; current Chrome does). pcodec itself has no 8-bit types.
- Not handled: writing, and pcodec used as a Zarr v2 compressor (not tried).

## Tests

`test/data.zarr` holds 11 small made-up arrays written by zarr-python 3.4.2
with pcodec 1.1.0 (`test/make_test_data.py`): every data type with sharding,
one array without shards, and one with a chunk that was never written.
`test/expected/` holds the values zarr-python reads back. The tests read each
array with zarrita 0.7.5 and this codec and require every value to be equal.

```bash
npm install
npm test                      # Node
```

Browser: serve the repository root with a server that supports HTTP Range
requests (sharded arrays need them; `python -m http.server` does not) and open
`/test/browser.html`.

Results on 2026-11-09: Node 22.23 and headless Chrome 151, all arrays equal
(float16 skipped in Node). The same code was also checked against real chunks
of a sharded pcodec store (SWOT sea surface height, int32, float32 and
float64, about 3.4 million values, all equal); that data is not in this
repository.

## Rebuild the WebAssembly file

`pcodec.wasm` is committed. To rebuild it from `rust/`:

```bash
rustup target add wasm32-unknown-unknown
./build.sh
```

Built here with Rust 1.99.1 and `pco` 1.1.0 (`rust/Cargo.lock` pins every
crate). The `Dockerfile` does the same in a `rust:1.99.1-slim` image; it has
not been run yet.

`rust/src/lib.rs` is a thin wrapper around `pco::standalone::simple_decompress`
with a plain C interface (`alloc`, `decode`, `out_ptr`, `out_len`, `free_in`),
so no bindings generator is needed.

## Licence

Apache-2.0. The `pco` crate is also Apache-2.0.
