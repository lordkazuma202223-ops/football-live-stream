// Cloudflare Pages Function - IPTV playlist proxy + parser
// Fetches a public M3U playlist (default: Myanmar) from GitHub-hosted sources,
// parses it into JSON channels, and caches the result on the edge.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const PLAYLISTS = {
    mm: [
        'https://iptv-org.github.io/iptv/countries/mm.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/mm.m3u',
        'https://raw.githubusercontent.com/yehtutbo/iptvmm/main/channels.m3u',
    ],
};

function parseM3U(text) {
    const lines = String(text).split(/\r?\n/);
    const channels = [];
    let cur = null;
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (line.startsWith('#EXTINF')) {
            const name = (line.split(',').pop() || '').trim() || 'Channel';
            const logo = (line.match(/tvg-logo="([^"]*)"/) || [])[1] || '';
            const group = (line.match(/group-title="([^"]*)"/) || [])[1] || 'General';
            const id = (line.match(/tvg-id="([^"]*)"/) || [])[1] || '';
            cur = { name, logo, group, id };
        } else if (line.startsWith('#')) {
            continue;
        } else if (cur) {
            cur.url = line;
            channels.push(cur);
            cur = null;
        }
    }
    return channels;
}

async function fetchPlaylist(urls) {
    let lastError = 'No sources';
    for (const url of urls) {
        try {
            const resp = await fetch(url, { headers: { 'User-Agent': UA } });
            if (!resp.ok) { lastError = 'HTTP ' + resp.status; continue; }
            const text = await resp.text();
            if (text && text.includes('#EXTM3U')) return { text, source: url };
            lastError = 'Invalid playlist';
        } catch (e) {
            lastError = e.message;
        }
    }
    throw new Error(lastError);
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const params = url.searchParams;
    const country = (params.get('country') || 'mm').toLowerCase();
    const group = (params.get('group') || '').trim();
    const q = (params.get('q') || '').trim().toLowerCase();

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
        const urls = params.get('url') ? [params.get('url')] : (PLAYLISTS[country] || []);
        if (!urls.length) {
            return Response.json({ success: false, error: 'Unknown country: ' + country }, { status: 400, headers: cors });
        }

        const { text, source } = await fetchPlaylist(urls);
        const all = parseM3U(text).filter(c => c.url);
        let channels = all;
        if (group) channels = channels.filter(c => (c.group || '').toLowerCase() === group.toLowerCase());
        if (q) channels = channels.filter(c => (c.name || '').toLowerCase().includes(q));
        const groups = [...new Set(all.map(c => c.group).filter(Boolean))].sort();

        const body = JSON.stringify({ success: true, country, source, count: channels.length, groups, channels });
        const resp = new Response(body, {
            status: 200,
            headers: {
                ...cors,
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'public, max-age=1800',
            },
        });
        context.waitUntil(cache.put(cacheKey, resp.clone()));
        return resp;
    } catch (e) {
        return Response.json({ success: false, error: 'Playlist ရယူ၍ မရပါ: ' + e.message }, { status: 502, headers: cors });
    }
}
