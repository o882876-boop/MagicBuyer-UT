// ==UserScript==
// @name         MagicBuyer FC27 繁體中文版
// @namespace    http://tampermonkey.net/
// @version      4.0.0-fc27fix-tc8
// @description  MagicBuyer FC27 相容修正 + 完整繁體中文 + 安全同步搜尋總評
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
      console.warn('[MagicBuyer TC8] 無法載入 tc5 翻譯字典', err);
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

  const findInputNearText = (labels) => {
    try {
      const nodes = [...document.querySelectorAll('label,span,div,p,small')];
      for (const node of nodes) {
        const txt = (node.textContent || '').trim().replace(/\s+/g, ' ');
        if (!labels.some(l => txt === l || txt.startsWith(l + ':') || txt.includes(l))) continue;
        let cur = node;
        for (let i = 0; i < 5 && cur; i++, cur = cur.parentElement) {
          const inputs = cur.querySelectorAll && cur.querySelectorAll('input');
          if (inputs && inputs.length) return inputs[0];
        }
      }
    } catch (_) {}
    return null;
  };

  const syncOverallInputs = () => {
    try {
      const srcMin = findInputNearText(['最低總評','Minimum Overall','Min Overall']);
      const srcMax = findInputNearText(['最高總評','Maximum Overall','Max Overall']);
      const dstMin = findInputNearText(['最低評分','Note min','Note minimale du joueur']);
      const dstMax = findInputNearText(['最高評分','Note max','Note maximale du joueur']);

      const copy = (src, dst) => {
        if (!src || !dst) return;
        const v = parseInt(src.value, 10);
        if (!Number.isFinite(v) || v <= 0) return;
        if (String(dst.value) === String(v)) return;
        dst.value = String(v);
        dst.dispatchEvent(new Event('input', { bubbles: true }));
        dst.dispatchEvent(new Event('change', { bubbles: true }));
      };

      copy(srcMin, dstMin);
      copy(srcMax, dstMax);
    } catch (e) {
      console.warn('[MagicBuyer TC8] 評分同步失敗', e);
    }
  };

  const startTranslator = () => {
    if (!document.documentElement) return setTimeout(startTranslator, 100);
    const obs = new MutationObserver(() => {
      translatePage();
      setTimeout(syncOverallInputs, 80);
    });
    obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
    document.addEventListener('input', (ev) => {
      const el = ev.target;
      if (!(el instanceof HTMLInputElement)) return;
      setTimeout(syncOverallInputs, 0);
    }, true);
    translatePage();
    setTimeout(syncOverallInputs, 300);
    setInterval(syncOverallInputs, 1200);
  };

  const patchCode = (source) => {
    let code = source;

    const oldIgnore = 'const h=new Set((e.idAddIgnorePlayersList||[]).map((({id:e})=>e)))';
    const newIgnore = 'const h=new Set((()=>{const t=e.idAddIgnorePlayersList;if(!t)return[];if(Array.isArray(t))return t;if(t instanceof Set)return[...t];if(t instanceof Map)return[...t.values()];if("string"==typeof t)try{const e=JSON.parse(t);return Array.isArray(e)?e:[]}catch(e){return[]}return"object"==typeof t?Object.values(t):[]})().map((e=>"object"==typeof e&&e?e.id:e)).filter(Boolean))';
    if (code.includes(oldIgnore)) code = code.replace(oldIgnore, newIgnore);

    const syncNeedle = 'const i=P();return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    const syncReplacement = 'let i;try{i=P()}catch(e){console.warn("[MagicBuyer FC27] criteria sync failed",e),i=(0,a.NA)("lastSearchCriteria")||{type:"player",defId:[]}}return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    if (code.includes(syncNeedle)) code = code.replace(syncNeedle, syncReplacement);

    const oldRatingRead = 'b=parseInt(l.rating);';
    const newRatingRead = 'b=(()=>{let e=NaN;try{e=parseInt(l&&l.rating,10)}catch(t){}if(!Number.isFinite(e))try{e=parseInt(l&&"function"==typeof l.getRating?l.getRating():NaN,10)}catch(t){}if(!Number.isFinite(e))try{const t=l&&l._staticData||{};e=parseInt(t.rating||t.overallRating||t.overall||t.ovr||NaN,10)}catch(t){}return e})();';
    if (code.includes(oldRatingRead)) code = code.replace(oldRatingRead, newRatingRead);

    const priceVarsNeedle = 'let S=_(e.idAbMaxBid),T=_(e.idAbBuyPrice);';
    const priceVarsReplacement = 'let S=_(e.idAbMaxBid),T=_(e.idAbBuyPrice);(0,c.c2)(`評分篩選：最低 ${null!=e.idAbMinRating?e.idAbMinRating:"-"} / 最高 ${null!=e.idAbMaxRating?e.idAbMaxRating:"-"}`,i.idProgressAutobuyer);';
    if (code.includes(priceVarsNeedle)) code = code.replace(priceVarsNeedle, priceVarsReplacement);

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
      console.log('[MagicBuyer FC27 TC] 已載入修正版 tc8');
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
