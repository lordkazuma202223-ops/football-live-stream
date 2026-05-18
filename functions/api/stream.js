// Cloudflare Pages Function - Stream URL Extractor
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    const source = url.searchParams.get('source') || 'rapid';

    const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (!id) {
        return Response.json({ error: 'Missing match id' }, { status: 400, headers: corsHeaders });
    }

    try {
        const embedUrl = `https://sport99.live/embed/?id=${encodeURIComponent(id)}&source=${encodeURIComponent(source)}`;
        const embedResp = await fetch(embedUrl, {
            headers: { 'User-Agent': UA, 'Referer': 'https://sport99.live/' }
        });
        const embedHtml = await embedResp.text();

        const streamMatch = embedHtml.match(/stream\.php\?[\"\\]+/);
        if (!streamMatch) {
            return Response.json({
                error: 'No stream URL found',
                debug_embed_length: embedHtml.length,
                debug_embed_preview: embedHtml.substring(0, 300)
            }, { status: 404, headers: corsHeaders });
        }

        const streamPath = streamMatch[0].replace(/&amp;/g, '&');
        const streamUrl = `https://sport99.live/embed/${streamPath}`;

        const streamResp = await fetch(streamUrl, {
            headers: { 'User-Agent': UA, 'Referer': 'https://sport99.live/embed/' }
        });
        const streamHtml = await streamResp.text();

        if (streamHtml.includes('ACCESS DENIED') || streamHtml.includes('API ERROR')) {
            return Response.json({
                success: false,
                error: 'Stream source blocked',
                embed_fallback: embedUrl
            }, { headers: corsHeaders });
        }

        const m3u8Regex = /https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/g;
        const m3u8Urls = [...new Set(streamHtml.match(m3u8Regex) || [])];

        if (!m3u8Urls.length) {
            return Response.json({
                error: 'No m3u8 URLs found',
                debug_stream_length: streamHtml.length,
                debug_stream_preview: streamHtml.substring(0, 500)
            }, { status: 404, headers: corsHeaders });
        }

        const hd = m3u8Urls.filter(u => u.includes('_lhd') || u.includes('_hd'));
        const sd = m3u8Urls.filter(u => u.includes('_lsd') || u.includes('_sd'));
        const otherSd = m3u8Urls.filter(u => !u.includes('_lhd') && !u.includes('_hd'));
        const allSd = [...sd, ...otherSd];
        const best = (hd.length ? hd : allSd)[0];

        return Response.json({
            success: true,
            match_id: id,
            best,
            hd: hd.slice(0, 3),
            sd: allSd.slice(0, 3),
            total: m3u8Urls.length
        }, { headers: { ...corsHeaders, 'Cache-Control': 's-maxage=300' } });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
}
