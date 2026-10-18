// TEMPORARY diagnostics - remove after debugging
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const target = url.searchParams.get('url') || 'https://httpbingo.org/headers';
    const ref = url.searchParams.get('ref') || 'https://football77.org/';
    try {
        const r = await fetch(target, { headers: { 'User-Agent': UA, 'Referer': ref, 'Origin': ref, 'Accept': '*/*' }, redirect: 'follow' });
        const t = await r.text();
        return Response.json({ status: r.status, len: t.length, body: t.slice(0, 2600) });
    } catch (e) { return Response.json({ error: e.message }); }
}
