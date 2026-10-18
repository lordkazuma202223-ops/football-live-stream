// Cloudflare Pages Function - Ad-free HLS proxy
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

export async function onRequest(context) {
    const request = context.request;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
    };
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('u');
    if (!target) {
        return Response.json({ error: 'Missing u parameter' }, { status: 400, headers: corsHeaders });
    }

    let u;
    try { u = new URL(target); } catch { return Response.json({ error: 'Invalid u parameter' }, { status: 400, headers: corsHeaders }); }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return Response.json({ error: 'Invalid protocol' }, { status: 400, headers: corsHeaders });
    }
    if (!hostAllowed(u.hostname)) {
        return Response.json({ error: 'Host not allowed' }, { status: 403, headers: corsHeaders });
    }

    try {
        const headers = { 'User-Agent': UA, 'Referer': REFERER, 'Accept': '*/*' };
        const range = request.headers.get('Range');
        if (range) headers['Range'] = range;

        const r = await fetch(u.toString(), { headers, redirect: 'follow' });
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        const isPlaylist = u.hostname === 'football77.org' || u.hostname.endsWith('.football77.org') ||
            ct.includes('mpegurl');

        if (isPlaylist) {
            const text = await r.text();
            return new Response(rewritePlaylist(text, u.toString()), {
                status: r.status,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            });
        }

        const out = { ...corsHeaders, 'Content-Type': ct || 'application/octet-stream', 'Cache-Control': 'public, max-age=8' };
        const cr = r.headers.get('content-range'); if (cr) out['Content-Range'] = cr;
        const cl = r.headers.get('content-length'); if (cl) out['Content-Length'] = cl;
        out['Accept-Ranges'] = 'bytes';
        return new Response(r.body, { status: r.status, headers: out });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 502, headers: corsHeaders });
    }
}
