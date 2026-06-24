# Deploying MorsarDash to your VPS (dash.morsar.com)

> ⚠️ This VPS also runs your live WordPress (morsar.link). Work carefully and don't
> touch the existing nginx site for morsar.link. Run these **yourself** over SSH.
> First: **change the root password** you shared, and ideally create a non-root deploy user.

## 0. DNS
Point `dash.morsar.com` (A record) → `75.119.136.96`. (You said the subdomain exists —
make sure it resolves to this server.)

## 1. One-time server setup (SSH in)

```bash
ssh root@75.119.136.96   # then immediately: passwd  (set a new password)

# Node 20 LTS + tools
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx
npm i -g pm2

# Get the code
mkdir -p /var/www && cd /var/www
git clone https://github.com/foxdisert/dash.git morsardash
cd morsardash
npm ci
```

## 2. Configure secrets on the server

Create `/var/www/morsardash/.env` (NOT in git). Generate fresh secrets:

```bash
cd /var/www/morsardash
cat > .env <<EOF
DATABASE_PATH=/var/www/morsardash/data/morsardash.db
APP_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
ADMIN_PASSWORD=PUT-A-STRONG-PASSWORD-HERE
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
ORDERS_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
NOTIFY_DAYS=2
EOF
chmod 600 .env
```

(SMTP/Telegram you can fill in later via the dashboard Settings page.)

## 3. Build, migrate, seed, start

```bash
npm run db:migrate
npm run seed          # creates admin / ADMIN_PASSWORD
npm run build
pm2 start "npm run start" --name morsardash   # runs on port 3000
pm2 save && pm2 startup     # follow the printed command so it survives reboots
```

## 4. nginx reverse proxy for dash.morsar.com

```bash
cat > /etc/nginx/sites-available/dash.morsar.com <<'EOF'
server {
    listen 80;
    server_name dash.morsar.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
ln -s /etc/nginx/sites-available/dash.morsar.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 5. Free HTTPS (Let's Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d dash.morsar.com   # follow prompts; auto-renews
```

Now open **https://dash.morsar.com** and log in as `admin` with `ADMIN_PASSWORD`.

## 6. Daily expiry cron (Telegram + auto reminder emails)

```bash
crontab -e
# add (use the ORDERS/CRON secret from your .env):
0 9 * * *  curl -fsS "https://dash.morsar.com/api/cron/check-expiring?key=YOUR_CRON_SECRET" >/dev/null
```

## 7. Auto-deploy on every push (optional but recommended)

The repo has `.github/workflows/deploy.yml`. To enable "edit locally → push → live":

1. On the server, create an SSH key for deploys and authorize it:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
   cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/deploy_key            # copy this PRIVATE key
   ```
2. In GitHub repo → **Settings → Secrets and variables → Actions**, add:
   `VPS_HOST=75.119.136.96`, `VPS_USER=root` (or your deploy user),
   `VPS_SSH_KEY=` (the private key from above), `VPS_APP_DIR=/var/www/morsardash`.
3. Push to `main` → GitHub Actions SSHes in, pulls, builds, migrates, and restarts PM2.

## Updating manually (if not using auto-deploy)

```bash
cd /var/www/morsardash && git pull origin main && npm ci && npm run db:migrate && npm run build && pm2 restart morsardash
```

## Connect WordPress (morsar.link) orders
Once HTTPS is live, use `https://dash.morsar.com` as the `$DASHBOARD_URL` and your
`ORDERS_WEBHOOK_SECRET` in the Forminator snippet (see README → "Website orders").
