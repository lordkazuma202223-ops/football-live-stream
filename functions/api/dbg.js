// TEMPORARY diagnostics - remove after debugging
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const REFERER = 'https://football77.org/';

async function probe(url, headers) {
    try {
        const r = await fetch(url, { headers, redirect: 'follow' });
        const t = await r.text();
        return {
            status: r.status,
            len: t.length,
            hasStreamPhp: /stream\.php/.test(t),
            contentType: r.headers.get('content-type'),
            server: r.headers.get('server'),
            cfMitigated: r.headers.get('cf-mitigated'),
            cfRay: r.headers.get('cf-ray'),
            snippet: t.replace(/\s+/g, ' ').slice(0, 300)
        };
    } catch (e) { return { error: e.message }; }
}

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const target = url.searchParams.get('url') || 'https://football77.org/';
    const full = {
        'User-Agent': UA, 'Referer': REFERER,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1'
    };
    const out = {
        target,
        withRefererFull: await probe(target, full),
        refererOnly: await probe(target, { 'User-Agent': UA, 'Referer': REFERER }),
        noReferer: await probe(target, { 'User-Agent': UA }),
        originHeader: await probe(target, { 'User-Agent': UA, 'Origin': REFERER })
    };
    return Response.json(out);
}
