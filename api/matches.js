// Vercel Serverless Function - SportSRC API Proxy with Token Gate
import crypto from 'crypto';

const API_KEY = '1646b557918b959551995d03415e74b5';
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
        const type = params.get('type');

        // Gate: detail endpoint requires valid token
        if (type === 'detail') {
            const token = params.get('token');
            if (!token) {
                return res.status(403).json({
                    success: false,
                    error: 'Token required. Enter a code on the home page first.'
                });
            }
            const payload = verifyToken(token);
            if (!payload) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid or expired token. Please re-enter your code.'
                });
            }
            // Token valid — remove from params before forwarding to API
            params.delete('token');
        }

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
