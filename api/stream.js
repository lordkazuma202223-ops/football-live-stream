// Vercel Serverless Function - Extract m3u8 Stream URLs (Ad-Free)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export default async function handler(req, res) {
    const { id, source = 'rapid' } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Missing match id' });
    }

    try {
        // Step 1: Fetch embed page → get stream.php URL with token
        const embedUrl = `https://sport99.live/embed/?id=${encodeURIComponent(id)}&source=${encodeURIComponent(source)}`;
        const embedResp = await fetch(embedUrl, {
            headers: { 'User-Agent': UA, 'Referer': 'https://sport99.live/' }
        });
        const embedHtml = await embedResp.text();

        // Extract stream.php path
        const streamMatch = embedHtml.match(/stream\.php\?[^"\\]+/);
        if (!streamMatch) {
            return res.status(404).json({ 
                error: 'No stream URL found', 
                debug_embed_length: embedHtml.length,
                debug_embed_preview: embedHtml.substring(0, 300)
            });
        }

        const streamPath = streamMatch[0].replace(/&amp;/g, '&');
        const streamUrl = `https://sport99.live/embed/${streamPath}`;

        // Step 2: Fetch stream.php → extract m3u8 URLs
        const streamResp = await fetch(streamUrl, {
            headers: { 'User-Agent': UA, 'Referer': 'https://sport99.live/embed/' }
        });
        const streamHtml = await streamResp.text();

        // Check if blocked
        if (streamHtml.includes('ACCESS DENIED') || streamHtml.includes('API ERROR')) {
            // Fallback: try fetching the full HTML with all sources
            // Try alternative approach: use the iframe embed URL directly
            return res.status(200).json({
                success: false,
                error: 'Stream source blocked - using fallback',
                embed_fallback: embedUrl,
                debug_stream_status: streamResp.status,
                debug_stream_preview: streamHtml.substring(0, 300)
            });
        }

        // Extract all m3u8 URLs
        const m3u8Regex = /https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g;
        const m3u8Urls = [...new Set(streamHtml.match(m3u8Regex) || [])];

        if (!m3u8Urls.length) {
            return res.status(404).json({ 
                error: 'No m3u8 URLs found',
                debug_stream_length: streamHtml.length,
                debug_stream_preview: streamHtml.substring(0, 500)
            });
        }

        // Classify HD/SD
        const hd = m3u8Urls.filter(u => u.includes('_lhd') || u.includes('_hd'));
        const sd = m3u8Urls.filter(u => u.includes('_lsd') || u.includes('_sd'));
        const otherSd = m3u8Urls.filter(u => !u.includes('_lhd') && !u.includes('_hd'));
        const allSd = [...sd, ...otherSd];

        const best = (hd.length ? hd : allSd)[0];

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=300');
        return res.status(200).json({
            success: true,
            match_id: id,
            best,
            hd: hd.slice(0, 3),
            sd: allSd.slice(0, 3),
            total: m3u8Urls.length
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
