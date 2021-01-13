{ pkgs }:
let
  script = pkgs.writeShellScriptBin "iamp2p-test"
  ''
  set -euxo pipefail
  iamp2p-package
  cd test
  npm run test
  '';
in
{
 buildInputs = [ script ];
}
