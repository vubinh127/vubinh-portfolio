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

    // Theme switch: the new theme expands as a circle from the toggle button (View Transitions API).
    // Falls back to an instant switch when unsupported or when the user prefers reduced motion.
    let themeTransition = null;
    const themeBtn = $('#theme-toggle');
    themeBtn.addEventListener('click', () => {
        const current = root.dataset.mode || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const next = current === 'dark' ? 'light' : 'dark';
        const change = () => { root.dataset.mode = next; store.set('theme', next); };

        if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return change();
        if (themeTransition) { try { themeTransition.skipTransition(); } catch (e) {} }

        const r = themeBtn.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

        // Freeze CSS colour transitions so the "new" snapshot already has the final colours;
        // otherwise elements with `transition: background-color/color` get captured mid-fade (still old theme).
        root.classList.add('theme-switching');
        const vt = themeTransition = document.startViewTransition(change);
        vt.ready.then(() => root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
        )).catch(() => {});
        vt.finished.finally(() => {
            if (themeTransition === vt) { themeTransition = null; root.classList.remove('theme-switching'); }
        });
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
