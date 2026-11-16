// The only way to write to the shared database. The browser never writes directly.
//   share   publish a visit (numbers, and photos if the safety check is configured)
//   delete  remove your own shared visit, proven by the edit key kept on your device
//   report  flag a visit; three different reporters hide it until a moderator looks
//
// Secrets (Supabase dashboard > Edge Functions > Secrets), all optional:
//   OPENAI_API_KEY     turns on the safety check. Without it photos are refused and only numbers are shared.
//   TURNSTILE_SECRET   turns on the Cloudflare Turnstile bot check.
// This endpoint is public (verify_jwt is off): every request is validated and rate limited below.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const OPENAI = Deno.env.get('OPENAI_API_KEY');
const TURNSTILE = Deno.env.get('TURNSTILE_SECRET');
const CLASSES = ['clean', 'plastic', 'other', 'natural'];
const STAGES = ['monitor', 'before', 'action', 'after'];
const MAX_PHOTOS = 8, MAX_PHOTO_BYTES = 700_000, PER_HOUR = 10, PER_DAY = 40;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, apikey, authorization',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
class Refuse extends Error { constructor(public status: number, public code: string) { super(code); } }

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const text = (v: unknown, min: number, max: number, code: string) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min || s.length > max) throw new Refuse(400, code);
  return s;
};
const numberIn = (v: unknown, min: number, max: number) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Refuse(400, 'bad_number');
  return n;
};

// OpenAI's moderation endpoint is free. One request per item; any flag refuses the whole upload.
async function flagged(input: unknown): Promise<boolean> {
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI}` },
    body: JSON.stringify({ model: 'omni-moderation-latest', input }),
  });
  if (!res.ok) throw new Refuse(503, 'safety_check_unavailable'); // fail closed: never publish unchecked
  return (await res.json()).results.some((r: { flagged: boolean }) => r.flagged);
}

async function share(body: any, ipHash: string, ip: string) {
  const school = text(body.school, 2, 80, 'bad_school');
  const v = body.visit ?? {};
  const site = text(v.site, 1, 80, 'bad_site');
  const notes = text(v.notes ?? '', 0, 500, 'bad_notes');
  const editKey = text(body.editKey, 32, 128, 'bad_key');
  if (!STAGES.includes(v.stage)) throw new Refuse(400, 'bad_stage');
  const visitedAt = new Date(v.date);
  if (isNaN(+visitedAt) || +visitedAt > Date.now() + 864e5) throw new Refuse(400, 'bad_date');
  const photos: { bytes: Uint8Array; data: string; class: string | null }[] = [];
  if (!Array.isArray(body.photos ?? []) || (body.photos ?? []).length > MAX_PHOTOS) throw new Refuse(400, 'too_many_photos');
  for (const p of body.photos ?? []) {
    if (typeof p?.data !== 'string' || p.data.length > MAX_PHOTO_BYTES * 1.4) throw new Refuse(400, 'photo_too_big');
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(p.data), c => c.charCodeAt(0)); } catch { throw new Refuse(400, 'bad_photo'); }
    if (bytes.length > MAX_PHOTO_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Refuse(400, 'bad_photo'); // JPEG only
    photos.push({ bytes, data: p.data, class: CLASSES.includes(p.class) ? p.class : null });
  }

  if (TURNSTILE) {
    const form = new FormData();
    form.set('secret', TURNSTILE);
    form.set('response', String(body.turnstile ?? ''));
    form.set('remoteip', ip);
    const ok = (await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })).json()).success;
    if (!ok) throw new Refuse(403, 'bot_check_failed');
  }

  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const recent = async (ms: number) =>
    (await db.from('shared_visits').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since(ms))).count ?? 0;
  if (await recent(36e5) >= PER_HOUR || await recent(864e5) >= PER_DAY) throw new Refuse(429, 'too_many');

  // Without the safety check, photos are never published: numbers only.
  const withPhotos = OPENAI ? photos : [];
  if (OPENAI) {
    if (await flagged(`${school}\n${site}\n${notes}`)) throw new Refuse(422, 'text_rejected');
    for (const p of withPhotos)
      if (await flagged([{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${p.data}` } }])) throw new Refuse(422, 'photo_rejected');
  }

  const counts: Record<string, number> = {};
  for (const p of photos) if (p.class) counts[p.class] = (counts[p.class] ?? 0) + 1;
  const { data: row, error } = await db.from('shared_visits').insert({
    edit_key_hash: await sha256(editKey), ip_hash: ipHash, school, site, notes, stage: v.stage,
    lat: numberIn(v.lat, -90, 90), lon: numberIn(v.lon, -180, 180), visited_at: visitedAt.toISOString(),
    temp: numberIn(v.temp, -5, 45), ph: numberIn(v.ph, 0, 14), litter: numberIn(v.litter, 0, 100000), counts,
  }).select('id').single();
  if (error) throw new Refuse(500, 'db_error');

  for (const [i, p] of withPhotos.entries()) {
    const path = `${row.id}/${i}.jpg`;
    const up = await db.storage.from('shared').upload(path, p.bytes, { contentType: 'image/jpeg' });
    if (!up.error) await db.from('shared_photos').insert({ visit_id: row.id, path, class: p.class });
  }
  return { id: row.id, photos: OPENAI ? withPhotos.length : photos.length ? 'disabled' : 0 };
}

async function removeVisit(id: string) {
  const { data: files } = await db.from('shared_photos').select('path').eq('visit_id', id);
  if (files?.length) await db.storage.from('shared').remove(files.map(f => f.path));
  await db.from('shared_visits').delete().eq('id', id);
}

async function del(body: any) {
  const id = text(body.id, 36, 36, 'bad_id');
  const hash = await sha256(text(body.editKey, 32, 128, 'bad_key'));
  const { data } = await db.from('shared_visits').select('id').eq('id', id).eq('edit_key_hash', hash).maybeSingle();
  if (!data) throw new Refuse(403, 'not_yours');
  await removeVisit(id);
  return { ok: true };
}

async function report(body: any, ipHash: string) {
  const id = text(body.id, 36, 36, 'bad_id');
  const ins = await db.from('shared_reports').insert({ visit_id: id, ip_hash: ipHash });
  if (ins.error && ins.error.code !== '23505') throw new Refuse(404, 'not_found'); // 23505: this visitor already reported it
  const { count } = await db.from('shared_reports').select('*', { count: 'exact', head: true }).eq('visit_id', id);
  await db.from('shared_visits').update({ reports: count ?? 0, ...((count ?? 0) >= 3 && { status: 'hidden' }) }).eq('id', id);
  return { ok: true };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'post_only' });
  try {
    if (Number(req.headers.get('content-length') ?? 0) > 9_000_000) throw new Refuse(413, 'too_large');
    const body = await req.json().catch(() => { throw new Refuse(400, 'bad_json'); });
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ipHash = await sha256(ip + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')); // salted: the stored hash can't be reversed to an address
    if (body.action === 'share') return reply(200, await share(body, ipHash, ip));
    if (body.action === 'delete') return reply(200, await del(body));
    if (body.action === 'report') return reply(200, await report(body, ipHash));
    throw new Refuse(400, 'bad_action');
  } catch (e) {
    if (e instanceof Refuse) return reply(e.status, { error: e.code });
    console.error(e);
    return reply(500, { error: 'server_error' });
  }
});
