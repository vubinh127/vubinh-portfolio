(function () {
    'use strict';

    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
    const root = document.documentElement;

    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };

    const UI = {
        vi: {
            more: 'Xem thêm', less: 'Thu gọn'
        },
        en: {
            more: 'Read more', less: 'Show less'
        }
    };
    let lang = store.get('lang') === 'en' ? 'en' : 'vi';

    function applyLang(next) {
        lang = next;
        root.lang = lang;
        $$('.t').forEach(el => {
            const text = el.dataset[lang];
            if (text) el.innerHTML = text;
        });
        $$('#lang-toggle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
        $$('.more-btn').forEach(b => b.updateLabel());
        store.set('lang', lang);
        requestAnimationFrame(refreshClamps);
    }

    $$('#lang-toggle button').forEach(b =>
        b.addEventListener('click', () => { if (b.dataset.lang !== lang) applyLang(b.dataset.lang); })
    );

    $('#theme-toggle').addEventListener('click', () => {
        const current = root.dataset.mode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const next = current === 'dark' ? 'light' : 'dark';
        root.dataset.mode = next;
        store.set('theme', next);
    });

    const clamps = $$('.clamp');
    clamps.forEach(el => {
        el.style.setProperty('--lines', el.dataset.lines || 3);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'more-btn';
        btn.setAttribute('aria-expanded', 'false');
        btn.updateLabel = () => {
            const open = el.classList.contains('open');
            btn.textContent = UI[lang][open ? 'less' : 'more'];
            btn.setAttribute('aria-expanded', String(open));
        };
        btn.addEventListener('click', () => { el.classList.toggle('open'); btn.updateLabel(); });
        btn.updateLabel();
        el.after(btn);
        el._btn = btn;
    });

    function refreshClamps() {
        clamps.forEach(el => {
            if (el.classList.contains('open')) return;
            el._btn.hidden = el.scrollHeight <= el.clientHeight + 2;
        });
    }

    const navLinks = $$('#nav a');
    const watched = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const navObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = '#' + entry.target.id;
            navLinks.forEach(a => {
                if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    watched.forEach(s => navObserver.observe(s));

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refreshClamps, 120);
    });

    applyLang(lang);
    window.addEventListener('load', refreshClamps);
})();
