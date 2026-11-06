# MedStock ERP — Oracle Cloud Infrastructure (OCI) Deployment Guide

This guide covers setting up an **Always Free** cloud server on Oracle Cloud Infrastructure (OCI) running MedStock ERP using Docker Compose, Caddy (automated Let's Encrypt SSL), and PostgreSQL 15.

---

## 1. OCI Cloud Console Setup

### Step 1.1: Create an Always Free Compute Instance
1. In the OCI Console, navigate to **Compute → Instances → Create Instance**.
2. **Name:** `medstock-erp-server`
3. **Image and Shape:**
   * **Image:** `Canonical Ubuntu 24.04 LTS` (or `22.04 LTS`)
   * **Shape:** `Ampere VM.Standard.A1.Flex` (ARM64)
   * **OCPUs:** `2` (up to 4 free)
   * **Memory:** `12 GB` (up to 24 GB free)
4. **Networking:** Select your default VCN and public subnet.
5. **Add SSH Keys:** Generate a new key pair or upload your existing public key (`~/.ssh/id_rsa.pub` / `~/.ssh/id_ed25519.pub`).
6. **Boot Volume:** Set to `50 GB` or `100 GB` (OCI provides 200 GB total free block storage).
7. Click **Create** and wait for the state to turn green (`Running`).

### Step 1.2: Reserve a Static Public IP
1. Navigate to **Networking → IP Management → Reserved Public IPs**.
2. Click **Reserve Public IP Address** (Region: your home region).
3. Under **Assigned To**, select your newly created instance VNIC.
4. Note your static public IP address (e.g. `129.15x.xxx.xxx`).

### Step 1.3: Update OCI VCN Ingress Rules (Ports 80 & 443)
1. Go to **Networking → Virtual Cloud Networks → [Your VCN] → Security Lists**.
2. Click on the **Default Security List for [Your VCN]**.
3. Under **Ingress Rules**, click **Add Ingress Rules**:
   * **Rule 1 (HTTP):**
     * Source Type: `CIDR`
     * Source CIDR: `0.0.0.0/0`
     * IP Protocol: `TCP`
     * Destination Port Range: `80`
     * Description: `Allow HTTP for Let's Encrypt ACME challenges`
   * **Rule 2 (HTTPS):**
     * Source Type: `CIDR`
     * Source CIDR: `0.0.0.0/0`
     * IP Protocol: `TCP`
     * Destination Port Range: `443`
     * Description: `Allow HTTPS secure web traffic`
4. Click **Add Ingress Rules**.

---

## 2. DNS Configuration

1. In your domain registrar or DNS manager (Cloudflare, Namecheap, DuckDNS, etc.):
2. Add an **A Record**:
   * **Name:** `erp` (or `@` for root domain)
   * **Target IPv4:** Your OCI Reserved Public IP
   * **TTL:** `Auto` or `300` seconds

---

## 3. Server Initialization & Hardening (SSH into VM)

Connect to your instance:
```bash
ssh -i /path/to/private_key ubuntu@<YOUR_OCI_PUBLIC_IP>
```

### Step 3.1: Unblock Host OS Firewall (Crucial OCI Step)
Ubuntu on OCI has strict default `iptables` that block ports 80 and 443 even if the VCN allows them. Run:

```bash
# Allow HTTP and HTTPS in iptables
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Persist rules across reboots
sudo apt-get update
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### Step 3.2: Install Docker & Docker Compose
```bash
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```
*(Log out and log back in to activate group permissions: `exit` then reconnect).*

---

## 4. Deploying MedStock ERP

### Step 4.1: Clone Repository and Setup Directory
```bash
sudo mkdir -p /opt/medstock
sudo chown -R ubuntu:ubuntu /opt/medstock
cd /opt/medstock

# Clone repository
git clone https://github.com/your-repo/build-medical.git .
```

### Step 4.2: Configure Environment Variables
```bash
cp .env.production.example .env
nano .env
```
Ensure you update:
* `APP_DOMAIN`: `erp.yourdomain.com`
* `ORIGIN`: `https://erp.yourdomain.com`
* `ACME_EMAIL`: `your-email@example.com`
* `POSTGRES_PASSWORD`: Use a strong random password

### Step 4.3: Launch Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify all 3 services are up and healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

### Step 4.4: Initialize Database Schema
Run the Drizzle schema sync inside the app container:
```bash
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/db-check-and-seed.ts
```

---

## 5. First-Time Registration & Verification

1. Open your browser and navigate to:
   `https://erp.yourdomain.com/register`
2. Confirm the **HTTPS padlock icon** is active.
3. Fill out the registration form to create the initial **Store Owner** (`owner_admin`) account.
4. Log into the dashboard and verify:
   * Inventory & POS billing pages load instantly.
   * Session cookie is marked `Secure`, `HttpOnly`, and `SameSite=lax`.

---

## 6. Automated Maintenance & Backups

### Step 6.1: Automated Daily Database Snapshots
Open host crontab:
```bash
crontab -e
```
Add a nightly job to trigger compressed database dumps at 02:00 AM:
```cron
0 2 * * * cd /opt/medstock && docker compose -f docker-compose.prod.yml exec -T app npm run backup >> /var/log/medstock-backup.log 2>&1
```

All snapshots are stored in `/opt/medstock/backups/` with rolling 30-day retention.

### Step 6.2: Restoring a Backup (If Ever Needed)
To restore a snapshot:
```bash
docker compose -f docker-compose.prod.yml exec -it app npm run restore
```

### Step 6.3: Updating to a Newer Version
When updating code in the future:
```bash
cd /opt/medstock
git pull
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push
```
