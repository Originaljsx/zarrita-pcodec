# Rebuilds pcodec.wasm with a pinned Rust:
#   docker build -t zarrita-pcodec-build .
#   docker run --rm -v "$PWD":/work zarrita-pcodec-build
FROM rust:1.99.1-slim
RUN rustup target add wasm32-unknown-unknown
WORKDIR /work
CMD ["./build.sh"]
