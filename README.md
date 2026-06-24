# 📺 MorsarDash — IPTV Reseller Admin

A bold, comic/Gumroad-style admin dashboard to run your IPTV reselling business:
see your **credits**, manage **clients**, browse **bouquets**, and connect
**multiple providers**.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, SQLite (Drizzle ORM).

---

## Why it keeps its own client database

The provider API (TVPlus Panel / Dino) has **no endpoint to list all your
clients** — it can only look up one line at a time (`device_info`). So MorsarDash
stores every line you **create** or **import** in its own SQLite database and
refreshes each one's live status (expiry, enabled) via `device_info`. This is also
what makes multi-provider support clean: each client row records its provider.

What the provider API gives us, and how the dashboard uses it:

| API action      | Used for                                            |
| --------------- | --------------------------------------------------- |
| `reseller_info` | Credits balance + username (dashboard, test conn.)  |
| `bouquet`       | Package list (Bouquets page, package picker)        |
| `device_info`   | Sync one client's expiry/status (free)              |
| `new`           | Create a new line (**spends credits**)              |
| `renew`         | Renew a line (**spends credits**)                   |

---

## Features

- **Overview** — total credits, credits per provider, client counts, expiring-soon, recent activity.
- **Clients** — search/filter, status badges, per-line **Sync** / **Renew** / **Delete**, **Sync all** (throttled).
- **New line** — create M3U / MAG / protocol lines with a bouquet picker (spends credits).
- **Import existing** — add lines you already sold without spending credits.
- **Bouquets** — browse + refresh each provider's package list (cached).
- **Providers** — add/edit/test/delete providers. Add as many as you like.
- **Notifications** — 🔔 in-app bell with a red badge counting lines expiring within `NOTIFY_DAYS` (default 2), with quick Sync / Renew; plus an optional **Telegram** daily alert.
- **Messages** — editable email/WhatsApp templates (renewal reminder, welcome, install, trial, payment) with `{{variables}}` that auto-fill per client. Send by **email (SMTP)**, open **WhatsApp** pre-filled (wa.me), or **copy**. The renewal reminder also **auto-emails** via the daily cron.
- **Orders** — paid orders from your WordPress/Forminator + PayPal form land in **🛒 Orders** via a webhook; review and **1-click convert** to a client (pre-filled).
- **Team / roles** — invite staff as **agents** with limited access (see/contact/add clients only). You stay **admin** with full access. Manage members under **🧑‍🤝‍🧑 Team**.
- **Security** — role-based login (bcrypt + JWT cookie); provider API keys **encrypted at rest** (AES-256-GCM).

---

## Setup (local)

```bash
npm install
cp .env.example .env        # then fill in the secrets (see below)
npm run db:migrate          # create the SQLite schema
npm run seed                # create the admin account from ADMIN_PASSWORD
npm run dev                 # http://localhost:3000
```

Log in with username `admin` and the password you set in `ADMIN_PASSWORD`.
Then go to **Providers → Add a provider**, paste your Dino API key
(base URL defaults to `https://tvpluspanel.ru`), hit **Test connection**, and save.

### Environment variables (`.env`)

| Variable             | What it is                                                        |
| -------------------- | ----------------------------------------------------------------- |
| `DATABASE_PATH`      | Path to the SQLite file (default `./data/morsardash.db`)          |
| `APP_ENCRYPTION_KEY` | 32-byte key (base64/hex) encrypting provider API keys at rest     |
| `SESSION_SECRET`     | Secret signing the admin session JWT                              |
| `ADMIN_PASSWORD`     | Initial admin password (used once by `npm run seed`)              |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # APP_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # SESSION_SECRET
```

> ⚠️ If you change `APP_ENCRYPTION_KEY` later, previously saved provider keys can
> no longer be decrypted — you'll need to re-enter them.

---

## Adding another provider (developer note)

The provider layer is interface-driven, so a new panel only needs **one file + one
registry line**:

1. Create `lib/providers/<kind>.ts` exporting a `*_META` (`ProviderKindMeta`) and a
   class implementing `IptvProvider` (see `lib/providers/tvpluspanel.ts`).
2. Register it in `lib/providers/registry.ts`.

The "Add provider" UI, subscription options, and supported line types are all
generated from the metadata — no UI changes needed.

---

## Expiry notifications

A line is flagged when it has **`NOTIFY_DAYS` (default 2) days or fewer** left
(already-expired lines are included). Two delivery paths:

- **In-app bell** — always on. The 🔔 in the sidebar shows a red count and lists the
  lines with one-tap **Sync** (free) and **Renew 1mo** (spends credits). It
  recomputes on every page load — no setup needed.
- **Telegram** — a daily message to your phone.

### Set up Telegram (in the dashboard)

Go to **⚙️ Settings → Telegram alerts** and fill in:

1. **Bot token** — from **@BotFather** (`/newbot`). Stored **encrypted** in the database.
2. **Chat ID** — text your bot once, then message **@userinfobot**, or open
   `https://api.telegram.org/bot<token>/getUpdates` and read `chat.id`.
