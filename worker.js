// Cloudflare Worker - Football Live Stream (All-in-One Bundle)
// Auto-generated from functions/api/*

// Cloudflare Pages Function - SportSRC API Proxy with Token Gate + Backup Key

const API_KEYS=***
    '1646b557918b959551995d03415e74b5',
    'ed5e2ba05923ceb4ab2aca57e8aa94c3',
];
const API_BASE = 'https://api.sportsrc.org/v2/';
const TOKEN_SECRET='token_...ball';

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

async function handleMatches(context) {
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

// Cloudflare Pages Function - Code Wall System (Web Crypto API)
// No Node.js crypto — uses standard Web Crypto API

const ADMIN_SECRET='***';
const CODE_SECRET='footba...cret';
const TOKEN_SECRET='token_...ball';
const TOKEN_EXPIRY_MS=*** * 60 * 60 * 1000;

// Static premium codes
const premiumCodes = [
    { code: 'PREMIUM1', createdAt: '2026-05-01T00:00:00Z' },
    { code: 'PREMIUM2', createdAt: '2026-05-01T00:00:00Z' },
    { code: 'VIP2026', createdAt: '2026-05-01T00:00:00Z' },
];

let dynamicPremiumCodes = [];

const FREE_WINDOW_MS = 4 * 60 * 60 * 1000;
const PREMIUM_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// === Web Crypto Helpers ===
function encode(str) { return new TextEncoder().encode(str); }
function decode(buf) { return new TextDecoder().decode(buf); }

function randomHex(bytes) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return [...arr].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function randomBytes(bytes) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return arr;
}

