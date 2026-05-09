// Vercel Serverless Function - CORS Proxy for sport99.live
// Proxies requests through Vercel to bypass CORS (but sport99.live may block datacenter IPs)
// Returns the HTML content of the requested URL

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const resp = await fetch(url, {
            headers: {
                'User-Agent': UA,
                'Referer': 'https://sport99.live/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        const html = await resp.text();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=30');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
