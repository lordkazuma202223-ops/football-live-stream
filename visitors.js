/* ============================================================
   Visitor identity + session log (Supabase)
   ------------------------------------------------------------
   - Asks the visitor for their name once (kept in localStorage)
   - Writes ONE row per browser session: name, device, timestamp
     (not on every reload - sessionStorage guards duplicate rows)
   - Exposes window.BZVisitors.list() for the users page
   ============================================================ */
(function () {
    'use strict';

    var CFG = window.SUPABASE_CONFIG || {};
    var NAME_KEY = 'bz_name';
    var SESSION_KEY = 'bz_session';

    function configured() {
        return !!(CFG.url && CFG.anonKey && /^https?:\/\//.test(CFG.url));
    }

    function restHeaders(extra) {
        var h = {
            'apikey': CFG.anonKey,
            'Authorization': 'Bearer ' + CFG.anonKey,
            'Content-Type': 'application/json'
        };
        if (extra) { for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) h[k] = extra[k]; } }
        return h;
    }

    function endpoint(query) {
        return String(CFG.url).replace(/\/+$/, '') + '/rest/v1/' + (CFG.table || 'visitors') + (query || '');
    }

    function deviceName() {
        var ua = navigator.userAgent || '';
        var os = 'Unknown device';
        if (/Windows/i.test(ua)) os = 'Windows';
        else if (/iPhone/i.test(ua)) os = 'iPhone';
        else if (/iPad/i.test(ua)) os = 'iPad';
        else if (/Android/i.test(ua)) os = 'Android';
        else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac';
        else if (/CrOS/i.test(ua)) os = 'ChromeOS';
        else if (/Linux/i.test(ua)) os = 'Linux';
        var br = 'browser';
        if (/Edg\//i.test(ua)) br = 'Edge';
        else if (/OPR\/|Opera/i.test(ua)) br = 'Opera';
        else if (/Chrome\//i.test(ua)) br = 'Chrome';
        else if (/Firefox\//i.test(ua)) br = 'Firefox';
        else if (/Safari\//i.test(ua)) br = 'Safari';
        return os + ' \u00b7 ' + br;
    }

    function getName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
    function setName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (e) { } }

    function logSession(name) {
        if (!configured() || !name) return Promise.resolve();
        try { if (sessionStorage.getItem(SESSION_KEY)) return Promise.resolve(); } catch (e) { }
        return fetch(endpoint(), {
            method: 'POST',
            headers: restHeaders({ 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ name: name, device: deviceName() })
        }).then(function (res) {
            if (res.ok) { try { sessionStorage.setItem(SESSION_KEY, String(Date.now())); } catch (e) { } }
        }).catch(function () { });
    }

    function list(limit) {
        if (!configured()) return Promise.reject(new Error('not-configured'));
        var q = '?select=id,name,device,created_at&order=created_at.desc&limit=' + (limit || 300);
        return fetch(endpoint(q), { headers: restHeaders() }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        });
    }

    /* ---------- name modal ---------- */
    var USER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    function openModal() {
        var existing = document.getElementById('bz-login');
        if (existing) existing.parentNode.removeChild(existing);

        var wrap = document.createElement('div');
        wrap.className = 'overlay';
        wrap.id = 'bz-login';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.innerHTML =
            '<div class="modal login-modal">' +
                '<div class="login-icon">' + USER_ICON + '</div>' +
                '<h2 class="login-title">မင်္ဂလာပါ</h2>' +
                '<p class="login-sub">သင့်နာမည်ကို ရေးထည့်ပါ — ကြည့်ရှုသူများ စာရင်းအတွက်</p>' +
                '<input class="login-input" id="bz-name-input" type="text" maxlength="30" placeholder="နာမည်" autocomplete="name" spellcheck="false">' +
                '<div class="login-error" id="bz-name-error"></div>' +
                '<button class="btn btn-primary login-btn" id="bz-name-submit" type="button">စတင်ကြည့်ရန်</button>' +
            '</div>';

        document.body.appendChild(wrap);
        requestAnimationFrame(function () { wrap.classList.add('active'); });

        var input = wrap.querySelector('#bz-name-input');
        var err = wrap.querySelector('#bz-name-error');
        var btn = wrap.querySelector('#bz-name-submit');
        input.value = getName();

        function submit() {
            var name = (input.value || '').trim().replace(/\s+/g, ' ');
            if (name.length < 2) { err.textContent = 'အနည်းဆုံး ၂ လုံး ရေးထည့်ပါ'; input.focus(); return; }
            if (name.length > 30) name = name.slice(0, 30);
            err.textContent = '';
            btn.disabled = true;
            setName(name);
            Promise.resolve(logSession(name)).then(function () {
                renderChip(name);
                wrap.classList.remove('active');
                setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 220);
            });
        }

        btn.addEventListener('click', submit);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        setTimeout(function () { input.focus(); }, 220);
    }

    /* ---------- header chip ---------- */
    function initials(name) {
        var p = String(name || '?').trim().split(/\s+/);
        var a = (p[0] || '?').charAt(0);
        var b = p.length > 1 ? p[1].charAt(0) : '';
        return (a + b).toUpperCase();
    }

    function renderChip(name) {
        if (!name) return;
        var right = document.querySelector('.header-right');
        if (!right) return;
        var chip = document.getElementById('bz-user-chip');
        if (!chip) {
            chip = document.createElement('button');
            chip.id = 'bz-user-chip';
            chip.className = 'user-chip';
            chip.title = 'နာမည် ပြောင်းရန်';
            chip.addEventListener('click', function () { openModal(); });
            right.appendChild(chip);
        }
        chip.innerHTML = '<span class="user-avatar">' + initials(name) +
            '</span><span class="user-chip-name">' + String(name).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</span>';
    }

    function boot() {
        var name = getName();
        if (name) { renderChip(name); logSession(name); }
        else { openModal(); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    window.BZVisitors = {
        list: list,
        configured: configured,
        deviceName: deviceName,
        open: openModal
    };
})();
