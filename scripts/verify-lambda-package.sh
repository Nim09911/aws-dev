#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
default_output="$repo_root/artifacts/lambda-api.zip"
relative_output="artifacts/lambda-api-relative-test.zip"
tmp="$(mktemp -d)"
had_default=0

if [[ -f "$default_output" ]]; then
  cp "$default_output" "$tmp/original-default.zip"
  had_default=1
fi

cleanup() {
  rm -f "$repo_root/$relative_output"
  if ((had_default)); then
    cp "$tmp/original-default.zip" "$default_output"
  else
    rm -f "$default_output"
  fi
  rm -rf "$tmp"
}
trap cleanup EXIT

cd "$repo_root"

./scripts/package-lambda.sh
cp "$default_output" "$tmp/default-first.zip"
./scripts/package-lambda.sh
cmp -s "$tmp/default-first.zip" "$default_output"

./scripts/package-lambda.sh "$relative_output"
cp "$repo_root/$relative_output" "$tmp/relative-first.zip"
./scripts/package-lambda.sh "$relative_output"
cmp -s "$tmp/relative-first.zip" "$repo_root/$relative_output"
cmp -s "$tmp/default-first.zip" "$tmp/relative-first.zip"

code_sha256="$(
  openssl dgst -sha256 -binary "$tmp/default-first.zip" | openssl base64 -A
)"
echo "Lambda package verification passed: default and relative outputs are byte-identical."
echo "AWS CodeSha256: $code_sha256"
