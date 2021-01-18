#!/bin/bash

cargo build --release --target wasm32-unknown-unknown
cd dnas/projects && dna-util -c projects.dna.workdir