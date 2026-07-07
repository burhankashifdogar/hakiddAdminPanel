#!/usr/bin/env bash
#
# ONE-TIME server setup for the Hakidd admin-panel (Next.js) on a fresh EC2 box.
# Creates the pm2 process that deploy.sh / the GitHub Action later just restart.
#
# Run once as the deploy user (needs sudo for the /var/www dir):
#   bash server-setup.sh
# Override defaults with env vars if needed:
#   APP_DIR=/var/www/html/hakiddAdmin PM2_APP=hakidd-admin bash server-setup.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/html/hakiddAdmin}"
REPO_URL="${REPO_URL:-git@github.com:burhankashifdogar/hakiddAdminPanel.git}"
PM2_APP="${PM2_APP:-hakidd-admin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-dev}"

# 1. Clone the repo if this box doesn't have it yet (idempotent).
if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> Cloning $REPO_URL into $APP_DIR"
  sudo mkdir -p "$APP_DIR"
  sudo chown -R "$USER":"$USER" "$APP_DIR"
  git clone -b "$DEPLOY_BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# 2. Seed .env from the example if missing — set real NEXT_PUBLIC_* / server values,
#    then re-run this script.
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "!! Created .env from .env.example. Fill in real values, then re-run this script."
  exit 1
fi

# 3. Install and build.
npm ci
npm run build   # next build

# 4. Create (or restart) the pm2 process (next start, default port 3000).
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP" --update-env
else
  pm2 start npm --name "$PM2_APP" -- run start
fi
pm2 save

echo "==> Admin-panel setup complete (next start on port 3000 — front it with nginx)."
echo "    Run 'pm2 startup' once (follow its printed sudo command) to survive reboots."
echo "    Future deploys are automatic on push to dev."
