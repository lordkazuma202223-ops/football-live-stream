// Vercel Serverless Function - Code Wall System
import crypto from 'crypto';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'kazuma2026';
const CODE_SECRET = process.env.CODE_SECRET || 'football2026secret';

// Premium codes: { code, expiresAt } - expiresAt is ISO string
// These persist across redeployments (hard-coded). Admin can add more via POST.
const premiumCodes = [
    { code: 'PREMIUM1', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'PREMIUM2', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'VIP2026', createdAt: '2026-01-01T00:00:00Z' },
];

// In-memory store for dynamically generated premium codes (lost on cold start, that's OK)
let dynamicPremiumCodes = [];

const FREE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours
const PREMIUM_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

function isPremiumCodeValid(code) {
    // Check static premium codes
    const now = Date.now();
    for (const pc of premiumCodes) {
        if (pc.code === code) {
            const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
            if (now < expiresAt) {
                return { valid: true, type: 'premium', expiresAt: new Date(expiresAt).toISOString() };
            }
        }
    }
    // Check dynamic premium codes
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

    // Check free code
    const currentFree = generateFreeCode();
    if (upper === currentFree) {
        return { valid: true, type: 'free', expiresAt: getFreeCodeExpiry() };
    }

    // Check premium codes
    const premiumResult = isPremiumCodeValid(upper);
    if (premiumResult.valid) return premiumResult;

    return { valid: false };
}

function getAllActiveCodes() {
    const now = Date.now();
    const codes = [];

    // Current free code
    codes.push({
        code: generateFreeCode(),
        type: 'free',
        expiresAt: getFreeCodeExpiry()
    });

    // Active static premium codes
    for (const pc of premiumCodes) {
        const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
        if (now < expiresAt) {
            codes.push({ code: pc.code, type: 'premium', expiresAt: new Date(expiresAt).toISOString() });
        }
    }

    // Active dynamic premium codes
    for (const pc of dynamicPremiumCodes) {
        const expiresAt = new Date(pc.createdAt).getTime() + PREMIUM_DURATION_MS;
        if (now < expiresAt) {
            codes.push({ code: pc.code, type: 'premium', expiresAt: new Date(expiresAt).toISOString() });
        }
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
    if (idx !== -1) {
        dynamicPremiumCodes.splice(idx, 1);
        return true;
    }
    return false;
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { action, code } = req.query;

            if (action === 'validate') {
                if (!code) {
                    return res.status(400).json({ error: 'Missing code parameter' });
                }
                return res.status(200).json(validateCode(code));
            }

            if (action === 'codes') {
                const secret = req.headers['x-admin-secret'];
                if (secret !== ADMIN_SECRET) {
                    return res.status(403).json({ error: 'Unauthorized' });
                }
                return res.status(200).json({ codes: getAllActiveCodes() });
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const { action, code, type, secret } = body;

            if (secret !== ADMIN_SECRET) {
                return res.status(403).json({ error: 'Unauthorized - invalid secret' });
            }

            if (action === 'generate') {
                if (type === 'premium') {
                    const result = generatePremiumCode();
                    return res.status(200).json({ success: true, ...result });
                } else if (type === 'free') {
                    // Return current free code info
                    return res.status(200).json({
                        success: true,
                        code: generateFreeCode(),
                        type: 'free',
                        expiresAt: getFreeCodeExpiry()
                    });
                }
                return res.status(400).json({ error: 'Invalid type. Use "free" or "premium"' });
            }

            if (action === 'delete') {
                if (!code) {
                    return res.status(400).json({ error: 'Missing code parameter' });
                }
                const deleted = deleteCode(code);
                return res.status(200).json({ success: deleted, message: deleted ? 'Code deleted' : 'Code not found in dynamic store' });
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
