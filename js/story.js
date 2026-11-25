/* Scroll story:
   1. Hero first-view effects (letters, typing, clock, spotlight, code-card tilt)
   2. Horizontal journey: hero + work-experience slides pinned and moved sideways
   3. Header (.bar) hides once the page starts scrolling vertically
   4. Project timeline: sticky milestone bar, active milestone, reveal, parallax
   5. Page progress bar + reveal for the sections below */
(function () {
    'use strict';

    const root = document.documentElement;
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = !reduceMq.matches;
    const pad = n => String(n).padStart(2, '0');
    const t = (vi, en) => '<span class="t" data-vi="' + vi + '" data-en="' + en + '">' + (root.lang === 'en' ? en : vi) + '</span>';

    if (motion) root.classList.add('motion-ready');

    /* Everything that reacts to scroll registers here; one rAF per frame. */
    const onFrame = [];
    let ticking = false;
    const frame = () => { ticking = false; onFrame.forEach(fn => fn()); };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);

    /* ---------------------------------------------------------------- 1. Hero */
    const hero = $('.hs-hero');
    if (hero) {
        // Name: letter-by-letter entrance (screen readers get the plain label).
        const name = $('.hero-name', hero);
        if (name && motion) {
            const dot = $('.hero-dot', name);
            const text = name.firstChild.textContent;
            name.setAttribute('aria-label', text.trim());
            const wrap = document.createElement('span');
            wrap.setAttribute('aria-hidden', 'true');
            [...text].forEach((c, i) => {
                const s = document.createElement('span');
                s.className = c === ' ' ? 'ch sp' : 'ch';
                s.textContent = c;
                s.style.setProperty('--i', i);
                wrap.appendChild(s);
            });
            name.firstChild.replaceWith(wrap);
            if (dot) dot.style.setProperty('--i', text.length);
        }

        // Code lines appear one after another.
        $$('.code .ln', hero).forEach((l, i) => l.style.setProperty('--i', i));

        // Typing role line, follows the VI/EN toggle.
        const type = $('.hero-type', hero);
        if (type) {
            let timer, w = 0;
            const words = () => (type.dataset[root.lang] || type.dataset.vi).split('|');
            const run = () => {
                clearTimeout(timer);
                const list = words();
                if (!motion) { type.textContent = list[0]; return; }
                const word = list[w % list.length];
                let i = 0, del = false;
                const step = () => {
                    if (!del) {
                        type.textContent = word.slice(0, ++i);
                        if (i === word.length) { del = true; timer = setTimeout(step, 1900); return; }
                        timer = setTimeout(step, 55);
                    } else {
                        type.textContent = word.slice(0, --i);
                        if (i === 0) { w++; timer = setTimeout(run, 250); return; }
                        timer = setTimeout(step, 28);
                    }
                };
                type.textContent = '';
                step();
            };
            new MutationObserver(() => { w = 0; run(); }).observe(root, { attributes: true, attributeFilter: ['lang'] });
            setTimeout(run, motion ? 1200 : 0);
        }

        // Local time in Hanoi.
        const clock = $('#hero-clock', hero);
        if (clock) {
            const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
            const tick = () => { clock.textContent = fmt.format(new Date()) + ' GMT+7'; };
            tick();
            setInterval(tick, 20000);
        }

        // Cursor spotlight on the dot grid + gentle tilt of the code card.
        const card = $('.code-card', hero);
        if (motion && window.matchMedia('(pointer: fine)').matches) {
            hero.addEventListener('pointermove', e => {
                const r = hero.getBoundingClientRect();
                hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
                hero.classList.add('is-lit');
                if (card) {
                    const c = card.getBoundingClientRect();
                    const dx = (e.clientX - (c.left + c.width / 2)) / r.width;
                    const dy = (e.clientY - (c.top + c.height / 2)) / r.height;
                    card.style.setProperty('--ry', (dx * 10).toFixed(2) + 'deg');
                    card.style.setProperty('--rx', (-dy * 10).toFixed(2) + 'deg');
                }
            });
            hero.addEventListener('pointerleave', () => {
                hero.classList.remove('is-lit');
                if (card) { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
            });
        }
    }

    /* ------------------------------------------------- 2 + 3. Journey & header */
    const hs = $('.hs');
    if (hs) {
        const pin = $('.hs-pin', hs);
        const track = $('.hs-track', hs);
        const slides = Array.from(track.children);
        const n = slides.length;
        const wide = window.matchMedia('(min-width: 900px) and (min-height: 560px)');
        let on = false, active = -1;

        hs.style.setProperty('--hs-n', n);

        const pinTop = () => parseFloat(getComputedStyle(pin).top) || 0;
        const distance = () => Math.max(1, hs.offsetHeight - pin.offsetHeight);
        const yFor = i => window.scrollY + hs.getBoundingClientRect().top - pinTop() + (distance() * i) / (n - 1);
        const slideIndexOf = el => {
            const s = el && el.closest && el.closest('.hs-slide');
            return s ? slides.indexOf(s) : -1;
        };
        const goTo = (i, smooth) => {
            i = Math.max(0, Math.min(n - 1, i));
            window.scrollTo({ top: Math.round(yFor(i)), behavior: smooth && motion ? 'smooth' : 'auto' });
        };

        const setActive = i => {
            if (i === active) return;
            active = i;
            slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
        };

        onFrame.push(() => {
            // Header hides as soon as vertical scrolling resumes after the journey.
            root.classList.toggle('bar-hidden', hs.getBoundingClientRect().bottom < window.innerHeight - 2);

            if (!on) return;
            const rel = pinTop() - hs.getBoundingClientRect().top;
            const p = Math.max(0, Math.min(1, rel / distance()));
            const pos = p * (n - 1);
            track.style.transform = 'translate3d(' + (-(pos * 100) / n).toFixed(4) + '%, 0, 0)';
            hs.style.setProperty('--hs-progress', (p * 100).toFixed(2) + '%');
            setActive(Math.round(pos));
        });

        const apply = () => {
            on = wide.matches && motion;
            root.classList.toggle('hs-on', on);
            active = -1;
            if (!on) {
                track.style.transform = '';
                slides.forEach(s => s.classList.add('is-active'));
            } else {
                slides.forEach(s => s.classList.remove('is-active'));
            }
            request();
        };

        // In-page links pointing into a slide (nav "#work", "#home").
        document.addEventListener('click', e => {
            if (!on) return;
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href').slice(1);
            const target = id && document.getElementById(id);
            const i = target === hs ? 0 : slideIndexOf(target);
            if (i < 0) return;
            e.preventDefault();
            history.replaceState(null, '', '#' + id);
            goTo(i, true);
        });

        // Keyboard focus in an off-screen slide: bring it into view instead of
        // letting overflow:hidden scroll the pin sideways.
        pin.addEventListener('focusin', e => {
            if (!on) return;
            pin.scrollLeft = 0;
            const i = slideIndexOf(e.target);
            if (i >= 0 && i !== active) goTo(i, false);
        });

        const pinned = () => {
            const r = hs.getBoundingClientRect();
            return r.top <= pinTop() + 1 && r.bottom >= pin.offsetHeight + pinTop() - 1;
        };

        // Trackpad sideways swipe and arrow keys move through the slides.
        hs.addEventListener('wheel', e => {
            if (!on || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !pinned()) return;
            e.preventDefault();
            window.scrollBy(0, e.deltaX);
        }, { passive: false });
        document.addEventListener('keydown', e => {
            if (!on || e.altKey || e.ctrlKey || e.metaKey) return;
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || !pinned()) return;
            e.preventDefault();
            goTo(active + (e.key === 'ArrowRight' ? 1 : -1), true);
        });

        window.addEventListener('resize', apply);
        wide.addEventListener('change', apply);
        apply();

        window.addEventListener('load', () => {
            if (!on || !location.hash) return;
            const i = slideIndexOf(document.getElementById(location.hash.slice(1)));
            if (i > 0) goTo(i, false);
        });
    }

    /* ------------------------------------------------------- 4. Project timeline */
    const msSec = $('#portfolio');
    const panels = msSec ? $$('.ms', msSec) : [];
    if (panels.length) {
        const total = panels.length;
        const bar = document.createElement('div');
        bar.className = 'ms-bar';
        const dashes = panels.map((p, i) => {
            const name = $('.ms-title', p).textContent.trim();
            return '<a class="ms-dash" href="#' + p.id + '" title="' + pad(i + 1) + ' · ' + name.replace(/"/g, '&quot;') + '" aria-label="' + name.replace(/"/g, '&quot;') + '"></a>';
        }).join('');
        bar.innerHTML =
            '<div class="container ms-bar-in">' +
                '<p class="ms-count">' + t('Dự án', 'Project') + ' <b class="num"><span class="ms-cur">01</span> / ' + pad(total) + '</b></p>' +
                '<nav class="ms-dashes" aria-label="Projects">' + dashes + '</nav>' +
                '<a class="ms-bar-link" href="https://github.com/vubinh127" target="_blank" rel="noopener noreferrer">GitHub <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9" /></svg></a>' +
            '</div><span class="ms-bar-progress"></span>';
        msSec.prepend(bar);

        const cur = $('.ms-cur', bar);
        const dashEls = $$('.ms-dash', bar);
        const list = $('.ms-list', msSec);

        if (motion) {
            const io = new IntersectionObserver(entries => entries.forEach(e => {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-visible');
                io.unobserve(e.target);
            }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
            panels.forEach(p => io.observe(p));
        }

        let last = -1;
        onFrame.push(() => {
            const vh = window.innerHeight, mid = vh / 2;
            let activeMs = last < 0 ? 0 : last;
            panels.forEach((p, i) => {
                const r = p.getBoundingClientRect();
                if (r.top <= mid && r.bottom >= mid) activeMs = i;
                if (motion && r.bottom > -vh && r.top < 2 * vh) {
                    const off = Math.max(-180, Math.min(180, (mid - r.top - r.height / 2) * 0.3));
                    p.style.setProperty('--parallax-offset', off.toFixed(1) + 'px');
                }
            });
            const lr = list.getBoundingClientRect();
            bar.style.setProperty('--ms-progress', (Math.max(0, Math.min(1, (mid - lr.top) / lr.height)) * 100).toFixed(2) + '%');
            if (activeMs !== last) {
                last = activeMs;
                cur.textContent = pad(activeMs + 1);
                dashEls.forEach((d, i) => {
                    d.classList.toggle('is-active', i === activeMs);
                    d.classList.toggle('is-done', i < activeMs);
                    if (i === activeMs) d.setAttribute('aria-current', 'step');
                    else d.removeAttribute('aria-current');
                });
            }
        });
    }

    /* --------------------------------------- 5. Progress bar + lower sections */
    if (motion) {
        const progress = document.createElement('div');
        progress.className = 'scroll-progress';
        progress.setAttribute('aria-hidden', 'true');
        document.body.prepend(progress);

        const groups = [
            '.statement', '.about-cols > *', '.stats > div',
            '.sec-skills h2, .skills > div', '.sec-edu h2, .edu',
            '.contact-main > *', '.contact-list > div'
        ];
        const io = new IntersectionObserver(entries => entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
        }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        groups.forEach(sel => {
            const seen = new Map();
            $$(sel).forEach(el => {
                const i = seen.get(el.parentElement) || 0;
                seen.set(el.parentElement, i + 1);
                el.setAttribute('data-reveal', '');
                el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's');
                io.observe(el);
            });
        });

        const statement = $('.statement');
        onFrame.push(() => {
            const max = root.scrollHeight - window.innerHeight;
            root.style.setProperty('--progress', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
            if (statement) {
                const vh = window.innerHeight, r = statement.getBoundingClientRect();
                if (r.bottom > -vh && r.top < 2 * vh) {
                    const off = Math.max(-60, Math.min(60, (vh / 2 - (r.top + r.height / 2)) * 0.12));
                    statement.style.setProperty('--parallax-y', off.toFixed(1) + 'px');
                }
            }
        });
    }

    request();
})();
