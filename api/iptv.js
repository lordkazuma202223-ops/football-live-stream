// Vercel Serverless Function - IPTV playlist proxy + parser
// Fetches a public M3U playlist (default: Myanmar) from GitHub-hosted sources,
// parses it into JSON channels so the browser avoids CORS / mixed-content issues.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Community-maintained Myanmar channel lists (GitHub).
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
            continue; // skip comments / #EXTVLCOPT / #KODIPROP
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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const country = (req.query.country || 'mm').toLowerCase();
    const group = (req.query.group || '').trim();
    const q = (req.query.q || '').trim().toLowerCase();

    try {
        const urls = req.query.url ? [req.query.url] : (PLAYLISTS[country] || []);
        if (!urls.length) {
            return res.status(400).json({ success: false, error: 'Unknown country: ' + country });
        }

        const { text, source } = await fetchPlaylist(urls);
        let channels = parseM3U(text).filter(c => c.url);

        if (group) channels = channels.filter(c => (c.group || '').toLowerCase() === group.toLowerCase());
        if (q) channels = channels.filter(c => (c.name || '').toLowerCase().includes(q));

        const groups = [...new Set(parseM3U(text).map(c => c.group).filter(Boolean))].sort();

        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
        return res.status(200).json({
            success: true,
            country,
            source,
            count: channels.length,
            groups,
            channels,
        });
    } catch (e) {
        return res.status(502).json({ success: false, error: 'Playlist ရယူ၍ မရပါ: ' + e.message });
    }
}
