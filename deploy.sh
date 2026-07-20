#!/usr/bin/env bash
#
# Deploy the Hakidd admin-panel (Next.js) on the EC2 box.
#
# Run automatically by .github/workflows/ci-cd.yml, or manually on the server:
#   cd /var/www/html/hakiddAdmin && bash deploy.sh
#
# Override defaults with env vars, e.g.:
#   APP_DIR=/var/www/html/hakiddAdmin PM2_APP=hakidd-admin bash deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/html/hakiddAdmin}"
PM2_APP="${PM2_APP:-hakidd-admin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-dev}"

echo "==> Admin-panel deploy: origin/${DEPLOY_BRANCH} -> ${APP_DIR} (pm2: ${PM2_APP})"
cd "$APP_DIR"

git fetch origin "$DEPLOY_BRANCH"
git reset --hard "origin/${DEPLOY_BRANCH}"
git clean -fd   # leaves .gitignored .env / node_modules intact

npm ci
npm run build   # next build

# Assumes the pm2 process already exists. First-time setup on a fresh box:
#   pm2 start npm --name "$PM2_APP" -- run start   (next start)
pm2 restart "$PM2_APP" --update-env

echo "==> Admin-panel deploy complete."