3. **Alert when days left ≤** — the threshold for both the bell and Telegram (default 2).

Hit **Save**, then **Send test message** to confirm it works. Finally set a
`CRON_SECRET` in `.env` (it protects the cron endpoint below).

> You can also set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `NOTIFY_DAYS` in
> `.env` — Settings values take precedence, env is the fallback.

### Schedule the daily check (system cron)

The endpoint `GET /api/cron/check-expiring` computes the expiring set and sends the
Telegram alert. It requires the secret via `?key=` or an `Authorization: Bearer` header.

Test it manually:

```bash
curl "http://localhost:3000/api/cron/check-expiring?key=$CRON_SECRET"
# -> { ok: true, expiringCount: N, telegram: {...}, items: [...] }
```

Add to the VPS crontab (`crontab -e`) — runs daily at 09:00:

```cron
0 9 * * *  curl -fsS "https://your-domain.com/api/cron/check-expiring?key=YOUR_CRON_SECRET" >/dev/null
```

> The check is a stateless daily digest — it reports whatever is expiring at run
> time. For accurate dates, keep client expiry fresh with **Sync all** (or add a
> second cron that hits a sync route).

## Client messaging (templates + email + WhatsApp)

Turn your manual WhatsApp/email messages into reusable, auto-personalized templates.

1. **Settings → Email (SMTP)** — fill in your provider (pre-filled for **Brevo**:
   `smtp-relay.brevo.com`, port 587). Username = Brevo login email, password = your
   Brevo **SMTP key**, "from" = a **verified sender/domain**. Hit **Send test email**.
2. **Settings → Business details** — set business name, WhatsApp number, installation
   URL, downloader code, and payment details. These fill the `{{variables}}`.
3. **Messages** — edit any of the 5 templates; the preview shows them filled with a
   sample client. Variables: `name, username, expiry_date, days_left, expiry_phrase,
   plan, business_name, from_name, whatsapp_number, installation_url, downloader_code,
   payment_details`.
