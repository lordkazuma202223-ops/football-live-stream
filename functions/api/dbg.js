// TEMPORARY diagnostics - remove after debugging
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const REFERER = 'https://football77.org/';

async function probe(url, headers) {
    try {
        const r = await fetch(url, { headers, redirect: 'follow' });
        const t = await r.text();
        return { status: r.status, len: t.length, ok: /stream\.php/.test(t), snippet: t.replace(/\s+/g, ' ').slice(0, 120) };
    } catch (e) { return { error: e.message }; }
}

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const target = url.searchParams.get('url') || 'https://football77.org/embed/?id=ZjoxNTkzMzM3OjQyYTBjMDk0YTM&source=lola';
    const base = { 'User-Agent': UA, 'Referer': REFERER, 'Accept': 'text/html,*/*' };
    const out = {
        target,
        baseline: await probe(target, base),
        xff: await probe(target, { ...base, 'X-Forwarded-For': '88.77.66.55' }),
        connectIp: await probe(target, { ...base, 'CF-Connecting-IP': '88.77.66.55' }),
        realIp: await probe(target, { ...base, 'X-Real-IP': '88.77.66.55' }),
        fwd: await probe(target, { ...base, 'Forwarded': 'for=88.77.66.55' }),
        selfRef: await probe(target, { ...base, 'Referer': target }),
        plainNoRef: await probe(target, { 'User-Agent': UA }),
        root: await probe('https://football77.org/', base)
    };
    return Response.json(out);
}
