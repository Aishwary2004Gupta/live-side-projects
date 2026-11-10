const __vite__mapDeps = (i, m = __vite__mapDeps, d = (m.f || (m.f = ["assets/01-fold-UTt1Rn0E.js", "assets/rolldown-runtime-4tVxZq34.js", "assets/OrbitControls-Csg6C3a0.js", "assets/tilt-CtBdor9k.js", "assets/02-shatter-Bepnfmfy.js", "assets/pointer-dUvUBLb7.js", "assets/03-melt-DaeIwEje.js", "assets/buffers-BfZzWdg3.js", "assets/grid-D2Hu2MEc.js", "assets/TAAUtils-DMQlQeOy.js", "assets/04-tangle-D9-gR4nO.js", "assets/05-moss-CAHUnnMg.js", "assets/tune-DdpmcJD6.js", "assets/tune-BNSj1uoL.css"]))) => i.map(i => d[i]);
(function () {
    let e = document.createElement(`link`).relList;
    if (e && e.supports && e.supports(`modulepreload`))
        return;
    for (let e of document.querySelectorAll(`link[rel="modulepreload"]`))
        n(e);
    new MutationObserver(e => {
        for (let t of e)
            if (t.type === `childList`)
                for (let e of t.addedNodes)
                    e.tagName === `LINK` && e.rel === `modulepreload` && n(e)
    }
    ).observe(document, {
        childList: !0,
        subtree: !0
    });
    function t(e) {
        let t = {};
        return e.integrity && (t.integrity = e.integrity),
            e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
            t.credentials = e.crossOrigin === `use-credentials` ? `include` : e.crossOrigin === `anonymous` ? `omit` : `same-origin`,
            t
    }
    function n(e) {
        if (e.ep)
            return;
        e.ep = !0;
        let n = t(e);
        fetch(e.href, n)
    }
}
)();
var e = `/assets/thumbnail-320-CsUu0x0c.webp`
    , t = `/assets/thumbnail-640-C5B3mmOK.webp`
    , n = `/assets/thumbnail-960-pD3TIXLI.webp`
    , r = `/assets/thumbnail-320-6_xGpTks.webp`
    , i = `/assets/thumbnail-640-gvCLPrEp.webp`
    , a = `/assets/thumbnail-960-CA9Civ5B.webp`
    , o = `/assets/thumbnail-320-B-8M_WBD.webp`
    , s = `/assets/thumbnail-640-DH4oOn41.webp`
    , c = `/assets/thumbnail-960-CfhbD4wy.webp`
    , l = `/assets/thumbnail-320-CGF759Ty.webp`
    , u = `/assets/thumbnail-640-CycYw0-9.webp`
    , d = `/assets/thumbnail-960-C9SxiPNT.webp`
    , f = `/assets/thumbnail-320-B_FOOvso.webp`
    , p = `/assets/thumbnail-640-DiOxoPut.webp`
    , m = `/assets/thumbnail-960-PudeVOR8.webp`
    , h = `Fold.Shatter.Melt.Tangle.Moss.Orrery.Hollow.Tesseract.Membrane.Caustic.Rust.Feather.Labyrinth.Tension.Mirage.Spore.Kelp.Pendulum.Erosion.Cocoon.Bolt.Echo.Magma.Nest.Veil.Anamorph.Burrow.Hive.Portal.Dissolve`.split(`.`)
    , g = e => String(e).padStart(2, `0`)
    , _ = `modulepreload`
    , v = function (e) {
        return `/` + e
    }
    , y = {}
    , b = function (e) {
        return e.pathname.endsWith(`.css`)
    }
    , x = function (e, t, n) {
        if (t in e)
            return e[t];
        let r = n();
        if (!r) {
            e[t] = void 0;
            return
        }
        let i = r.then(() => {
            e[t] = void 0
        }
            , n => {
                throw e[t] = void 0,
                n
            }
        );
        return e[t] = i,
            i
    }
    , S = function (e, t, n) {
        let r = Promise.resolve();
        if (t && t.length > 0) {
            let e, i = document.querySelector(`meta[property=csp-nonce]`), a = i?.nonce || i?.getAttribute(`nonce`);
            function o(e) {
                return Promise.all(e.map(e => Promise.resolve(e).then(e => ({
                    status: `fulfilled`,
                    value: e
                }), e => ({
                    status: `rejected`,
                    reason: e
                }))))
            }
            function s(e) {
                return import.meta.resolve ? new URL(import.meta.resolve(e)) : new URL(e, import.meta.url)
            }
            r = o(t.map(t => {
                t = v(t, n);
                let r = s(t)
                    , i = b(r);
                return x(y, r.href, () => {
                    if (e === void 0) {
                        e = {
                            all: new Set,
                            styles: new Set
                        };
                        let t = document.getElementsByTagName(`link`);
                        for (let n = t.length - 1; n >= 0; n--) {
                            let r = t[n];
                            e.all.add(r.href),
                                r.rel === `stylesheet` && e.styles.add(r.href)
                        }
                    }
                    if ((i ? e.styles : e.all).has(r.href))
                        return;
                    let t = document.createElement(`link`);
                    if (t.rel = i ? `stylesheet` : _,
                        i || (t.as = `script`),
                        t.crossOrigin = ``,
                        t.href = r.href,
                        a && t.setAttribute(`nonce`, a),
                        document.head.appendChild(t),
                        i)
                        return new Promise((e, n) => {
                            let i = a => {
                                t.removeEventListener(`load`, i),
                                    t.removeEventListener(`error`, i),
                                    a.type === `error` ? n(Error(`Unable to preload CSS for ${r}`)) : e(a)
                            }
                                ;
                            t.addEventListener(`load`, i),
                                t.addEventListener(`error`, i)
                        }
                        )
                }
                )
            }
            ).filter(e => e !== void 0))
        }
        function i(e) {
            let t = new Event(`vite:preloadError`, {
                cancelable: !0
            });
            if (t.payload = e,
                window.dispatchEvent(t),
                !t.defaultPrevented)
                throw e
        }
        return r.then(t => {
            for (let e of t || [])
                e.status === `rejected` && i(e.reason);
            return e().catch(i)
        }
        )
    }
    , C = {
        1: {
            load: () => S(() => import(`./01-fold-UTt1Rn0E.js`).then(e => e.t), __vite__mapDeps([0, 1, 2, 3])),
            alt: `White paper folded into a repeating relief of diamonds, lit from one side`
        },
        2: {
            load: () => S(() => import(`./02-shatter-Bepnfmfy.js`), __vite__mapDeps([4, 2, 1, 3, 5])),
            alt: `Two swans, one silver and one cobalt, facing each other in a white room as their backs begin to come apart into plumes of wire`
        },
        3: {
            load: () => S(() => import(`./03-melt-DaeIwEje.js`), __vite__mapDeps([6, 2, 1, 5, 7, 8, 9])),
            alt: `Letters of clear fluid melting into a pool`
        },
        4: {
            load: () => S(() => import(`./04-tangle-D9-gR4nO.js`), __vite__mapDeps([10, 2, 1, 7, 8])),
            alt: `Two floating tangles of rope, one black and one white, linked and nailed to the floor`
        },
        5: {
            load: () => S(() => import(`./05-moss-CAHUnnMg.js`), __vite__mapDeps([11, 2, 1, 7])),
            alt: `A few stones grown over with moss and lichens, drawn in black ink on white paper`
        }
    }
    , w = Object.assign({
        "./01-fold/thumbnail-320.webp": e,
        "./01-fold/thumbnail-640.webp": t,
        "./01-fold/thumbnail-960.webp": n,
        "./02-shatter/thumbnail-320.webp": r,
        "./02-shatter/thumbnail-640.webp": i,
        "./02-shatter/thumbnail-960.webp": a,
        "./03-melt/thumbnail-320.webp": o,
        "./03-melt/thumbnail-640.webp": s,
        "./03-melt/thumbnail-960.webp": c,
        "./04-tangle/thumbnail-320.webp": l,
        "./04-tangle/thumbnail-640.webp": u,
        "./04-tangle/thumbnail-960.webp": d,
        "./05-moss/thumbnail-320.webp": f,
        "./05-moss/thumbnail-640.webp": p,
        "./05-moss/thumbnail-960.webp": m
    });
