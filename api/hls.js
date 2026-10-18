// Vercel Serverless Function - Ad-free HLS proxy
// Adds the football77 Referer that the CDN requires and rewrites playlist URIs
// so the browser only ever talks to our own origin (no ads, no CORS issues).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const REFERER = 'https://football77.org/';
const MEDIA_HOSTS = ['football77.org', 'embedsport.site', 'embedfootball.site', 'tiktokcdn.com'];

function hostAllowed(hostname) {
    return MEDIA_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

function proxyUri(uri, base) {
    try {
        return '/api/hls?u=' + encodeURIComponent(new URL(uri, base).toString());
    } catch {
        return uri;
    }
}

function rewritePlaylist(text, base) {
    return text.split(/\r?\n/).map(line => {
        if (!line) return line;
        if (line.charAt(0) === '#') {
            return line.replace(/(URI=")([^"]+)(")/g, (all, a, uri, b) => a + proxyUri(uri, base) + b);
        }
        return proxyUri(line.trim(), base);
    }).join('\n');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const target = req.query.u;
    if (!target) return res.status(400).json({ error: 'Missing u parameter' });

    let u;
    try { u = new URL(target); } catch { return res.status(400).json({ error: 'Invalid u parameter' }); }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return res.status(400).json({ error: 'Invalid protocol' });
    if (!hostAllowed(u.hostname)) return res.status(403).json({ error: 'Host not allowed' });

    try {
        const headers = { 'User-Agent': UA, 'Referer': REFERER, 'Accept': '*/*' };
        if (req.headers.range) headers['Range'] = req.headers.range;

        const r = await fetch(u.toString(), { headers, redirect: 'follow' });
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        const isPlaylist = u.hostname === 'football77.org' || u.hostname.endsWith('.football77.org') ||
            ct.includes('mpegurl') || ct.includes('mpegurl');

        if (isPlaylist) {
            const text = await r.text();
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            return res.status(r.status).send(rewritePlaylist(text, u.toString()));
        }

        const buf = Buffer.from(await r.arrayBuffer());
        res.setHeader('Content-Type', ct || 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=8');
        const cr = r.headers.get('content-range'); if (cr) res.setHeader('Content-Range', cr);
        const cl = r.headers.get('content-length'); if (cl) res.setHeader('Content-Length', cl);
        return res.status(r.status).send(buf);
    } catch (e) {
        return res.status(502).json({ error: e.message });
    }
}
