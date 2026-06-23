import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Partner-mode management. The cross-user bits (resolving a username to a user,
// reading the other party's display name) need the service role, so they live
// here rather than in the browser. Read-only data access itself is enforced by
// RLS (see supabase/partner-mode.sql) — this route only manages the links.

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfigured: missing service key.' }, { status: 500 });
  }
  const db = admin();

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authErr } = await db.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const me = user.id;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  // Resolve a profile id -> { handle, name } for display.
  async function describe(ids: string[]): Promise<Record<string, { handle: string | null; name: string | null }>> {
    const out: Record<string, { handle: string | null; name: string | null }> = {};
    if (ids.length === 0) return out;
    const { data: profs } = await db.from('profiles').select('id, handle').in('id', ids);
    for (const p of profs ?? []) out[p.id] = { handle: p.handle ?? null, name: null };
    // names live in auth user_metadata
    await Promise.all(ids.map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      const name = (data?.user?.user_metadata?.name as string | undefined) ?? null;
      out[id] = { handle: out[id]?.handle ?? null, name };
    }));
    return out;
  }

  if (action === 'invite') {
    const handle = String(body.handle ?? '').trim().toLowerCase();
    if (!handle) return NextResponse.json({ error: 'Enter a username.' }, { status: 400 });
    const { data: prof } = await db.from('profiles').select('id').eq('handle', handle).maybeSingle();
    if (!prof) return NextResponse.json({ error: 'No user with that username.' }, { status: 404 });
    if (prof.id === me) return NextResponse.json({ error: "You can't add yourself." }, { status: 400 });
    const { error } = await db.from('partner_links').upsert(
      { owner_id: me, viewer_id: prof.id, status: 'pending' },
      { onConflict: 'owner_id,viewer_id' }
    );
    if (error) return NextResponse.json({ error: 'Could not send invite.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'list') {
    const [{ data: asOwner }, { data: asViewer }] = await Promise.all([
      db.from('partner_links').select('*').eq('owner_id', me),
      db.from('partner_links').select('*').eq('viewer_id', me),
    ]);
    const ids = [
      ...(asOwner ?? []).map((l) => l.viewer_id),
      ...(asViewer ?? []).map((l) => l.owner_id),
    ];
    const names = await describe([...new Set(ids)]);
    // myViewers: people who can view MY data. iCanView: people whose data I can view.
    return NextResponse.json({
      myViewers: (asOwner ?? []).map((l) => ({ id: l.id, userId: l.viewer_id, status: l.status, ...names[l.viewer_id] })),
      iCanView: (asViewer ?? []).map((l) => ({ id: l.id, userId: l.owner_id, status: l.status, ...names[l.owner_id] })),
    });
  }

  if (action === 'respond') {
    const linkId = String(body.linkId ?? '');
    const accept = !!body.accept;
    // Only the viewer of this link may respond.
    const { data: link } = await db.from('partner_links').select('*').eq('id', linkId).maybeSingle();
    if (!link || link.viewer_id !== me) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (accept) {
      await db.from('partner_links').update({ status: 'accepted' }).eq('id', linkId);
    } else {
      await db.from('partner_links').delete().eq('id', linkId);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'remove') {
    const linkId = String(body.linkId ?? '');
    // Either party may remove a link they're part of.
    const { data: link } = await db.from('partner_links').select('*').eq('id', linkId).maybeSingle();
    if (!link || (link.owner_id !== me && link.viewer_id !== me)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    await db.from('partner_links').delete().eq('id', linkId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
