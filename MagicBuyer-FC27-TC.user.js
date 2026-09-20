// ==UserScript==
// @name         MagicBuyer FC27 繁體中文版
// @namespace    http://tampermonkey.net/
// @version      4.0.0-fc27fix-tc17
// @description  MagicBuyer FC27 相容修正 + 完整繁體中文 + 原版介面 + Lite 搜尋核心
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
      console.warn('[MagicBuyer TC17] 無法載入 tc5 翻譯字典', err);
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

  const textNodeExact = (root, label) => {
    try {
      const all = [...root.querySelectorAll('label,span,small,div,p')];
      return all.find((el) => {
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return txt === label || (txt.includes(label) && txt.length <= label.length + 8);
      }) || null;
    } catch (_) {
      return null;
    }
  };

  const visibleInputs = (root) => {
    try {
      return [...root.querySelectorAll('input')].filter((el) => {
        if ((el.type || '').toLowerCase() === 'range') return false;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 40 && rect.height > 20 &&
          style.display !== 'none' && style.visibility !== 'hidden';
      });
    } catch (_) {
      return [];
    }
  };

  const visibleNumericInputs = (root) =>
    visibleInputs(root).filter((el) => {
      const value = parseInt(el.value, 10);
      return Number.isFinite(value) && value >= 1 && value <= 99;
    });

  const captureSearchMaxBuy = () => {
    try {
      const root = document.querySelector('#mb-root') || document;
      const labels = ['立即購買價格:', '立即購買價格', 'Buy Now Price:', 'Buy Now Price', 'Achat immédiat:', 'Prix achat immédiat:'];
      const nodes = [...root.querySelectorAll('label,span,small,div,p,h3')];
      const label = nodes.find((el) => {
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return labels.some((needle) => txt === needle || (txt.includes(needle) && txt.length <= needle.length + 12));
      });
      if (!label) return false;

      let section = label;
      let inputs = [];
      for (let i = 0; i < 6 && section; i++, section = section.parentElement) {
        inputs = visibleInputs(section);
        if (inputs.length >= 2) break;
      }
      if (inputs.length < 2) return false;

      inputs.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      const maxInput = inputs[inputs.length - 1];
      const maxBuy = parseInt(maxInput.value, 10);
      if (!Number.isFinite(maxBuy) || maxBuy < 150) return false;

      const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      page.__MB_SEARCH_MAX_BUY = maxBuy;
      console.debug('[MagicBuyer TC17] 捕捉最高 BIN', maxBuy);
      return true;
    } catch (e) {
      console.warn('[MagicBuyer TC17] 捕捉最高 BIN 失敗', e);
      return false;
    }
  };

  const captureSearchRatingRange = () => {
    try {
      const root = document.querySelector('#mb-root') || document;
      const minLabel = textNodeExact(root, '最低總評');
      const maxLabel = textNodeExact(root, '最高總評');
      if (!minLabel || !maxLabel) return false;

      const minRect = minLabel.getBoundingClientRect();
      const maxRect = maxLabel.getBoundingClientRect();
      const labelBottom = Math.max(minRect.bottom, maxRect.bottom);
      const labelTop = Math.min(minRect.top, maxRect.top);

      let candidates = visibleNumericInputs(root).filter((input) => {
        const r = input.getBoundingClientRect();
        return r.top >= labelTop - 10 && r.top <= labelBottom + 180;
      });

      // The two overall fields are on the same row directly beneath the two labels.
      if (candidates.length >= 2) {
        const rowTop = Math.min(...candidates.map((el) => el.getBoundingClientRect().top));
        candidates = candidates.filter((el) =>
          Math.abs(el.getBoundingClientRect().top - rowTop) <= 25
        );
      }

      if (candidates.length < 2) return false;

      candidates.sort((a, b) =>
        a.getBoundingClientRect().left - b.getBoundingClientRect().left
      );

      const minInput = candidates[0];
      const maxInput = candidates[candidates.length - 1];
      const min = parseInt(minInput.value, 10);
      const max = parseInt(maxInput.value, 10);

      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
      if (min < 1 || min > 99 || max < 1 || max > 99) return false;

      const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      page.__MB_SEARCH_MIN_RATING = min;
      page.__MB_SEARCH_MAX_RATING = max;
      console.debug('[MagicBuyer TC17] 捕捉總評範圍', min, max);
      return true;
    } catch (e) {
      console.warn('[MagicBuyer TC17] 捕捉總評範圍失敗', e);
      return false;
    }
  };

  const startRatingCapture = () => {
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.closest || !target.closest('#mb-root')) return;
      setTimeout(() => {
        captureSearchRatingRange();
        captureSearchMaxBuy();
      }, 0);
    }, true);

    document.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.closest || !target.closest('#mb-root')) return;
      setTimeout(() => {
        captureSearchRatingRange();
        captureSearchMaxBuy();
      }, 0);
    }, true);

    document.addEventListener('click', (event) => {
      const button = event.target && event.target.closest
        ? event.target.closest('[data-mb-action="start"], .mb-btn-start')
        : null;
      if (!button || !button.closest('#mb-root')) return;
      captureSearchRatingRange();
      captureSearchMaxBuy();
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

    // Lite search core inside the original UI: search-page rating/BIN values are authoritative.
    const poolNeedle = 'const k=new Set,_=e=>';
    const poolReplacement = 'const k=new Set,__mbPool=new Map;let __mbPoolKey="";const _=e=>';
    if (code.includes(poolNeedle)) code = code.replace(poolNeedle, poolReplacement);

    const priceVarsNeedle = 'let S=_(e.idAbMaxBid),T=_(e.idAbBuyPrice);';
    const priceVarsReplacement = 'const __mbPage="undefined"!=typeof unsafeWindow?unsafeWindow:window,__mbMin=parseInt(__mbPage.__MB_SEARCH_MIN_RATING,10),__mbMax=parseInt(__mbPage.__MB_SEARCH_MAX_RATING,10),__mbBuy=parseInt(__mbPage.__MB_SEARCH_MAX_BUY,10);Number.isFinite(__mbMin)&&__mbMin>=1&&__mbMin<=99&&(e.idAbMinRating=__mbMin);Number.isFinite(__mbMax)&&__mbMax>=1&&__mbMax<=99&&(e.idAbMaxRating=__mbMax);e.idAbShouldSort=!1,e.idAbMaxPurchases=1;let S=0,T=Number.isFinite(__mbBuy)&&__mbBuy>=150?__mbBuy:_(e.idAbBuyPrice);(0,c.c2)(`Lite搜尋：黃金 · 總評 ${null!=e.idAbMinRating?e.idAbMinRating:"-"}–${null!=e.idAbMaxRating?e.idAbMaxRating:"-"} · BIN ≤ ${T||"-"}`,i.idProgressAutobuyer);';
    if (code.includes(priceVarsNeedle)) code = code.replace(priceVarsNeedle, priceVarsReplacement);

    const futbinNeedle = 'const I=!!e.idBuyFutBinPrice,N=!!e.idAbBidFutBin;';
    const futbinReplacement = 'const I=!1,N=!1;';
    if (code.includes(futbinNeedle)) code = code.replace(futbinNeedle, futbinReplacement);

    // Throw away stale/native criteria and build the same clean EA query as Lite:
    // player + gold + current BIN ceiling only.
    const criteriaNeedle = 'let B=(0,$.rG)(w);if(!B||!B.maskedDefId&&!B.type)return n("Aucun critère de recherche. Choisis un joueur dans Recherche.","warning");const D=!B.maskedDefId;d&&!B.minBid&&D&&(B.minBid=(0,v.GG)((0,l.pl)(0,e.idAbRandMinBidInput))),p&&!B.minBuy&&D&&(B.minBuy=(0,v.GG)((0,l.pl)(0,e.idAbRandMinBuyInput))),B=(0,$.rG)(B);const M=(0,$.h1)(B);';
    const criteriaReplacement = 'const __mbGold=window.SearchLevel&&null!=window.SearchLevel.GOLD?window.SearchLevel.GOLD:"gold";let B=(0,$.rG)({type:"player",category:"any",level:__mbGold,minBid:0,maxBid:0,minBuy:0,maxBuy:T,maskedDefId:0,defId:[]}),D=!0;const __mbKey=[T,e.idAbMinRating,e.idAbMaxRating,String(__mbGold)].join("|");__mbPoolKey!==__mbKey&&(__mbPoolKey=__mbKey,__mbPool.clear(),(0,a.sO)("currentPage",1),m=1);const M=(0,$.h1)(B);';
    if (code.includes(criteriaNeedle)) code = code.replace(criteriaNeedle, criteriaReplacement);

    // Accumulate up to 21 fully eligible cards across EA pages, then buy one from that pool.
    const resultNeedle = 'r.success&&r.data&&Array.isArray(r.data.items)){(0,a.sO)("searchFailedCount",0);let t=!0;(0,c.c2)(r.data.items.length?`${r.data.items.length} carte(s) · page ${m}`:`Aucun élément · page ${m}`,i.idProgressAutobuyer),';
    const resultReplacement = 'r.success&&r.data&&Array.isArray(r.data.items)){r.__mbRawItemCount=r.data.items.length;const __mbMinF=parseInt(e.idAbMinRating,10),__mbMaxF=parseInt(e.idAbMaxRating,10);for(const z of r.data.items){const A=z&&z._auction,p=A&&parseInt(A.buyNowPrice,10);let q=NaN;try{q=parseInt(z&&z.rating,10)}catch(e){}if(!Number.isFinite(q))try{q=parseInt(z&&"function"==typeof z.getRating?z.getRating():NaN,10)}catch(e){}if(!Number.isFinite(q))try{const e=z&&z._staticData||{};q=parseInt(e.rating||e.overallRating||e.overall||e.ovr||NaN,10)}catch(e){}const ty=String(z&&z.type||"").toLowerCase(),okPlayer="player"===ty||Number.isFinite(q),okRating=Number.isFinite(q)&&q>=75&&(!Number.isFinite(__mbMinF)||q>=__mbMinF)&&(!Number.isFinite(__mbMaxF)||q<=__mbMaxF),okPrice=Number.isFinite(p)&&p>0&&(!T||p<=T);if(okPlayer&&okRating&&okPrice){const id=String(A&&A.tradeId||z.id||z.definitionId+"-"+p+"-"+q);__mbPool.set(id,z)}}const __mbPoolCount=__mbPool.size,__mbReady=__mbPoolCount>=21||r.__mbRawItemCount<21||m>=5;r.__mbPoolReady=__mbReady;r.data.items=__mbReady?Array.from(__mbPool.values()).sort(((x,y)=>(y&&y._auction&&y._auction.buyNowPrice||0)-(x&&x._auction&&x._auction.buyNowPrice||0))).slice(0,21):[];__mbReady&&__mbPool.clear();(0,a.sO)("searchFailedCount",0);let t=!0;(0,c.c2)(`EA回傳 ${r.__mbRawItemCount} 張 · 候選池 ${__mbPoolCount}/21 · page ${m}`,i.idProgressAutobuyer),';
    if (code.includes(resultNeedle)) code = code.replace(resultNeedle, resultReplacement);

    const paginationNeedle = 'const s=r.data&&r.data.items&&r.data.items.length||0;m<e.idAbMaxSearchPage&&21===s?(0,a._i)("currentPage"):(0,a.sO)("currentPage",1),t()';
    const paginationReplacement = 'const s=r.__mbRawItemCount||0;r.__mbPoolReady?(0,a.sO)("currentPage",1):m<5&&21===s?(0,a._i)("currentPage"):(0,a.sO)("currentPage",1),t()';
    if (code.includes(paginationNeedle)) code = code.replace(paginationNeedle, paginationReplacement);

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
      console.log('[MagicBuyer FC27 TC] 已載入修正版 tc17');
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
