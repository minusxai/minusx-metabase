#!/usr/bin/env bash
set -euo pipefail
[[ "$(go env GOVERSION)" == "go1.27.3" ]] || { echo "Go 1.27.3 required"; exit 1; }
export CGO_ENABLED=0 GOTOOLCHAIN=local
output=${1:?Output directory required}
mkdir -p "$output/0.28.2"
output=$(cd "$output" && pwd)
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
cd "$build_dir"
go mod init build-source
go mod download github.com/evanw/esbuild@v0.28.2
cp -R "$(go env GOPATH)/pkg/mod/github.com/evanw/esbuild@v0.28.2/." .
chmod -R u+w .
go mod edit -require=golang.org/x/sys@v0.44.0
go mod download golang.org/x/sys
go build -trimpath -ldflags='-s -w' -o "$output/0.28.2/esbuild" ./cmd/esbuild
test "$("$output/0.28.2/esbuild" --version)" = 0.28.2
go version -m "$output/0.28.2/esbuild"
