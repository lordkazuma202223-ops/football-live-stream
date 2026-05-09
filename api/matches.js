// Vercel Serverless Function - SportSRC API Proxy
const API_KEY = '1646b557918b959551995d03415e74b5';
const API_BASE = 'https://api.sportsrc.org/v2/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export default async function handler(req, res) {
    try {
        const params = new URLSearchParams(req.query);
        params.set('api_key', API_KEY);
        const url = API_BASE + '?' + params.toString();

        const response = await fetch(url, {
            headers: { 'User-Agent': UA, 'X-API-KEY': API_KEY }
        });
        const data = await response.text();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
