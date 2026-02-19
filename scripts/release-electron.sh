#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "apps/electron/package.json" ]]; then
  echo "apps/electron/package.json not found"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash your changes first."
  exit 1
fi

INPUT_VERSION="${1:-}"

if [[ -z "$INPUT_VERSION" ]]; then
  NEXT_VERSION="$(node -e "const fs=require('fs');const p='apps/electron/package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));const [a,b,c]=j.version.split('.').map(Number);console.log([a,b,c+1].join('.'));" )"
else
  NEXT_VERSION="$INPUT_VERSION"
fi

if [[ ! "$NEXT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be in semver form: x.y.z"
  exit 1
fi

echo "Preparing Electron release v$NEXT_VERSION"

node -e "const fs=require('fs');const p='apps/electron/package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version=process.argv[1];fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');" "$NEXT_VERSION"

git add apps/electron/package.json
git commit -m "release(electron): v$NEXT_VERSION"
git tag "v$NEXT_VERSION"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git push origin "$CURRENT_BRANCH"
git push origin "v$NEXT_VERSION"

echo "Release tag pushed: v$NEXT_VERSION"
echo "GitHub Actions workflow '.github/workflows/release.yml' should now publish artifacts."