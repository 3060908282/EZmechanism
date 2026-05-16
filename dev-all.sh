#!/bin/bash
# Start all services for MechFind
# Uses start-stop-daemon to properly detach processes
set +e

PROJECT_DIR="/home/z/my-project"

# ─── Start mechfind service (port 3002) ───
if ! pgrep -f "mechfind-service/index.ts" > /dev/null 2>&1; then
  start-stop-daemon --start --background \
    --make-pidfile --pidfile /tmp/mechfind-service.pid \
    --exec /bin/bash -- -c "cd $PROJECT_DIR/mini-services/mechfind-service && while true; do bun --hot index.ts 2>&1; sleep 3; done > /tmp/mechfind-service.log 2>&1"
  echo "[dev-all] MechFind service started on port 3002"
else
  echo "[dev-all] MechFind service already running"
fi

# ─── Start Next.js dev server (port 3000) ───
if ! pgrep -f "next dev" > /dev/null 2>&1; then
  # Clean .next cache if needed for fresh start
  # rm -rf $PROJECT_DIR/.next

  start-stop-daemon --start --background \
    --make-pidfile --pidfile /tmp/next-dev.pid \
    --exec /bin/bash -- -c "cd $PROJECT_DIR && node node_modules/.bin/next dev -p 3000 > /tmp/next-dev.log 2>&1"
  echo "[dev-all] Next.js dev server started on port 3000"
else
  echo "[dev-all] Next.js dev server already running"
fi
