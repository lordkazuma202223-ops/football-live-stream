// Cloudflare Pages Function - CORS Proxy
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return Response.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=30',
        'Content-Type': 'text/html; charset=utf-8',
    };

    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const resp = await fetch(targetUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': 'https://sport99.live/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        const html = await resp.text();
        return new Response(html, { status: 200, headers: corsHeaders });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
