// TEMPORARY diagnostics - remove after debugging
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const REFERER = 'https://football77.org/';
async function probe(url, headers) {
    try {
        const r = await fetch(url, { headers, redirect: 'follow' });
        const t = await r.text();
        return { status: r.status, len: t.length, ok: /stream\.php/.test(t) };
    } catch (e) { return { error: e.message }; }
}
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const embed = url.searchParams.get('url') || 'https://football77.org/embed/?id=ZjoxNTQ5NTEzOmJhMWRmYWUxYzc&source=lola';
    const base = { 'User-Agent': UA, 'Referer': REFERER, 'Accept': 'text/html,*/*' };
    const echo = await (await fetch('https://httpbingo.org/headers', { headers: { ...base, 'cf-worker': '', 'cdn-loop': '' } })).json();
    return Response.json({
        echoWorker: echo.headers['Cf-Worker'] || null,
        echoLoop: echo.headers['Cdn-Loop'] || null,
        embed: {
            baseline: await probe(embed, base),
            noWorker: await probe(embed, { ...base, 'Cf-Worker': '' }),
            workerX: await probe(embed, { ...base, 'Cf-Worker': 'x' }),
            noLoop: await probe(embed, { ...base, 'Cdn-Loop': '' }),
            both: await probe(embed, { ...base, 'Cf-Worker': '', 'Cdn-Loop': '' })
        }
    });
}