function toBase64Url(buf) {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function sha256(str) {
    const hash = await crypto.subtle.digest('SHA-256', encode(str));
    return new Uint8Array(hash);
}

// === Free Code Generation ===
function generateFreeCode() {
    // Synchronous SHA-256 not available in Web Crypto, use a trick:
    // We precompute using a simple hash since we can't do async in sync context
    // Instead, we'll make this async
    throw new Error('Use generateFreeCodeAsync instead');
}

// Since Web Crypto is async, we need async free code generation
async function generateFreeCodeAsync() {
    const window = Math.floor(Date.now() / FREE_WINDOW_MS);
    const hash = await sha256(CODE_SECRET + window);
    // Take first 4 bytes (8 hex chars)
    return [...hash.slice(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function getFreeCodeExpiry() {
    const window = Math.floor(Date.now() / FREE_WINDOW_MS);
    return new Date((window + 1) * FREE_WINDOW_MS).toISOString();
}

// === Signed Token (AES-256-GCM via Web Crypto) ===
async function generateToken(code, type, expiresAt) {
    const payload = JSON.stringify({ code, type, expiresAt, ts: Date.now() });
    const iv = randomBytes(12);
    const keyData = await sha256(TOKEN_SECRET);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encode(payload));
    // Format: iv(12 bytes) + encrypted(ciphertext + tag)
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return toBase64Url(combined);
}

async function verifyToken(tokenStr) {
    try {
        const raw = fromBase64Url(tokenStr);
        if (raw.length < 29) return null; // 12 iv + 16 tag + at least 1 byte data
        const iv = raw.slice(0, 12);
        const encryptedWithTag = raw.slice(12); // Web Crypto expects ciphertext + tag together
        const keyData = await sha256(TOKEN_SECRET);
        const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encryptedWithTag);
        const payload = JSON.parse(decode(decrypted));
        if (Date.now() - payload.ts > TOKEN_EXPIRY_MS) return null;
        if (payload.expiresAt && Date.now() > new Date(payload.expiresAt).getTime()) return null;
        return payload;
    } catch {
        return null;
    }
}

// === Code Validation ===
function isPremiumCodeValid(code) {
    const now = Date.now();
    for (const pc of premiumCodes) {
        if (pc.code === code) {
            const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
            if (now < expiresAt) return { valid: true, type: 'premium', expiresAt: new Date(expiresAt).toISOString() };
        }
    }
    for (const pc of dynamicPremiumCodes) {
        if (pc.code === code) {
            const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
            if (now < expiresAt) return { valid: true, type: 'premium', expiresAt: new Date(expiresAt).toISOString() };
        }
    }
    return { valid: false };
}

async function validateCode(code) {
    if (!code) return { valid: false };
    const upper = code.toUpperCase().trim();
    const currentFree = await generateFreeCodeAsync();
    if (upper === currentFree) {
        return { valid: true, type: 'free', expiresAt: getFreeCodeExpiry() };
    }
    const premiumResult = isPremiumCodeValid(upper);
    if (premiumResult.valid) return premiumResult;
    return { valid: false };
}

// === Admin Helpers ===
async function getAllActiveCodes() {
    const codes = [{ code: await generateFreeCodeAsync(), type: 'free', expiresAt: getFreeCodeExpiry() }];
    const now = Date.now();
    for (const pc of premiumCodes) {
        const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
        if (now < expiresAt) codes.push({ code: pc.code, type: 'premium', expiresAt: new Date(expiresAt).toISOString() });
    }
    for (const pc of dynamicPremiumCodes) {
        const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
        if (now < expiresAt) codes.push({ code: pc.code, type: 'premium', expiresAt: new Date(expiresAt).toISOString() });
    }
    return codes;
}

async function generatePremiumCodeAction() {
    const code = 'PRM' + randomHex(4);
    const entry = { code, createdAt: new Date().toISOString() };
    dynamicPremiumCodes.push(entry);
    const expiresAt = new Date(entry.createdAt).getTime() + PREMIUM_DURATION_MS;
    return { code, type: 'premium', expiresAt: new Date(expiresAt).toISOString() };
}

async function deleteCodeAction(code) {
    const upper = code.toUpperCase().trim();
    const idx = dynamicPremiumCodes.findIndex(c => c.code === upper);
    if (idx !== -1) { dynamicPremiumCodes.splice(idx, 1); return true; }
    return false;
}

// === Handler ===
async function handleCode(context) {
    const request = context.request;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const url = new URL(request.url);

        if (request.method === 'GET') {
            const action = url.searchParams.get('action');
            const code = url.searchParams.get('code');
            const token = url.searchParams.get('token');

            if (action === 'validate') {
                if (!code) return Response.json({ error: 'Missing code' }, { status: 400, headers: corsHeaders });
                const result = await validateCode(code);
                if (result.valid) {
                    result.token = await generateToken(code, result.type, result.expiresAt);
                }
                return Response.json(result, { headers: corsHeaders });
            }

            if (action === 'check') {
                if (!token) return Response.json({ valid: false }, { headers: corsHeaders });
                const payload = await verifyToken(token);
                return Response.json(payload ? { valid: true, type: payload.type } : { valid: false }, { headers: corsHeaders });
            }

            if (action === 'codes') {
                const secret = request.headers.get('x-admin-secret');
                if (secret !== ADMIN_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 403, headers: corsHeaders });
                return Response.json({ codes: await getAllActiveCodes() }, { headers: corsHeaders });
            }

            return Response.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
        }

        if (request.method === 'POST') {
            const body = await request.json();
            const { action, code, type, secret } = body;

            if (secret !== ADMIN_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 403, headers: corsHeaders });

            if (action === 'generate') {
                if (type === 'premium') {
                    const result = await generatePremiumCodeAction();
                    return Response.json({ success: true, ...result }, { headers: corsHeaders });
                } else if (type === 'free') {
                    return Response.json({ success: true, code: await generateFreeCodeAsync(), type: 'free', expiresAt: getFreeCodeExpiry() }, { headers: corsHeaders });
                }
                return Response.json({ error: 'Invalid type' }, { status: 400, headers: corsHeaders });
            }

            if (action === 'delete') {
                if (!code) return Response.json({ error: 'Missing code' }, { status: 400, headers: corsHeaders });
                return Response.json({ success: await deleteCodeAction(code) }, { headers: corsHeaders });
            }

            return Response.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
        }

        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
}

// Cloudflare Pages Function - Stream URL Extractor
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function handleStream(context) {
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

// Cloudflare Pages Function - CORS Proxy
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function handleProxy(context) {
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

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const context = { request, env, ctx };

        // API routes
        if (path === '/api/matches') return handleMatches(context);
        if (path === '/api/code') return handleCode(context);
        if (path === '/api/stream') return handleStream(context);
        if (path === '/api/proxy') return handleProxy(context);

        // Static assets handled by Cloudflare via assets config
        return new Response('Not Found', { status: 404 });
    }
};
