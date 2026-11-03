# Planning Radar — Go-Live Runbook (PR-9)

Everything is built and the database layer is already live. These are the steps
to deploy the code and switch the feature on. Run them in order.

Project ref: `gxebyfkfrzijdpzntrkh` · Site: `https://buildersready.uk`

---

## 0. What's already live (no action needed)
- Migrations applied: `planning_listings`, `planning_listing_actions`,
  `planning_saved_searches`, `planning_letters`, `planning_catchments`, the
  `planning_status` enum, RLS, `search_planning_listings`,
  `register_planning_catchment`, `run_planning_alerts`, and the
  `planning_alert` notification kind.
- Alerts cron scheduled (`planning-alerts-daily`, 07:00 daily).
- 326 real listings loaded across 4 catchments (Manchester, Harrogate,
  Croydon, Birmingham) for the launch.

---

## 1. Deploy the web app (Vercel)
From the repo root (PowerShell). This runs the full typecheck/build and ships
the new `/[slug]/planning-radar` pages, the quote-prefill, and the
`/api/planning/letter` route:

```powershell
npx vercel --prod
```

If the build reports any TypeScript errors in the new files, fix and re-run.

---

## 2. Deploy the ingest Edge Function (Supabase CLI)
The MCP deploy tool mangled the upload, so deploy the function from the CLI:

```powershell
cd "C:\Users\oddie\Desktop\Builders Ready App"
npx supabase functions deploy planning-ingest --project-ref gxebyfkfrzijdpzntrkh
```

(If not logged in: `npx supabase login` first.)

---

## 3. Populate the UK — 14-day national backfill (resumable loop)
The ingest is **national-by-date**: it pages the whole UK by date (no
catchments), so one backfill covers every council and any postcode works
instantly. The function is **resumable** — each call does 12 pages and returns
`nextPage` + `done`, so this loop walks the whole window with no timeout risk.

Get your **service_role** key from Dashboard → Settings → API (keep it secret).

```powershell
$ref = "gxebyfkfrzijdpzntrkh"
$fn  = "https://$ref.supabase.co/functions/v1/planning-ingest"
$key = "PASTE_SERVICE_ROLE_KEY"
$headers = @{ Authorization = "Bearer $key"; apikey = $key; "Content-Type" = "application/json" }

$page = 1
do {
  $body = @{ days = 14; fromPage = $page; maxPages = 12 } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri $fn -Method Post -Headers $headers -Body $body
  Write-Host ("up to page {0}: +{1} rows (done={2})" -f $r.lastPage, $r.upserted, $r.done)
  $page = $r.nextPage
  Start-Sleep -Seconds 8
} while (-not $r.done)
Write-Host "Backfill complete."
```

Expect the residential-build subset (extensions, lofts, dormers, etc.) across
every UK council — several thousand listings. ~5 batches, a couple of minutes.
Re-running is safe (idempotent upsert). (Interim: 653 rows / 133 councils are
already loaded, so the feed isn't empty even before this runs.)

### Check it pulled through
```powershell
$h = @{ apikey = $key; Authorization = "Bearer $key"; Prefer = "count=exact"; Range = "0-0" }
$resp = Invoke-WebRequest -Uri "https://$ref.supabase.co/rest/v1/planning_listings?select=id" -Headers $h -Method Get
"Total listings now: " + (($resp.Headers['Content-Range'] -split '/')[-1])
```

---

## 4. Schedule the nightly ingest (Supabase SQL editor)
Store the service-role key in Vault once, then schedule the job (06:00, before
the 07:00 alerts). Get the service-role key from Dashboard → Settings → API.

```sql
-- one-off: store the key
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

-- schedule the nightly ingest
select cron.schedule(
  'planning-ingest-daily', '0 6 * * *',
  $job$
    select net.http_post(
      url     := 'https://gxebyfkfrzijdpzntrkh.supabase.co/functions/v1/planning-ingest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body    := jsonb_build_object('days', 2)
    );
  $job$
);
```

(Daily uses `days: 2` to catch applications PlanIt synced in the last day or
two — only a handful of requests. The retention prune runs inside the function.)

---

## 5. Ship the mobile app (OTA)
From `apps/mobile` (OTA, no native build needed — the new tab uses no new
native modules):

```powershell
cd "C:\Users\oddie\Desktop\Builders Ready App\apps\mobile"
npx eas-cli update --branch production --message "Planning Radar"
```

---

## 6. Smoke test (2 minutes)
- Web: sign in as a builder → **Planning Radar** in the nav → search `M1`,
  distance 5 miles → listings appear → open one → Create a quote / Draft a
  letter / Open in Maps / View official record / Save → check **My pipeline**.
- Mobile: Home grid → **Planning Radar** → same checks. Save a search → tap
  **Alert me**.
- Letter: draft one and send → confirm the PDF lands in your own inbox.

---

## Notes
- **PlanIt commercial terms** — confirm with PlanIt before relying on it at
  scale (fair-use free API; you're a paid product). Not a blocker to launch.
- **Embedded in-app map** — deferred to the next native build (needs a native
  maps library, which can't ship over-the-air). "Open in Maps" covers it for now.
- **Coverage grows itself** — every area a builder searches is registered as a
  catchment, so the nightly ingest expands UK-wide to wherever your builders are.
