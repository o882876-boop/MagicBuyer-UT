// ==UserScript==
// @name         MagicBuyer FC27 繁體中文版
// @namespace    http://tampermonkey.net/
// @version      4.0.0-fc27fix-tc12
// @description  MagicBuyer FC27 相容修正 + 完整繁體中文 + FC27 穩定評分範圍
// @author       AMINE1921 / TC patch
// @match        https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app*
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app*
// @match        https://www.futbin.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @connect      ea.com
// @connect      ea2.com
// @connect      futbin.com
// @connect      www.futbin.com
// @connect      futwiz.com
// @connect      discordapp.com
// @connect      futbin.org
// @connect      exp.host
// @downloadURL  https://raw.githubusercontent.com/o882876-boop/MagicBuyer-UT/master/MagicBuyer-FC27-TC.user.js
// @updateURL    https://raw.githubusercontent.com/o882876-boop/MagicBuyer-UT/master/MagicBuyer-FC27-TC.user.js
// ==/UserScript==

(() => {
  'use strict';

  const SOURCE_URL = 'https://raw.githubusercontent.com/o882876-boop/MagicBuyer-UT/master/dist/fut-auto-buyer.user.js';
  const TC5_URL = 'https://raw.githubusercontent.com/o882876-boop/MagicBuyer-UT/006b3d60cc529992e6d9edfdc3f55976d2fcf6c3/MagicBuyer-FC27-TC.user.js';
  let translations = [];

  const getText = (url) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(),
      onload: (res) => res.status >= 200 && res.status < 300 ? resolve(res.responseText || '') : reject(new Error('HTTP ' + res.status)),
      onerror: reject
    });
  });

  const loadTranslations = async () => {
    try {
      const src = await getText(TC5_URL);
      const startMark = 'const translations = [';
      const endMark = '].sort((a,b) => b[0].length - a[0].length);';
      const s = src.indexOf(startMark);
      const e = src.indexOf(endMark, s);
      if (s >= 0 && e > s) {
        const arrayText = src.slice(s + 'const translations = '.length, e + 1);
        translations = eval(arrayText).sort((a,b) => b[0].length - a[0].length);
      }
    } catch (err) {
      console.warn('[MagicBuyer TC12] 無法載入 tc5 翻譯字典', err);
    }
  };

  const translateText = (text) => {
    if (!text || !String(text).trim()) return text;
    let out = String(text);
    for (const [from, to] of translations) out = out.split(from).join(to);
    return out;
  };

  const translateNode = (node) => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const next = translateText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of ['placeholder','title','aria-label']) {
      if (node.hasAttribute && node.hasAttribute(attr)) {
        const old = node.getAttribute(attr);
        const next = translateText(old);
        if (next !== old) node.setAttribute(attr, next);
      }
    }
    node.childNodes && node.childNodes.forEach(translateNode);
  };

  let timer;
  const translatePage = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { if (document.body) translateNode(document.body); } catch (_) {}
    }, 50);
  };

  const startTranslator = () => {
    if (!document.documentElement) return setTimeout(startTranslator, 100);
    const obs = new MutationObserver(translatePage);
    obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
    translatePage();
    setInterval(translatePage, 1200);
  };

  const visibleIn = (scope) => [...scope.querySelectorAll('input')].filter((el) => {
    try {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    } catch (_) { return false; }
  });

  const readRatingRangeOnce = () => {
    try {
      const scope =
        document.querySelector('#mb-root .mb-page[data-page="market"].is-active') ||
        document.querySelector('#mb-root .mb-page[data-page="market"]') ||
        document.querySelector('#mb-root') ||
        document;
      const inputs = visibleIn(scope);
      const nodes = [...scope.querySelectorAll('label,span,small,div,p,h2,h3')];

      const findInput = (needles) => {
        let best = null;
        let bestScore = Infinity;
        for (const node of nodes) {
          const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
          if (!text || text.length > 120 || !needles.some((n) => text.includes(n))) continue;
          const direct = node.querySelector && node.querySelector('input');
          if (direct && inputs.includes(direct)) return direct;
          const a = node.getBoundingClientRect();
          for (const input of inputs) {
            const v = parseInt(input.value, 10);
            if (!Number.isFinite(v) || v < 1 || v > 99) continue;
            const b = input.getBoundingClientRect();
            if (b.bottom < a.top - 20) continue;
            const score =
              Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2) +
              Math.abs(a.bottom - b.top) * 3;
            if (score < bestScore) {
              bestScore = score;
              best = input;
            }
          }
        }
        return best;
      };

      let minInput = findInput(['最低總評','Minimum Overall','Min Overall','Overall min','Note min']);
      let maxInput = findInput(['最高總評','Maximum Overall','Max Overall','Overall max','Note max']);

      if (!minInput || !maxInput || minInput === maxInput) {
        for (const block of [...scope.querySelectorAll('div,section,article')]) {
          const text = (block.textContent || '').replace(/\s+/g, ' ');
          if (!/總評|Overall|Note/.test(text)) continue;
          const vals = [...block.querySelectorAll('input')].filter((el) => {
            if (!inputs.includes(el)) return false;
            const v = parseInt(el.value, 10);
            return Number.isFinite(v) && v >= 1 && v <= 99;
          });
          if (vals.length >= 2) {
            vals.sort((a,b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
            minInput = minInput || vals[0];
            maxInput = maxInput || vals[1];
            break;
          }
        }
      }

      const min = minInput ? parseInt(minInput.value, 10) : NaN;
      const max = maxInput ? parseInt(maxInput.value, 10) : NaN;
      const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

      if (Number.isFinite(min) && min >= 1 && min <= 99) page.__MB_SEARCH_MIN_RATING = min;
      if (Number.isFinite(max) && max >= 1 && max <= 99) page.__MB_SEARCH_MAX_RATING = max;

      if (Number.isFinite(min) || Number.isFinite(max)) {
        console.debug('[MagicBuyer TC12] 搜尋總評', min, max);
      }
    } catch (e) {
      console.warn('[MagicBuyer TC12] 讀取搜尋總評失敗', e);
    }
  };

  const startRatingCapture = () => {
    document.addEventListener('input', (event) => {
      const el = event.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (!el.closest || !el.closest('#mb-root')) return;
      setTimeout(readRatingRangeOnce, 0);
    }, true);

    document.addEventListener('change', (event) => {
      const el = event.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (!el.closest || !el.closest('#mb-root')) return;
      setTimeout(readRatingRangeOnce, 0);
    }, true);

    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest
        ? event.target.closest('[data-mb-action="start"], .mb-btn-start')
        : null;
      if (target && target.closest('#mb-root')) readRatingRangeOnce();
    }, true);
  };

  const patchCode = (source) => {
    let code = source;

    // FC27: ignore-list can be object/Set/Map instead of Array.
    const oldIgnore = 'const h=new Set((e.idAddIgnorePlayersList||[]).map((({id:e})=>e)))';
    const newIgnore = 'const h=new Set((()=>{const t=e.idAddIgnorePlayersList;if(!t)return[];if(Array.isArray(t))return t;if(t instanceof Set)return[...t];if(t instanceof Map)return[...t.values()];if("string"==typeof t)try{const e=JSON.parse(t);return Array.isArray(e)?e:[]}catch(e){return[]}return"object"==typeof t?Object.values(t):[]})().map((e=>"object"==typeof e&&e?e.id:e)).filter(Boolean))';
    if (code.includes(oldIgnore)) code = code.replace(oldIgnore, newIgnore);

    // FC27: Start must survive EA criteria sync errors.
    const syncNeedle = 'const i=P();return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    const syncReplacement = 'let i;try{i=P()}catch(e){console.warn("[MagicBuyer FC27] criteria sync failed",e),i=(0,a.NA)("lastSearchCriteria")||{type:"player",defId:[]}}return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    if (code.includes(syncNeedle)) code = code.replace(syncNeedle, syncReplacement);

    // FC27: derive player rating from several possible fields/methods, not just l.rating.
    const oldRatingRead = 'b=parseInt(l.rating);';
    const newRatingRead = 'b=(()=>{let e=NaN;try{e=parseInt(l&&l.rating,10)}catch(t){}if(!Number.isFinite(e))try{e=parseInt(l&&"function"==typeof l.getRating?l.getRating():NaN,10)}catch(t){}if(!Number.isFinite(e))try{const t=l&&l._staticData||{};e=parseInt(t.rating||t.overallRating||t.overall||t.ovr||NaN,10)}catch(t){}return e})();';
    if (code.includes(oldRatingRead)) code = code.replace(oldRatingRead, newRatingRead);

    // Show the actual min/max settings on every search so we can verify whether 75 is really stored.
    const priceVarsNeedle = 'let S=_(e.idAbMaxBid),T=_(e.idAbBuyPrice);';
    const priceVarsReplacement = 'const __mbPage="undefined"!=typeof unsafeWindow?unsafeWindow:window,__mbMin=parseInt(__mbPage.__MB_SEARCH_MIN_RATING,10),__mbMax=parseInt(__mbPage.__MB_SEARCH_MAX_RATING,10);Number.isFinite(__mbMin)&&__mbMin>=1&&__mbMin<=99&&(e.idAbMinRating=__mbMin);Number.isFinite(__mbMax)&&__mbMax>=1&&__mbMax<=99&&(e.idAbMaxRating=__mbMax);let S=_(e.idAbMaxBid),T=_(e.idAbBuyPrice);(0,c.c2)(`評分篩選：最低 ${null!=e.idAbMinRating?e.idAbMinRating:"-"} / 最高 ${null!=e.idAbMaxRating?e.idAbMaxRating:"-"}${Number.isFinite(__mbMin)||Number.isFinite(__mbMax)?"（搜尋頁）":"（市場設定）"}`,i.idProgressAutobuyer);';
    if (code.includes(priceVarsNeedle)) code = code.replace(priceVarsNeedle, priceVarsReplacement);

    // Hard-filter ratings and print the reason when a card is skipped.
    const ratingCheckNeedle = 'const R=!(D||M)||(0,P.l)(b,D,M),F=O(`${L}(${b}) Prix: ${y} temps: ${p}`);';
    const ratingCheckReplacement = 'const R=Number.isFinite(b)&&(!(D||M)||(0,P.l)(b,D,M)),F=O(`${L}(${Number.isFinite(b)?b:"?"}) Prix: ${y} temps: ${p}`);';
    if (code.includes(ratingCheckNeedle)) code = code.replace(ratingCheckNeedle, ratingCheckReplacement);

    const invalidNeedle = 'if(!R){F("(la note ne correspond pas aux critères)");continue}';
    const invalidReplacement = 'if(!R){F(`(評分不符合：讀到 ${Number.isFinite(b)?b:"未知"}，設定 ${null!=D?D:"-"}–${null!=M?M:"-"})`);continue}';
    if (code.includes(invalidNeedle)) code = code.replace(invalidNeedle, invalidReplacement);

    return code;
  };

  const run = (source) => {
    try {
      const patched = patchCode(source);
      eval(patched + '\n//# sourceURL=MagicBuyer-FC27-TC-runtime.js');
      console.log('[MagicBuyer FC27 TC] 已載入修正版 tc12');
      startRatingCapture();
      startTranslator();
    } catch (err) {
      console.error('[MagicBuyer FC27 TC] 載入失敗', err);
      startTranslator();
    }
  };

  (async () => {
    await loadTranslations();
    try {
      const src = await getText(SOURCE_URL);
      run(src);
    } catch (err) {
      console.error('[MagicBuyer FC27 TC] 無法下載原程式', err);
      startTranslator();
    }
  })();
})();
