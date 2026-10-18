// Vercel Serverless Function - Resolve a football77 embed into ad-free HLS sources
// Flow: embed page -> stream.php (RESOLVE + CHANNELS) -> resolve.php -> px.php m3u8
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const REFERER = 'https://football77.org/';
const EMBED_HOSTS = ['football77.org'];

function hostAllowed(hostname) {
    return EMBED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

async function fetchText(url, referer) {
    const r = await fetch(url, {
        headers: {
            'User-Agent': UA,
            'Referer': referer || REFERER,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'follow'
    });
    return { status: r.status, text: await r.text() };
}

export async function resolveEmbed(embedUrl) {
    let u;
    try { u = new URL(embedUrl); } catch { return { success: false, error: 'Invalid embed URL' }; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { success: false, error: 'Invalid protocol' };
    if (!hostAllowed(u.hostname)) return { success: false, error: 'Embed host not allowed' };

    const embed = await fetchText(u.toString(), REFERER);
    const sm = embed.text.match(/src="([^"]*stream\.php[^"]*)"/) || embed.text.match(/["']([^"']*stream\.php[^"']*)["']/);
    if (!sm) return { success: false, error: 'No stream.php found' };
    const streamUrl = new URL(sm[1].replace(/&amp;/g, '&'), u).toString();

    const stream = await fetchText(streamUrl, u.toString());
    const rm = stream.text.match(/RESOLVE\s*=\s*"([^"]+)"/);
    const cm = stream.text.match(/CHANNELS\s*=\s*(\[[\s\S]*?\])/);
    if (!rm || !cm) return { success: false, error: 'No resolve data in stream.php' };

    const RESOLVE = rm[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    let CHANNELS;
    try {
        CHANNELS = JSON.parse(cm[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'));
    } catch { return { success: false, error: 'Bad channels JSON' }; }
    if (!Array.isArray(CHANNELS) || !CHANNELS.length) return { success: false, error: 'No channels' };

    const resolveUrl = new URL(RESOLVE, streamUrl).toString();

    const results = await Promise.all(CHANNELS.slice(0, 8).map(async (c) => {
        try {
            const rj = await fetchText(resolveUrl + '&ch=' + encodeURIComponent(c.ch) + '&token=' + encodeURIComponent(c.token), streamUrl);
            const j = JSON.parse(rj.text);
            if (!j || !j.url) return null;
            const pxUrl = new URL(j.url, streamUrl).toString();
            const pr = await fetch(pxUrl, {
                headers: { 'User-Agent': UA, 'Referer': REFERER, 'Accept': 'application/vnd.apple.mpegurl,*/*' },
                redirect: 'follow'
            });
            if (pr.status !== 200) return null;
            const txt = await pr.text();
            if (!txt.includes('#EXTM3U')) return null;
            return { name: c.name || ('Channel ' + c.ch), ch: c.ch, url: pxUrl, hls: '/api/hls?u=' + encodeURIComponent(pxUrl) };
        } catch { return null; }
    }));

    const streams = results.filter(Boolean);
    return { success: streams.length > 0, streams, streamUrl };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const embedUrl = req.query.url;
    if (!embedUrl) return res.status(400).json({ success: false, error: 'Missing url parameter' });

    try {
        const result = await resolveEmbed(embedUrl);
        res.setHeader('Cache-Control', result.success ? 's-maxage=15, stale-while-revalidate=30' : 'no-store');
        return res.status(result.success ? 200 : 502).json(result);
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
