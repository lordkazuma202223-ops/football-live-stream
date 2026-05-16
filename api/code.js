// Vercel Serverless Function - Code Wall System
import crypto from 'crypto';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'kazuma2026';
const CODE_SECRET = process.env.CODE_SECRET || 'football2026secret';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'token_secret_2026_football';
const TOKEN_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours per token

// Premium codes: { code, expiresAt }
const premiumCodes = [
    { code: 'PREMIUM1', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'PREMIUM2', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'VIP2026', createdAt: '2026-01-01T00:00:00Z' },
];

let dynamicPremiumCodes = [];

const FREE_WINDOW_MS = 4 * 60 * 60 * 1000;
const PREMIUM_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// === Free Code Generation ===
function generateFreeCode() {
    const window = Math.floor(Date.now() / FREE_WINDOW_MS);
    return crypto.createHash('sha256')
        .update(CODE_SECRET + window)
        .digest('hex')
        .substring(0, 8)
        .toUpperCase();
}

function getFreeCodeExpiry() {
    const window = Math.floor(Date.now() / FREE_WINDOW_MS);
    return new Date((window + 1) * FREE_WINDOW_MS).toISOString();
}

// === Signed Token ===
function generateToken(code, type, expiresAt) {
    const payload = JSON.stringify({ code, type, expiresAt, ts: Date.now() });
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash('sha256').update(TOKEN_SECRET).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(payload, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();
    // token = iv.tag.encrypted (all base64)
    return Buffer.concat([iv, tag, Buffer.from(encrypted, 'base64')]).toString('base64url');
}

function verifyToken(tokenStr) {
    try {
        const raw = Buffer.from(tokenStr, 'base64url');
        if (raw.length < 13) return null; // 12 iv + at least 1 byte
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const encrypted = raw.subarray(28);
        const key = crypto.createHash('sha256').update(TOKEN_SECRET).digest();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        const payload = JSON.parse(decrypted);
        // Check token expiry (not code expiry)
        if (Date.now() - payload.ts > TOKEN_EXPIRY_MS) return null;
        // Check code still valid
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
            if (now < expiresAt) {
                return { valid: true, type: 'premium', expiresAt: new Date(expiresAt).toISOString() };
            }
        }
    }
    for (const pc of dynamicPremiumCodes) {
        if (pc.code === code) {
            const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
            if (now < expiresAt) {
                return { valid: true, type: 'premium', expiresAt: new Date(expiresAt).toISOString() };
            }
        }
    }
    return { valid: false };
}

function validateCode(code) {
    if (!code) return { valid: false };
    const upper = code.toUpperCase().trim();
    const currentFree = generateFreeCode();
    if (upper === currentFree) {
        const expiresAt = getFreeCodeExpiry();
        return { valid: true, type: 'free', expiresAt };
    }
    const premiumResult = isPremiumCodeValid(upper);
    if (premiumResult.valid) return premiumResult;
    return { valid: false };
}

// === Admin Helpers ===
function getAllActiveCodes() {
    const now = Date.now();
    const codes = [{ code: generateFreeCode(), type: 'free', expiresAt: getFreeCodeExpiry() }];
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

function generatePremiumCode() {
    const code = 'PRM' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const entry = { code, createdAt: new Date().toISOString() };
    dynamicPremiumCodes.push(entry);
    const expiresAt = new Date(entry.createdAt).getTime() + PREMIUM_DURATION_MS;
    return { code, type: 'premium', expiresAt: new Date(expiresAt).toISOString() };
}

function deleteCode(code) {
    const upper = code.toUpperCase().trim();
    const idx = dynamicPremiumCodes.findIndex(c => c.code === upper);
    if (idx !== -1) { dynamicPremiumCodes.splice(idx, 1); return true; }
    return false;
}

// === Handler ===
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { action, code, token } = req.query;

            // Validate code → returns signed token
            if (action === 'validate') {
                if (!code) return res.status(400).json({ error: 'Missing code parameter' });
                const result = validateCode(code);
                if (result.valid) {
                    result.token = generateToken(code, result.type, result.expiresAt);
                }
                return res.status(200).json(result);
            }

            // Check if token is valid (used by player page)
            if (action === 'check') {
                if (!token) return res.status(200).json({ valid: false });
                const payload = verifyToken(token);
                if (payload) {
                    return res.status(200).json({ valid: true, type: payload.type });
                }
                return res.status(200).json({ valid: false });
            }

            // Admin: list all codes
            if (action === 'codes') {
                const secret = req.headers['x-admin-secret'];
                if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });
                return res.status(200).json({ codes: getAllActiveCodes() });
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const { action, code, type, secret } = body;

            if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

            if (action === 'generate') {
                if (type === 'premium') {
                    return res.status(200).json({ success: true, ...generatePremiumCode() });
                } else if (type === 'free') {
                    return res.status(200).json({ success: true, code: generateFreeCode(), type: 'free', expiresAt: getFreeCodeExpiry() });
                }
                return res.status(400).json({ error: 'Invalid type' });
            }

            if (action === 'delete') {
                if (!code) return res.status(400).json({ error: 'Missing code' });
                return res.status(200).json({ success: deleteCode(code) });
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