function T(e, t) {
    let n = Object.entries(w).filter(([t]) => t.startsWith(`./${e}-`)).map(([e, t]) => ({
        url: t,
        width: Number(e.match(/-(\d+)\.webp$/)?.[1])
    })).sort((e, t) => e.width - t.width);
    if (n.length !== 0)
        return {
            src: n[0].url,
            srcset: n.map(({ url: e, width: t }) => `${e} ${t}w`).join(`, `),
            alt: t
        }
}
var E = h.map((e, t) => {
    let n = g(t + 1)
        , r = C[t + 1];
    return {
        id: n,
        word: e,
        load: r?.load,
        thumbnail: r && T(n, r.alt)
    }
}
)
    , D = class extends Error {
    }
    , O = document.documentElement;
navigator.maxTouchPoints > 0 && CSS.supports(`-webkit-touch-callout`, `none`) && O.classList.add(`runway`);
function k() {
    let e = () => parseFloat(getComputedStyle(O).getPropertyValue(`--runway`))
        , t = () => {
            e() && scrollY !== e() && scrollTo({
                top: e(),
                left: 0,
                behavior: `instant`
            })
        }
        ;
    return t(),
        addEventListener(`scroll`, t),
        addEventListener(`resize`, t),
        addEventListener(`pageshow`, t),
        () => {
            removeEventListener(`scroll`, t),
                removeEventListener(`resize`, t),
                removeEventListener(`pageshow`, t),
                e() && scrollTo({
                    top: 0,
                    left: 0,
                    behavior: `instant`
                })
        }
}
var A = document.querySelector(`meta[name="theme-color"]`);
function j(e) {
    document.documentElement.style.backgroundColor = e,
        document.body.style.backgroundColor = e,
        A?.setAttribute(`content`, e)
}
var M = {
    neutral: `#f4f4f4`,
    light: `#ffffff`,
    dark: `#000000`
}
    , N = e => `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${e}"/></svg>`
    , P = N(`M12 5l-5 5 5 5`)
    , F = N(`M8 5l5 5-5 5`)
    , I = `<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="5" height="5" rx="1"/><rect x="11" y="4" width="5" height="5" rx="1"/><rect x="4" y="11" width="5" height="5" rx="1"/><rect x="11" y="11" width="5" height="5" rx="1"/></svg>`;
