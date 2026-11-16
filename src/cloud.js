// The shared community database (Supabase). Reading is open to everyone; every write goes through the
// "share" edge function (supabase/functions/share), which validates, rate limits and safety-checks it.
// The key below is a publishable key: it is meant to be public. Row level security protects the data.
const URL_ = 'https://anrguxneshfmtueyhqgb.supabase.co';
const KEY = 'sb_publishable_FbjzC1UmCZttwFs2uW6yxQ_sCQb4nRE';

export const sharedPhotoUrl = path => `${URL_}/storage/v1/object/public/shared/${path}`;

export async function listShared() {
  const cols = 'id,school,site,lat,lon,visited_at,stage,temp,ph,litter,notes,counts,shared_photos(path,class)';
  const res = await fetch(`${URL_}/rest/v1/shared_visits?select=${cols}&order=visited_at.desc&limit=500`, { headers: { apikey: KEY } });
  if (!res.ok) throw new Error('list failed');
  return res.json();
}

// Resolves to the function's JSON on success; throws an Error whose message is the server's error code.
async function call(body) {
  const res = await fetch(`${URL_}/functions/v1/share`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: KEY },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'server_error');
  return json;
}

export const shareVisit = (school, visit, photos, editKey) => call({ action: 'share', school, visit, photos, editKey });
export const unshareVisit = (id, editKey) => call({ action: 'delete', id, editKey });
export const reportVisit = id => call({ action: 'report', id });
