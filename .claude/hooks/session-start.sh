#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies
npm install

# Build the production bundle (dist/ is gitignored, must be built each session)
npm run build

# Start the production server in the background
NODE_ENV=production nohup node dist/server.cjs >> /tmp/henceflow-server.log 2>&1 &
echo "HenceFlow server started (PID $!)"