function L(e) {
    let t = E.filter(e => e.load)
        , n = t.indexOf(e);
    return n < 0 ? {} : {
        previous: t[n - 1],
        next: t[n + 1]
    }
}
function R(e) {
    let { previous: t, next: n } = L(e);
    if (!t && !n)
        return ``;
    let r = (e, t, n) => e ? `<a class="tool" href="/${e.id}/" aria-label="${n}: ${e.id} ${e.word}" title="${e.id} ${e.word}">${t}</a>` : `<span class="tool tool-off" aria-hidden="true">${t}</span>`;
    return `<nav class="pill" aria-label="Days">
    ${r(t, P, `Previous`)}
    <a class="tool" href="/" aria-label="All days" title="All days">${I}</a>
    ${r(n, F, `Next`)}
  </nav>`
}
function z(e, t) {
    document.title = `${t.id} ${t.word} · Codevember 2026`,
        j(M.neutral);
    let n = document.createElement(`main`);
    n.className = `day`,
        n.dataset.tone = `neutral`,
        n.innerHTML = `
    <div class="stage"></div>
    <nav class="crumb" aria-label="Breadcrumb">
      <a class="crumb-home" href="/">Codevember 2026</a>
      <span class="crumb-slash" aria-hidden="true">/</span>
      <span class="crumb-here" aria-current="page">${t.id} ${t.word}</span>
    </nav>
    ${R(t)}`,
        e.append(n);
    let r = k(), i = n.querySelector(`.stage`), a = e => {
        i.innerHTML = `<p class="quiet">${e}</p>`
    }
        , o = !1, s, c, l = {
            setTone(e, t) {
                n.dataset.tone = e,
                    n.style.setProperty(`--canvas`, t ?? null),
                    j(t ?? M[e])
            },
            settled() {
                n.dataset.settled = `true`
            },
            async tune(e, r) {
                let i = {
                    refresh() { },
                    inUse: () => !1
                };
                if (new URLSearchParams(location.search).get(`gui`) !== `true`)
                    return i;
                try {
                    let { openPane: i } = await S(async () => {
                        let { openPane: e } = await import(`./tune-DdpmcJD6.js`);
                        return {
                            openPane: e
                        }
                    }
                        , __vite__mapDeps([12, 13]));
                    if (!o) {
                        let a = i(n, t.id, e, r);
                        return c = a.close,
                            a
                    }
                } catch (e) {
                    console.warn(`Tune: the pane did not open`, e)
                }
                return i
            }
        };
    return t.load ? t.load().then(e => o ? void 0 : e.mount(i, l)).then(e => {
        o ? e?.() : s = e
    }
    ).catch(e => {
        e instanceof D ? o || a(e.message) : (console.error(e),
            o || a(`This one did not start.`))
    }
    ) : a(`Not yet.`),
        () => {
            o = !0,
                s?.(),
                c?.(),
                r(),
                n.remove()
        }
}
var B = `(max-width: 640px) 33vw, (max-width: 900px) 20vw, 17vw`;
function V(e) {
    document.title = `Codevember 2026`,
        j(M.neutral);
    let t = document.createElement(`main`);
    t.className = `index`,
        t.dataset.tone = `neutral`;
    let n = document.createElement(`nav`);
    n.className = `crumb`,
        n.innerHTML = `<span class="crumb-here">Codevember 2026</span>`;
    let r = document.createElement(`ol`);
    r.className = `grid`;
    for (let e of E) {
        let t = document.createElement(`li`)
            , n = `<span class="cell-number">${e.id}</span><span class="cell-word">${e.word}</span>`
            , { thumbnail: i } = e
            , a = i ? `<img class="cell-image" src="${i.src}" srcset="${i.srcset}" sizes="${B}" width="320" height="200" loading="lazy" decoding="async" alt="${i.alt}">` : ``;
        t.innerHTML = e.load ? `<a class="cell cell-live" href="/${e.id}/">${a}${n}</a>` : `<div class="cell">${n}</div>`,
            r.append(t)
    }
    return t.append(n, r),
        e.append(t),
        () => t.remove()
}
var H = document.querySelector(`#app`), U;
function W() {
    U?.();
    let e = location.pathname.match(/^\/(\d{2})\/?$/)?.[1]
        , t = E.find(t => t.id === e);
    U = t ? z(H, t) : V(H)
}
document.addEventListener(`click`, e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
        return;
    let t = e.target.closest?.(`a`);
    t && t.origin === location.origin && (e.preventDefault(),
        t.pathname !== location.pathname && (history.pushState(null, ``, t.pathname + location.search),
            W()))
}
),
    addEventListener(`popstate`, W),
    W();
export { S as n, D as t };
