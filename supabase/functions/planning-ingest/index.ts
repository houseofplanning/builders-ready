// planning-ingest — Planning Radar national data pipeline (national-by-date, resumable)
//
// Pulls UK planning applications from the PlanIt national API by DATE (one
// national stream — no catchments), normalises to the minimal public shape,
// upserts into public.planning_listings, and prunes old rows (retention).
//
// Resumable: processes a bounded batch of pages per call and returns `nextPage`
// + `done`, so a backfill can be walked with a simple loop and no single call
// risks timing out. No applicant/agent personal data is fetched or stored.
//
// Body: { days?, fromPage?, maxPages?, retention? }
//   daily cron:  { "days": 2 }                       (small, one shot, done=true)
//   backfill:    { "days": 14, "fromPage": N, "maxPages": 12 }  (loop on nextPage)

import { createClient } from "jsr:@supabase/supabase-js@2";

const PLANIT_BASE = "https://www.planit.org.uk/api/applics/json";
const UA = "BuildersReady/1.0 (+https://buildersready.uk; planning radar ingest)";

const KEYWORDS = [
  "rear extension", "side extension", "wrap", "single storey", "single-storey",
  "two storey", "two-storey", "double storey", "double-storey", "loft conversion",
  "loft", "dormer", "hip to gable", "hip-to-gable", "mansard", "basement",
  "subterranean", "garage conversion", "outbuilding", "out building",
  "new dwelling", "new build", "newbuild", "porch", "garden room", "annexe",
  "annex", "extension",
];
const EXCLUDE = [
  "telecom", "advertisement", "advert consent", "tree works", "works to trees",
  "tpo", "shopfront", "shop front", "signage", "illuminated sign", "hedge",
  "discharge of condition", "non-material amendment", "certificate of lawful",
];

function isResidentialBuild(desc: string): boolean {
  const t = (desc || "").toLowerCase();
  if (EXCLUDE.some((x) => t.includes(x))) return false;
  return KEYWORDS.some((k) => t.includes(k));
}

function workCategory(desc: string): string {
  const t = (desc || "").toLowerCase();
  const map: [string, string][] = [
    ["loft", "Loft conversion"], ["dormer", "Dormer"], ["mansard", "Loft conversion"],
    ["hip to gable", "Loft conversion"], ["basement", "Basement"],
    ["subterranean", "Basement"], ["garage conversion", "Garage conversion"],
    ["outbuilding", "Outbuilding / garden room"], ["out building", "Outbuilding / garden room"],
    ["garden room", "Outbuilding / garden room"], ["annexe", "Outbuilding / garden room"],
    ["annex", "Outbuilding / garden room"], ["porch", "Porch"],
    ["new dwelling", "New dwelling"], ["new build", "New dwelling"], ["newbuild", "New dwelling"],
    ["wrap", "Wraparound extension"], ["two storey", "Two-storey extension"],
    ["two-storey", "Two-storey extension"], ["double storey", "Two-storey extension"],
    ["side extension", "Side extension"], ["rear extension", "Rear extension"],
    ["extension", "Extension"],
  ];
  for (const [k, label] of map) if (t.includes(k)) return label;
  return "Other works";
}

function normStatus(appState: string): string {
  const s = (appState || "").toLowerCase();
  if (/permit|grant|approv|allow|condition/.test(s)) return "approved";
  if (/refus|reject|dismiss/.test(s)) return "refused";
  if (/withdraw/.test(s)) return "withdrawn";
  if (/undecided|regist|consult|receiv|pending|valid/.test(s)) return "pending";
  return "other";
}

function toDate(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normaliseRow(r: Record<string, any>) {
  const desc = r.description ?? "";
  if (!r.uid || !r.address || !isResidentialBuild(desc)) return null;
  const loc = r.location?.coordinates;
  return {
    id: String(r.uid),
    authority: r.area_name ?? null,
    address: r.address,
    postcode: r.postcode ?? null,
    latitude: Array.isArray(loc) ? loc[1] : null,
    longitude: Array.isArray(loc) ? loc[0] : null,
    description: (desc as string).slice(0, 500),
    application_type: r.app_type ?? null,
    work_category: workCategory(desc),
    status: normStatus(r.app_state ?? ""),
    status_raw: r.app_state ?? null,
    validated_date: toDate(r.start_date),
    decided_date: toDate(r.decided_date),
    portal_url: r.url ?? null,
    source_updated_at: r.last_changed ? new Date(r.last_changed).toISOString() : null,
    synced_at: new Date().toISOString(),
  };
}

async function fetchPage(startISO: string, endISO: string, page: number): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({ start_date: startISO, end_date: endISO, pg_sz: "200", page: String(page) });
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${PLANIT_BASE}?${qs}`, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`PlanIt ${res.status} on page ${page}`);
    const data = await res.json();
    return data.records ?? [];
  }
  throw new Error(`PlanIt kept rate-limiting on page ${page}`);
}

Deno.serve(async (req) => {
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const days = Number(body.days ?? 2);
    const fromPage = Math.max(1, Number(body.fromPage ?? 1));
    const maxPages = Math.max(1, Number(body.maxPages ?? 12));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const startISO = start.toISOString().slice(0, 10);
    const endISO = end.toISOString().slice(0, 10);

    let fetched = 0, kept = 0, upserted = 0, done = false, lastPage = fromPage - 1;
    const seen = new Set<string>();

    for (let i = 0; i < maxPages; i++) {
      const page = fromPage + i;
      const raw = await fetchPage(startISO, endISO, page);
      lastPage = page;
      fetched += raw.length;
      const rows = raw
        .map(normaliseRow)
        .filter((r): r is NonNullable<ReturnType<typeof normaliseRow>> => !!r && !seen.has(r.id));
      for (const r of rows) seen.add(r.id);
      kept += rows.length;
      for (let j = 0; j < rows.length; j += 500) {
        const chunk = rows.slice(j, j + 500);
        const { error } = await supabase.from("planning_listings").upsert(chunk, { onConflict: "id" });
        if (error) throw error;
        upserted += chunk.length;
      }
      if (raw.length < 200) { done = true; break; }
      await new Promise((r) => setTimeout(r, 300));
    }

    // Retention runs only once the whole window is done (daily, or the final
    // backfill batch): keep non-approved ~6 months, approved up to ~13 months.
    let pruned = 0;
    if (done && body.retention !== false) {
      const { count } = await supabase
        .from("planning_listings")
        .delete({ count: "exact" })
        .or(
          `validated_date.lt.${new Date(Date.now() - 395 * 86400000).toISOString().slice(0, 10)},` +
          `and(status.neq.approved,validated_date.lt.${new Date(Date.now() - 183 * 86400000).toISOString().slice(0, 10)})`,
        );
      pruned = count ?? 0;
    }

    return new Response(
      JSON.stringify({
        ok: true, window: { startISO, endISO },
        fromPage, lastPage, nextPage: done ? null : lastPage + 1,
        fetched, kept, upserted, done, pruned,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
