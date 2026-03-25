#!/usr/bin/env bash
set -euo pipefail

filename="$(node -e 'const pkg = require("./package.json"); const filename = `${pkg.name.replace(/^@/, "").replace(/\//g, "-")}-${pkg.version}.tgz`; process.stdout.write(filename);')"
tarball_dir="$(mktemp -d /tmp/npm-pack.XXXXXX)"
tarball="${tarball_dir}/${filename}"

tar \
  --exclude='./node_modules' \
  --exclude='./coverage' \
  --exclude='./dist/go' \
  --exclude='./.git' \
  --transform='s#^\./#package/#' \
  -czf "${tarball}" \
  .

printf '%s\n' "${tarball}"
