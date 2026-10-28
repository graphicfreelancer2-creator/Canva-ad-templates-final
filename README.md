# 1200+ Canva Ad Templates: store + admin panel

What you get
- `/` landing page + checkout (customer uploads the payment screenshot)
- `/admin` private dashboard: orders, WhatsApp/email, screenshots, daily/weekly/monthly sales, Approve/Cancel
- On **Approve**, the server sends a **Purchase** event to Meta (Conversions API)

## 1. Supabase (free) - database, screenshot storage, admin login
1. supabase.com -> New project.
2. SQL Editor -> New query -> paste `supabase/schema.sql`. First replace BOTH `YOUR_ADMIN_EMAIL` with your email (lowercase). Run.
3. Authentication -> Users -> Add user -> your admin email + a strong password (tick "Auto confirm").
4. Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up".
5. Project Settings -> API: copy **Project URL**, **anon public key**, and **service_role key** (secret, server only).

## 2. Meta (Conversions API)
1. Events Manager -> your Pixel -> Settings -> Conversions API -> **Generate access token**. Copy it.
2. Copy your **Pixel ID**.
3. To test: Events Manager -> Test events -> copy the test code (like `TEST12345`) and put it in `META_TEST_EVENT_CODE` while testing. Remove it for live.

## 3. Fill config.js
```
PIXEL_ID, SUPABASE_URL, SUPABASE_ANON_KEY
```
(These three are public by design. Never put the service_role key or the Meta token here.)

## 4. GitHub + Vercel
1. Upload ALL files and folders of this project to a GitHub repo (keep `index.html`, `config.js`, `api/`, `admin/` in the repo root).
2. Vercel -> Add New Project -> import the repo.
3. Vercel -> Settings -> Environment Variables (then Redeploy):

| Name | Value |
|---|---|
| SUPABASE_URL | your Project URL |
| SUPABASE_SERVICE_ROLE_KEY | service_role key (secret) |
| ADMIN_EMAIL | your admin email |
| META_PIXEL_ID | your Pixel ID |
| META_ACCESS_TOKEN | Conversions API token |
| SITE_URL | https://your-domain.com |
| META_TEST_EVENT_CODE | (optional, testing only) |
| META_API_VERSION | (optional, default v23.0) |

4. Open `https://your-domain.com/admin` and sign in.

## How Purchase tracking works
The customer pays by JazzCash/EasyPaisa and is NOT on your site when you approve, so a browser pixel cannot fire. When you click **Approve**, the server sends the Purchase event to Meta with the customer's hashed email/phone plus the saved fbp/fbc, IP and browser info, so Meta can match it to the ad click. Each order is sent once. If Meta rejects it, you will see "Meta failed" and can click **Retry**.
Browser events: PageView (page load), InitiateCheckout (checkout opens), Lead (order submitted).

## Updating the site later
Replace `index.html` on GitHub. Vercel redeploys by itself. Keep `config.js` and `api/` as they are.
