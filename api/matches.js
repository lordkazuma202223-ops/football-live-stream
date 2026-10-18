// Vercel Serverless Function - SportSRC API Proxy with Token Gate + Backup Key
import crypto from 'crypto';

const API_KEYS = [
    '1646b557918b959551995d03415e74b5',
    'ed5e2ba05923ceb4ab2aca57e8aa94c3',
];
const API_BASE = 'https://api.sportsrc.org/v2/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'token_secret_2026_football';

function verifyToken(tokenStr) {
    try {
        const raw = Buffer.from(tokenStr, 'base64url');
        if (raw.length < 13) return null;
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const encrypted = raw.subarray(28);
        const key = crypto.createHash('sha256').update(TOKEN_SECRET).digest();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        const payload = JSON.parse(decrypted);
        // Check token age (4 hours)
        if (Date.now() - payload.ts > 4 * 60 * 60 * 1000) return null;
        // Check code expiry
        if (payload.expiresAt && Date.now() > new Date(payload.expiresAt).getTime()) return null;
        return payload;
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    try {
        const params = new URLSearchParams(req.query);
        params.delete('api_key');
        params.delete('token');

        let lastError = null;
        for (const apiKey of API_KEYS) {
            try {
                const p = new URLSearchParams(params.toString());
                p.set('api_key', apiKey);
                const url = API_BASE + '?' + p.toString();

                const response = await fetch(url, {
                    headers: { 'User-Agent': UA, 'X-API-KEY': apiKey }
                });
                const data = await response.text();

                if (data && data.trim()) {
                    try {
                        const json = JSON.parse(data);
                        const errMsg = (json.error || json.message || '').toLowerCase();
                        if (!json.success && (errMsg.includes('limit') || errMsg.includes('token') || errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('error'))) {
                            lastError = json.error || json.message;
                            continue;
                        }
                    } catch {}
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Content-Type', 'application/json');
                    return res.status(200).send(data);
                }
                lastError = 'Empty response';
            } catch (e) {
                lastError = e.message;
            }
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(429).json({ success: false, error: 'API keys အားလုံး limit ရောက်နေပါသည်။ ခဏခဏ ပြန်စမ်းကြည့်ပါ။', detail: lastError });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
