#!/usr/bin/env bash
set -e

# ==============================================================================
# MedStock ERP — Standalone Store Server Automation Script
# Zero-Internet Local LAN Pharmacy Appliance Starter
# ==============================================================================

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
DATABASE_URL="${DATABASE_URL:-postgresql://mederp@localhost:5432/mederp}"

echo "======================================================================"
echo "  🏥 MedStock ERP — Commercial Store Server Initializer"
echo "  Offline-First Zero-Internet Counter Billing & Inventory Appliance"
echo "======================================================================"

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Error: Node.js is not installed. Please install Node.js (v18+) to run MedStock ERP."
    exit 1
fi
echo "✅ Node.js $(node -v) detected."

# 2. Check & ensure PostgreSQL is running
echo "🔍 Checking PostgreSQL database service..."
if ! command -v pg_isready >/dev/null 2>&1; then
    echo "ℹ️  pg_isready not in PATH; verifying connection via Node driver..."
else
    # Parse host and port from DATABASE_URL or default to localhost:5432
    PG_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
    PG_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
    [ -z "$PG_HOST" ] && PG_HOST="localhost"
    [ -z "$PG_PORT" ] && PG_PORT="5432"

    if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
        echo "⚠️  PostgreSQL is not responding on $PG_HOST:$PG_PORT. Attempting to start service..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null || true
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
        fi
        sleep 2
    fi
fi

# 3. Run Database Migrations
echo "🔄 Synchronizing database schema (Drizzle ORM)..."
npx drizzle-kit push --force 2>/dev/null || npx drizzle-kit push

# 4. Check & Seed Initial Dataset
npx tsx scripts/db-check-and-seed.ts

# 5. Detect Local LAN IP Addresses for Counter Devices
LAN_IPS=$(node -e "
const os = require('os');
const ifaces = os.networkInterfaces();
const ips = [];
for (const dev in ifaces) {
  for (const details of ifaces[dev]) {
    if (details.family === 'IPv4' && !details.internal) {
      ips.push(details.address);
    }
  }
}
console.log(ips.join(' '));
")

echo "======================================================================"
echo "  🚀 Store Server Ready for Counter Billing & Tablet Terminals"
echo "======================================================================"
echo "  • Primary Local Terminal:  http://localhost:${PORT}"
for ip in $LAN_IPS; do
    echo "  • Local LAN Counter IP:    http://${ip}:${PORT}"
done
echo ""
echo "  📲 To connect tablets or secondary cashiers:"
echo "     Open http://<LAN-IP>:${PORT}/settings/network to scan the on-screen QR Code"
echo "======================================================================"
echo "Starting MedStock ERP on ${HOST}:${PORT}..."

exec npx vite dev --host "${HOST}" --port "${PORT}"
