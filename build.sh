#!/bin/sh
# Rebuilds pcodec.wasm from rust/. Needs Rust (rustup) with the wasm target:
#   rustup target add wasm32-unknown-unknown
set -e
cd "$(dirname "$0")/rust"
cargo build --release --locked --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/pco_decode.wasm ../pcodec.wasm
ls -l ../pcodec.wasm
