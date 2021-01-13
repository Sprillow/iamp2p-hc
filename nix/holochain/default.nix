{ pkgs }:
let
  iamp2p-hc = pkgs.writeShellScriptBin "iamp2p-hc"
  ''
  set -euxo pipefail
  iamp2p-package
  npm run start
  '';

  iamp2p-fmt = pkgs.writeShellScriptBin "iamp2p-fmt"
  ''
  set -euxo pipefail
  cargo fmt
  '';

  iamp2p-package = pkgs.writeShellScriptBin "iamp2p-package"
  ''
  set -euxo pipefail
  cargo build --release --target wasm32-unknown-unknown
  cd dnas/profiles && dna-util -c profiles.dna.workdir
  cd ../..
  cd dnas/projects && dna-util -c projects.dna.workdir
  '';
in
{
 buildInputs = [ iamp2p-hc iamp2p-fmt iamp2p-package];
}
