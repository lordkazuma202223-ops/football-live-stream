// Cloudflare Pages Function - SportSRC API Proxy with Token Gate + Backup Key + Cache

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

// Cache durations based on match status
function getCacheTTL(params) {
    const status = params.get('status') || '';
    if (status === 'inprogress') return 60;        // Live: 1 minute
    if (status === 'upcoming') return 300;          // Upcoming: 5 minutes
    if (status === 'finished') return 3600;         // Finished: 1 hour
    return 120;                                      // All matches: 2 minutes
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

    // Token gate for detail requests
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

    // --- Cache Layer ---
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cache = caches.default;

    // Force refresh: skip cache if _t param present (user manual refresh)
    const forceRefresh = params.has('_t');
    if (forceRefresh) params.delete('_t');

    if (!forceRefresh) {
        try {
            const cached = await cache.match(cacheKey);
            if (cached) {
                const cachedHeaders = new Headers(cached.headers);
                const age = Math.floor((Date.now() - parseInt(cachedHeaders.get('x-cache-time') || '0')) / 1000);
                const ttl = parseInt(cachedHeaders.get('x-cache-ttl') || '120');
                if (age < ttl) {
                    // Cache hit - return cached response
                    const resp = new Response(cached.body, {
                        status: cached.status,
                        headers: cachedHeaders
                    });
                    resp.headers.set('X-Cache', 'HIT');
                    resp.headers.set('X-Cache-Age', age + 's');
                    resp.headers.set('X-Cache-TTL', ttl + 's');
                    return resp;
                }
            }
        } catch (e) {}
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
            if (data && data.trim()) {
                try {
                    const json = JSON.parse(data);
                    const errMsg = (json.error || json.message || '').toLowerCase();
                    if (!json.success && (errMsg.includes('limit') || errMsg.includes('token') || errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('error'))) {
                        lastError = json.error || json.message;
                        continue;
                    }
                } catch {}

                // Store in cache with TTL
                const ttl = getCacheTTL(params);
                const cacheResponse = new Response(data, {
                    status: 200,
                    headers: {
                        ...corsAndJson,
                        'Cache-Control': 'public, max-age=' + ttl,
                        'X-Cache': 'MISS',
                        'X-Cache-Time': Date.now().toString(),
                        'X-Cache-TTL': ttl.toString(),
                    }
                });

                // Put in Cloudflare Cache (wait for it)
                try {
                    await cache.put(cacheKey, cacheResponse.clone());
                } catch (e) {}

                return cacheResponse;
            }
            lastError = 'Empty response from API';
        } catch (e) {
            lastError = e.message;
        }
    }
    return Response.json({ success: false, error: 'API keys အားလုံး limit ရောက်နေပါသည်။ ခဏခဏ ပြန်စမ်းကြည့်ပါ။', detail: lastError }, { status: 429, headers: corsAndJson });
}
