// Cloudflare Pages Function - SportSRC API Proxy with Token Gate + Backup Key

const API_KEYS = [
    '1646b557918b959551995d03415e74b5',
    'ed5e2ba05923ceb4ab2aca57e8aa94c3',
];
const API_BASE = 'https://api.sportsrc.org/v2/';
const TOKEN_SECRET = 'token_secret_2026_football';

function encode(str) { return new TextEncoder().encode(str); }
function decode(buf) { return new TextDecoder().decode(buf); }

async function sha256(str) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', encode(str)));
}

async function verifyToken(tokenStr) {
    try {
        const raw = Uint8Array.from(atob(tokenStr.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        if (raw.length < 29) return null;
        const iv = raw.slice(0, 12);
        const encryptedWithTag = raw.slice(12);
        const key = await crypto.subtle.importKey('raw', await sha256(TOKEN_SECRET), { name: 'AES-GCM' }, false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encryptedWithTag);
        const payload = JSON.parse(decode(decrypted));
        if (Date.now() - payload.ts > 4 * 60 * 60 * 1000) return null;
        if (payload.expiresAt && Date.now() > new Date(payload.expiresAt).getTime()) return null;
        return payload;
    } catch { return null; }
}

export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);
    const params = url.searchParams;
    const type = params.get('type');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (type === 'detail') {
        const token = params.get('token');
        if (!token) {
            return Response.json({ success: false, error: 'Token required.' }, { status: 403, headers: corsHeaders });
        }
        const payload = await verifyToken(token);
        if (!payload) {
            return Response.json({ success: false, error: 'Invalid or expired token.' }, { status: 403, headers: corsHeaders });
        }
        params.delete('token');
    }

    params.delete('api_key');
    const corsAndJson = { ...corsHeaders, 'Content-Type': 'application/json' };

    let lastError = null;
    for (const apiKey of API_KEYS) {
        try {
            const p = new URLSearchParams(params.toString());
            p.set('api_key', apiKey);
            const apiUrl = API_BASE + '?' + p.toString();
            const resp = await fetch(apiUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'X-API-KEY': apiKey }
            });
            const data = await resp.text();
            // Check if response is valid (not empty or error from API)
            if (data && data.trim()) {
                try {
                    const json = JSON.parse(data);
                    // If API returns rate limit / token error, try next key
                    if (json.error && (json.error.includes('limit') || json.error.includes('token') || json.error.includes('quota') || json.error.includes('rate'))) {
                        lastError = json.error;
                        continue;
                    }
                } catch {}
                return new Response(data, { status: 200, headers: corsAndJson });
            }
            lastError = 'Empty response from API';
        } catch (e) {
            lastError = e.message;
        }
    }
    return Response.json({ success: false, error: 'API keys အားလုံး limit ရောက်နေပါသည်။ ခဏခဏ ပြန်စမ်းကြည့်ပါ။', detail: lastError }, { status: 429, headers: corsAndJson });
}