4. **From a client card → ✉️ Message** — pick a template, see the personalized preview,
   then **Send email** (needs the client's email + SMTP), open **WhatsApp** (pre-filled
   via wa.me, needs the client's phone), or **Copy**.

**Auto renewal reminder:** the daily cron (`/api/cron/check-expiring`) emails the
`expiry_reminder` template to clients with an email who are within `NOTIFY_DAYS` of
expiry — **once per cycle** (deduped via `clients.last_reminder_at`, resets when they
renew). The Telegram digest still fires alongside it.

> For inbox deliverability, use a real sending domain with **SPF + DKIM** configured in
> Brevo (or your provider). Avoid sending "from" a free Gmail/Yahoo address.

## Team members & roles

Two roles, managed under **🧑‍🤝‍🧑 Team** (admin only):

- **Admin** (you) — full access: credits, providers, settings, messages editor, billing
  actions (create/renew/delete), and team management.
- **Agent** (staff) — can **see** clients, **contact** them (email / WhatsApp / copy),
  **add/import** existing clients, **edit** contact details, and **sync** status. They
  **cannot** see credits or panel details, create/renew/delete lines, or open
  Providers / Bouquets / Settings / Messages / Team.

Create agents under **Team → Add a team member** (username + password). Enforcement is
server-side on every sensitive action (not just hidden buttons), with middleware blocking
admin-only URLs. Safety guards prevent deleting yourself or the last admin.

## Website orders (WordPress / Forminator → dashboard)

Paid orders from your WordPress Forminator + PayPal form can flow straight into the
**🛒 Orders** page, where you review and **1-click convert** them into a client (the
create/import form opens pre-filled with the customer's name / email / WhatsApp).

### 1. Set the secret
Add `ORDERS_WEBHOOK_SECRET` to `.env` (any long random string). The webhook is
`POST /api/orders/incoming?key=ORDERS_WEBHOOK_SECRET` and accepts JSON with:
`external_id, submitted_at, full_name, whatsapp, email, plan, connections, amount,
currency, payment_status, payment_mode, transaction_id`. Duplicate `transaction_id`s are
ignored automatically.

### 2. Add the Forminator snippet (WordPress) — no slugs to find

This snippet **auto-detects** the fields (name / email / phone / plan / connections /
PayPal) by type, so you don't have to look anything up. **You only edit the two lines at
the top**: your site URL and your secret.

Easiest install (no theme editing):
1. WordPress admin → **Plugins → Add New** → install & activate **"Code Snippets"**.
2. **Snippets → Add New** → paste the code below → set `$DASHBOARD_URL` and `$SECRET`.
3. Set it to **"Run snippet everywhere"** → **Save Changes and Activate**.
4. Place one test order on your site → it appears under **🛒 Orders** in the dashboard.

```php
add_action( 'forminator_form_after_save_entry', 'morsar_send_order', 10, 2 );
function morsar_send_order( $form_id, $response ) {

    // ===== EDIT THESE TWO LINES ONLY =====
    $DASHBOARD_URL = 'https://YOUR-DOMAIN';          // your dashboard URL (no trailing slash)
    $SECRET        = 'YOUR_ORDERS_WEBHOOK_SECRET';   // same value as ORDERS_WEBHOOK_SECRET in .env
    // (optional) only one form: set its ID, else leave 0 to accept any form:
    $ONLY_FORM_ID  = 0;
    // =====================================

    if ( $ONLY_FORM_ID && (int) $form_id !== $ONLY_FORM_ID ) return;
    if ( ! class_exists( 'Forminator_API' ) ) return;
    $entry_id = isset( $response['entry_id'] ) ? (int) $response['entry_id'] : 0;
    if ( ! $entry_id ) return;

    $entry = Forminator_API::get_entry( $form_id, $entry_id );
    if ( ! $entry || empty( $entry->meta_data ) ) return;

    $order   = array( 'external_id' => $entry_id, 'submitted_at' => current_time( 'mysql' ), 'currency' => 'USD', 'raw' => array() );
    $payment = array();

    foreach ( $entry->meta_data as $slug => $meta ) {
        $value = isset( $meta['value'] ) ? $meta['value'] : '';
        $order['raw'][ $slug ] = $value;

        if ( strpos( $slug, 'name' ) === 0 ) {
            if ( is_array( $value ) ) $value = trim( implode( ' ', array_filter( $value ) ) );
            $order['full_name'] = $value;
        } elseif ( strpos( $slug, 'email' ) === 0 ) {
            $order['email'] = is_array( $value ) ? reset( $value ) : $value;
        } elseif ( strpos( $slug, 'phone' ) === 0 ) {
            $order['whatsapp'] = is_array( $value ) ? reset( $value ) : $value;
        } elseif ( strpos( $slug, 'number' ) === 0 && empty( $order['connections'] ) ) {
            $order['connections'] = $value;
        } elseif ( ( strpos( $slug, 'select' ) === 0 || strpos( $slug, 'radio' ) === 0 ) && empty( $order['plan'] ) ) {
            $order['plan'] = is_array( $value ) ? implode( ', ', $value ) : $value;
        } elseif ( strpos( $slug, 'paypal' ) === 0 || strpos( $slug, 'stripe' ) === 0 ) {
            $payment = is_array( $value ) ? $value : array( 'status' => $value );
        }
    }

    if ( $payment ) {
        $status = strtoupper( $payment['status'] ?? $payment['transaction_status'] ?? '' );
        $paid   = in_array( $status, array( 'COMPLETED', 'SUCCESS', 'PAID', 'APPROVED' ), true );
        if ( $status && ! $paid ) return;                       // only forward paid orders
        $order['payment_status'] = $status ?: 'COMPLETED';
        $order['payment_mode']   = strtoupper( $payment['mode'] ?? 'LIVE' );
        $order['transaction_id'] = $payment['transaction_id'] ?? $payment['id'] ?? '';
        if ( ! empty( $payment['amount'] ) )   $order['amount']   = $payment['amount'];
        if ( ! empty( $payment['currency'] ) ) $order['currency'] = $payment['currency'];
    }

    wp_remote_post( $DASHBOARD_URL . '/api/orders/incoming?key=' . rawurlencode( $SECRET ), array(
        'headers'  => array( 'Content-Type' => 'application/json' ),
        'body'     => wp_json_encode( $order ),
        'timeout'  => 15,
        'blocking' => false,
    ) );
}
```

The whole entry is also sent as `raw` and stored with the order, so nothing is lost even if
auto-detection misses an unusual field. New orders also trigger a Telegram alert if Telegram
is configured.

> **If a field looks wrong/empty** (some forms use custom field names), temporarily add
> `error_log( print_r( $entry->meta_data, true ) );` just before `wp_remote_post`, place a
> test order, then send me what appears in your server's PHP error log — I'll hard-map those
> exact fields for you.

## Deploy to a VPS

```bash
# on the server
git clone <your repo> && cd morsardash
npm ci
cp .env.example .env   # fill in secrets, set DATABASE_PATH to an absolute path
npm run build
npm run db:migrate
npm run seed

# run it under a process manager
npm i -g pm2
pm2 start "npm run start" --name morsardash
pm2 save && pm2 startup
```

Then put **nginx** in front as a reverse proxy to `localhost:3000` and add TLS with
**certbot**. Back up the SQLite file nightly, e.g.:

```bash
0 3 * * *  cp /path/to/data/morsardash.db /backups/morsardash-$(date +\%F).db
```

---

## Security reminders

- The dashboard is single-admin; keep it behind HTTPS and a strong password.
- Provider API keys are encrypted in the DB, never logged, and masked in the UI.
- **Rotate any API key that was ever shared in plaintext** (e.g. in chat/email).
- `.env`, `data/`, and `*.db` are gitignored — never commit them.

---

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Dev server                           |
| `npm run build`      | Production build                     |
| `npm run start`      | Run the production build             |
| `npm run db:generate`| Generate a new Drizzle migration     |
| `npm run db:migrate` | Apply migrations                     |
| `npm run seed`       | Create the admin account             |
