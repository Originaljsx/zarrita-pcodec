"""Writes test/data.zarr and test/expected/: small made-up arrays compressed
with pcodec by zarr-python, and the values the JavaScript side must get back.

    pip install zarr==3.4.2 numcodecs==0.17.1 pcodec==1.1.0 numpy==2.5.4
    python test/make_test_data.py

The result is committed, so `npm test` needs no Python.
"""
import json
import os
import shutil

import numpy as np
import zarr
from zarr.codecs.numcodecs import PCodec

HERE = os.path.dirname(os.path.abspath(__file__))
TYPES = ("int16", "uint16", "int32", "uint32", "int64", "uint64", "float16", "float32", "float64")
rng = np.random.default_rng(0)
y, x = np.mgrid[0:64, 0:48]
field = np.stack([np.sin(x / 9) * np.cos(y / 7), np.cos(x / 5) + y / 40]) + rng.normal(0, 0.01, (2, 64, 48))

shutil.rmtree(f"{HERE}/data.zarr", ignore_errors=True)
shutil.rmtree(f"{HERE}/expected", ignore_errors=True)
os.makedirs(f"{HERE}/expected")
root = zarr.open_group(f"{HERE}/data.zarr", mode="w")
expected = {}


def add(name, values, **kw):
    a = root.create_array(name, shape=values.shape, dtype=values.dtype, serializer=PCodec(level=8),
                          compressors=None, **kw)
    a[:] = values
    got = a[:]                                    # what zarr-python reads back
    got.tofile(f"{HERE}/expected/{name}.bin")
    expected[name] = {"dtype": str(got.dtype), "shape": list(got.shape)}


for t in TYPES:
    dt = np.dtype(t)
    if dt.kind == "f":
        v = field.astype(dt)
        v[0, 5:9, 10:20] = np.nan
        fill = np.nan
    else:
        lo = 0 if dt.kind == "u" else -20000
        v = np.rint(field * 10000 + (30000 if dt.kind == "u" else 0)).clip(lo, 60000 if dt.kind == "u" else 30000).astype(dt)
        fill = int(np.iinfo(dt).max)
        v[0, 5:9, 10:20] = fill
    # one shard per first-axis step, four inner chunks each, as a sharded store has them
    add(f"sharded_{t}", v, chunks=(1, 32, 24), shards=(1, 64, 48), fill_value=fill)
# pcodec with no shards, and a chunk that is never written (all fill)
add("plain_float32", field.astype("float32"), chunks=(1, 32, 48), fill_value=np.nan)
v = np.full((2, 64, 48), -1, "int32")
v[1] = np.rint(field[1] * 10000)
add("missing_chunk_int32", v, chunks=(1, 64, 48), fill_value=-1)
json.dump(expected, open(f"{HERE}/expected/arrays.json", "w"), indent=1)
print(len(expected), "arrays written")
