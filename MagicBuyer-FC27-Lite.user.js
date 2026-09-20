// ==UserScript==
// @name         MagicBuyer Lite FC27 繁體中文
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  FC27 簡化自動買家：只搜球員 + 黃金級別 + 總評/BIN 硬過濾
// @author       o882876-boop / OpenAI
// @match        https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app*
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app*
// @run-at       document-idle
// @grant        unsafeWindow
// @downloadURL  https://raw.githubusercontent.com/o882876-boop/MagicBuyer-UT/master/MagicBuyer-FC27-Lite.user.js
// @updateURL    https://raw.githubusercontent.com/o882876-boop/MagicBuyer-UT/master/MagicBuyer-FC27-Lite.user.js
// ==/UserScript==

(() => {
  'use strict';

  const page = (() => {
    try { return typeof unsafeWindow !== 'undefined' && unsafeWindow ? unsafeWindow : window; }
    catch (_) { return window; }
  })();

  const state = {
    running: false,
    paused: false,
    timer: null,
    searches: 0,
    bought: 0,
    seen: new Set(),
    busy: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const log = (text, type = 'info') => {
    const list = $('#mbl-log');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'mbl-log-row ' + type;
    row.innerHTML = '<span class="mbl-time">' + new Date().toLocaleTimeString() + '</span><span>' + escapeHtml(text) + '</span>';
    list.prepend(row);
    while (list.children.length > 120) list.lastElementChild.remove();
  };

  const escapeHtml = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));

  const getServices = () => {
    try {
      return (page && page.services) || window.services || null;
    } catch (_) {
      return null;
    }
  };

  const getRating = (player) => {
    let r = NaN;
    try { r = parseInt(player && player.rating, 10); } catch (_) {}
    if (!Number.isFinite(r)) {
      try {
        if (player && typeof player.getRating === 'function') r = parseInt(player.getRating(), 10);
      } catch (_) {}
    }
    if (!Number.isFinite(r)) {
      try {
        const s = (player && player._staticData) || {};
        r = parseInt(s.rating || s.overallRating || s.overall || s.ovr, 10);
      } catch (_) {}
    }
    return r;
  };

  const getName = (player) => {
    try {
      return (player && player._staticData && player._staticData.name) ||
        player.lastName || player.name || '球員';
    } catch (_) {
      return '球員';
    }
  };

  const getAuction = (player) => (player && (player._auction || (typeof player.getAuctionData === 'function' && player.getAuctionData()))) || null;

  const isPlayerCard = (item) => {
    try {
      if (!item) return false;
      const t = String(item.type || item.itemType || item._type || '').toLowerCase();
      if (t === 'player') return true;
      if (item._staticData) {
        const st = String(item._staticData.type || item._staticData.itemType || '').toLowerCase();
        if (st === 'player') return true;
      }
      // FC27 player objects normally expose rating / preferredPosition / definitionId.
      return Number.isFinite(getRating(item)) &&
        (!!item.definitionId || !!item.preferredPosition || !!item._staticData);
    } catch (_) {
      return false;
    }
  };

  const isGoldCard = (item) => {
    if (!isPlayerCard(item)) return false;
    const rating = getRating(item);
    if (!Number.isFinite(rating) || rating < 75) return false;

    try {
      const values = [
        item.level, item.quality, item.tier, item.rarity, item.itemQuality,
        item._staticData && item._staticData.level,
        item._staticData && item._staticData.quality,
        item._staticData && item._staticData.tier,
        item._staticData && item._staticData.rarity
      ].filter((v) => v != null).map((v) => String(v).toLowerCase());

      // If EA exposes an explicit bronze/silver marker, reject it.
      if (values.some((v) => /bronze|silver|銅|銀/.test(v))) return false;
      // A visible gold marker is a positive match.
      if (values.some((v) => /gold|黃金/.test(v))) return true;
    } catch (_) {}

    // In Ultimate Team, player ratings 75+ are gold-tier for base quality.
    return rating >= 75;
  };

  const getSettings = () => {
    const minRating = parseInt($('#mbl-min-rating')?.value, 10);
    const maxRating = parseInt($('#mbl-max-rating')?.value, 10);
    const maxBuy = parseInt($('#mbl-max-buy')?.value, 10);
    const rarity = ($('#mbl-rarity')?.value || 'gold').trim();
    const waitMin = parseInt($('#mbl-wait-min')?.value, 10);
    const waitMax = parseInt($('#mbl-wait-max')?.value, 10);
    const maxPerCycle = parseInt($('#mbl-max-cycle')?.value, 10);
    const autoBuy = !!$('#mbl-auto-buy')?.checked;

    return {
      minRating: Number.isFinite(minRating) ? minRating : 75,
      maxRating: Number.isFinite(maxRating) ? maxRating : 99,
      maxBuy: Number.isFinite(maxBuy) ? maxBuy : 800,
      rarity,
      waitMin: Number.isFinite(waitMin) ? Math.max(3, waitMin) : 8,
      waitMax: Number.isFinite(waitMax) ? Math.max(3, waitMax) : 12,
      maxPerCycle: Number.isFinite(maxPerCycle) ? Math.max(1, maxPerCycle) : 1,
      autoBuy,
    };
  };

  const ensureArrays = (dto) => {
    ['defId','rarities','types','playStyles','roles','playerRoles','traits','chemistryStyles'].forEach((k) => {
      try { if (!Array.isArray(dto[k])) dto[k] = []; } catch (_) {}
    });
    return dto;
  };

  const makeCriteria = (settings) => {
    let dto = {};
    const Ctors = ['UTSearchCriteriaDTO','SearchCriteria','UTItemSearchCriteriaDTO','UTMarketSearchCriteriaDTO'];
    for (const name of Ctors) {
      try {
        if (typeof page[name] === 'function') {
          dto = new page[name]();
          break;
        }
      } catch (_) {}
    }

    const values = {
      type: 'player',
      category: 'any',
      position: 'any',
      zone: -1,
      nationality: -1,
      league: -1,
      club: -1,
      playStyle: -1,
      playStylePlus: -1,
      minBid: 0,
      maxBid: 0,
      minBuy: 0,
      maxBuy: settings.maxBuy,
      level: settings.rarity || 'gold',
      maskedDefId: 0,
    };

    Object.keys(values).forEach((k) => {
      try { dto[k] = values[k]; } catch (_) {}
    });
    try { dto.defId = []; } catch (_) {}
    return ensureArrays(dto);
  };

  const observeOnce = (result, timeoutMs = 15000) => new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('等待 EA 回應逾時'));
    }, timeoutMs);

    const finish = (err, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      err ? reject(err) : resolve(value);
    };

    try {
      if (result && typeof result.observe === 'function') {
        result.observe(null, (_sender, response) => finish(null, response));
        return;
      }
      if (result && typeof result.then === 'function') {
        result.then((response) => finish(null, response)).catch((e) => finish(e));
        return;
      }
      finish(null, result);
    } catch (e) {
      finish(e);
    }
  });

  const normalizeItems = (response) => {
    const payload =
      (response && response.data) ||
      (response && response.response) ||
      response ||
      {};
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.itemData)) return payload.itemData;
    return [];
  };

  const buyNow = async (player, price) => {
    const services = getServices();
    if (!services || !services.Item || typeof services.Item.bid !== 'function') {
      throw new Error('搵唔到 EA 買入 API');
    }
    const result = services.Item.bid(player, price);
    const response = await observeOnce(result, 12000);
    if (response && response.success === false) {
      const code = (response.error && response.error.code) || response.status || 'unknown';
      throw new Error('買入失敗 ' + code);
    }
    return response;
  };

  const updateHeader = () => {
    const s = getSettings();
    const summary = $('#mbl-summary');
    if (summary) {
      const rarityName = s.rarity === 'gold' ? '黃金' : s.rarity === 'silver' ? '白銀' : s.rarity === 'bronze' ? '銅' : '任何';
      summary.textContent = `${rarityName} · 總評 ${s.minRating}–${s.maxRating} · BIN ≤ ${s.maxBuy}`;
    }
    const stat = $('#mbl-stats');
    if (stat) stat.textContent = `搜尋 ${state.searches} · 買入成功 ${state.bought}`;
    const status = $('#mbl-status');
    if (status) {
      status.textContent = state.running ? (state.paused ? '已暫停' : '運行中') : '已停止';
      status.dataset.state = state.running ? (state.paused ? 'pause' : 'run') : 'stop';
    }
  };

  const searchOnce = async () => {
    if (!state.running || state.paused || state.busy) return;
    state.busy = true;
    try {
      const settings = getSettings();
      if (settings.minRating < 1 || settings.maxRating > 99 || settings.minRating > settings.maxRating) {
        throw new Error('總評範圍無效');
      }
      if (settings.maxBuy < 150) throw new Error('最高 BIN 太低');

      const services = getServices();
      if (!services || !services.Item || typeof services.Item.searchTransferMarket !== 'function') {
        throw new Error('EA 市場 API 未準備好，請先入一次轉會市場');
      }

      const criteria = makeCriteria(settings);
      const rarityName = settings.rarity === 'gold' ? '黃金' : settings.rarity === 'silver' ? '白銀' : settings.rarity === 'bronze' ? '銅' : '任何';
      log(`搜尋：${rarityName} · 總評 ${settings.minRating}–${settings.maxRating} · BIN ≤ ${settings.maxBuy}`);

      let request;
      try {
        request = services.Item.searchTransferMarket(criteria, 1);
      } catch (_) {
        request = services.Item.searchTransferMarket(criteria);
      }

      const response = await observeOnce(request);
      const items = normalizeItems(response);
      state.searches++;

      const playerItems = items.filter(isPlayerCard);
      const goldItems = settings.rarity === 'gold'
        ? playerItems.filter(isGoldCard)
        : playerItems;
      const eligible = goldItems.filter((player) => {
        const auction = getAuction(player);
        const rating = getRating(player);
        const bin = auction && parseInt(auction.buyNowPrice, 10);
        return Number.isFinite(rating) &&
          rating >= settings.minRating &&
          rating <= settings.maxRating &&
          Number.isFinite(bin) &&
          bin > 0 &&
          bin <= settings.maxBuy;
      });

      log(
        `EA 回傳 ${items.length} 張；球員 ${playerItems.length} 張；${settings.rarity === 'gold' ? '黃金 ' + goldItems.length + ' 張；' : ''}符合條件 ${eligible.length} 張`,
        eligible.length ? 'ok' : 'info'
      );

      if (!settings.autoBuy || !eligible.length) {
        updateHeader();
        return;
      }

      eligible.sort((a, b) => {
        const aa = getAuction(a), bb = getAuction(b);
        return (aa?.buyNowPrice || Infinity) - (bb?.buyNowPrice || Infinity);
      });

      let boughtThisCycle = 0;
      for (const player of eligible) {
        if (!state.running || state.paused || boughtThisCycle >= settings.maxPerCycle) break;
        const auction = getAuction(player);
        if (!auction) continue;
        const tradeId = auction.tradeId || auction.id;
        if (tradeId && state.seen.has(tradeId)) continue;
        if (tradeId) state.seen.add(tradeId);

        const rating = getRating(player);
        const name = getName(player);
        const price = parseInt(auction.buyNowPrice, 10);

        // Final hard guard immediately before the purchase call.
        if (!(rating >= settings.minRating && rating <= settings.maxRating && price <= settings.maxBuy)) {
          log(`跳過 ${name} (${rating}) · ${price}`, 'warn');
          continue;
        }

        try {
          log(`嘗試買入 ${name} (${rating}) · ${price}`, 'buy');
          await buyNow(player, price);
          state.bought++;
          boughtThisCycle++;
          log(`買入成功：${name} (${rating}) · ${price}`, 'success');
          await sleep(1200);
        } catch (e) {
          log(`買入失敗：${name} · ${e && e.message ? e.message : e}`, 'error');
        }
      }
      updateHeader();
    } catch (e) {
      log(e && e.message ? e.message : String(e), 'error');
    } finally {
      state.busy = false;
      updateHeader();
    }
  };

  const scheduleNext = () => {
    clearTimeout(state.timer);
    if (!state.running || state.paused) return;
    const s = getSettings();
    const lo = Math.min(s.waitMin, s.waitMax);
    const hi = Math.max(s.waitMin, s.waitMax);
    const seconds = Math.round(Math.random() * (hi - lo) + lo);
    state.timer = setTimeout(async () => {
      await searchOnce();
      scheduleNext();
    }, seconds * 1000);
  };

  const start = async () => {
    if (state.running && !state.paused) return;
    state.running = true;
    state.paused = false;
    updateHeader();
    log('開始運行', 'ok');
    await searchOnce();
    scheduleNext();
  };

  const pause = () => {
    if (!state.running) return;
    state.paused = true;
    clearTimeout(state.timer);
    updateHeader();
    log('已暫停');
  };

  const stop = () => {
    state.running = false;
    state.paused = false;
    clearTimeout(state.timer);
    updateHeader();
    log('已停止');
  };

  const addStyles = () => {
    if ($('#mbl-style')) return;
    const style = document.createElement('style');
    style.id = 'mbl-style';
    style.textContent = `
      #mbl-fab{position:fixed;right:22px;bottom:22px;z-index:2147483646;border:0;border-radius:14px;padding:12px 16px;background:#38d6b2;color:#08131f;font-weight:800;box-shadow:0 10px 30px #0008;cursor:pointer}
      #mbl-overlay{position:fixed;inset:0;z-index:2147483645;background:#07101be8;display:none;font-family:Arial,sans-serif;color:#eef5ff}
      #mbl-overlay.open{display:flex;align-items:center;justify-content:center}
      #mbl-panel{width:min(900px,94vw);max-height:90vh;overflow:auto;background:#101827;border:1px solid #294055;border-radius:20px;padding:20px;box-shadow:0 24px 80px #000a}
      .mbl-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.mbl-title{font-size:24px;font-weight:800}.mbl-sub{font-size:13px;color:#9fb0c2}
      .mbl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.mbl-field{background:#162233;border:1px solid #27394c;border-radius:14px;padding:12px}.mbl-field label{display:block;font-size:13px;color:#9fb0c2;margin-bottom:7px}.mbl-field input[type=number],.mbl-field select{width:100%;box-sizing:border-box;background:#0e1724;color:#67f0ce;border:1px solid #2b6f71;border-radius:10px;padding:11px;font-size:18px}
      .mbl-actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.mbl-actions button,.mbl-close{border:0;border-radius:11px;padding:10px 16px;font-weight:800;cursor:pointer}.mbl-start{background:#3bd8b6}.mbl-pause{background:#ffa544}.mbl-stop{background:#f4555d;color:white}.mbl-clear,.mbl-close{background:#263244;color:#eef5ff}
      .mbl-summary{background:#132637;border:1px solid #245766;border-radius:12px;padding:12px;margin-bottom:12px}.mbl-statusline{display:flex;gap:12px;color:#9fb0c2;font-size:13px;margin-bottom:12px}
      #mbl-log{background:#0a111c;border:1px solid #26364a;border-radius:14px;padding:10px;min-height:260px;max-height:360px;overflow:auto}.mbl-log-row{display:grid;grid-template-columns:85px 1fr;gap:8px;padding:9px;border-bottom:1px solid #1c2a3a;font-size:14px}.mbl-time{color:#76889a}.mbl-log-row.success{color:#78efb8}.mbl-log-row.error{color:#ff8d94}.mbl-log-row.warn{color:#ffd17a}.mbl-log-row.buy{color:#79c7ff}
      .mbl-check{display:flex;align-items:center;gap:8px}.mbl-check input{width:18px;height:18px}
      #mbl-status[data-state=run]{color:#62e6ad}#mbl-status[data-state=pause]{color:#ffc266}#mbl-status[data-state=stop]{color:#ff858a}
      @media(max-width:700px){.mbl-grid{grid-template-columns:1fr 1fr}}
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const mount = () => {
    if (!document.body || $('#mbl-fab')) return;
    addStyles();

    const fab = document.createElement('button');
    fab.id = 'mbl-fab';
    fab.type = 'button';
    fab.textContent = 'MB Lite';
    document.body.appendChild(fab);

    const overlay = document.createElement('div');
    overlay.id = 'mbl-overlay';
    overlay.innerHTML = `
      <div id="mbl-panel">
        <div class="mbl-head">
          <div><div class="mbl-title">MagicBuyer Lite FC27</div><div class="mbl-sub">只做球員 BIN 搜尋 + 總評過濾 + 自動買入</div></div>
          <button class="mbl-close" type="button">關閉</button>
        </div>
        <div id="mbl-summary" class="mbl-summary">黃金 · 總評 75–99 · BIN ≤ 800</div>
        <div class="mbl-grid">
          <div class="mbl-field"><label>卡片級別</label><select id="mbl-rarity"><option value="gold" selected>黃金</option><option value="silver">白銀</option><option value="bronze">銅</option><option value="any">任何</option></select></div>
          <div class="mbl-field"><label>最低總評</label><input id="mbl-min-rating" type="number" min="1" max="99" value="75"></div>
          <div class="mbl-field"><label>最高總評</label><input id="mbl-max-rating" type="number" min="1" max="99" value="99"></div>
          <div class="mbl-field"><label>最高立即購買 BIN</label><input id="mbl-max-buy" type="number" min="150" step="50" value="800"></div>
          <div class="mbl-field"><label>搜尋間隔最少（秒）</label><input id="mbl-wait-min" type="number" min="3" value="8"></div>
          <div class="mbl-field"><label>搜尋間隔最多（秒）</label><input id="mbl-wait-max" type="number" min="3" value="12"></div>
          <div class="mbl-field"><label>每次最多買幾張</label><input id="mbl-max-cycle" type="number" min="1" max="10" value="1"></div>
        </div>
        <div class="mbl-actions">
          <label class="mbl-check"><input id="mbl-auto-buy" type="checkbox" checked> 自動買入</label>
        </div>
        <div class="mbl-actions">
          <button type="button" class="mbl-start">開始</button>
          <button type="button" class="mbl-pause">暫停</button>
          <button type="button" class="mbl-stop">停止</button>
          <button type="button" class="mbl-clear">清除記錄</button>
        </div>
        <div class="mbl-statusline"><span>狀態：<b id="mbl-status" data-state="stop">已停止</b></span><span id="mbl-stats">搜尋 0 · 買入成功 0</span></div>
        <div id="mbl-log"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    fab.addEventListener('click', () => overlay.classList.add('open'));
    $('.mbl-close', overlay).addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
    $('.mbl-start', overlay).addEventListener('click', start);
    $('.mbl-pause', overlay).addEventListener('click', pause);
    $('.mbl-stop', overlay).addEventListener('click', stop);
    $('.mbl-clear', overlay).addEventListener('click', () => { const x=$('#mbl-log'); if(x) x.innerHTML=''; });

    overlay.querySelectorAll('input, select').forEach((input) => {
      input.addEventListener('input', updateHeader);
      input.addEventListener('change', updateHeader);
    });

    updateHeader();
    log('Lite 已載入。建議先取消「自動買入」測試搜尋結果。');
  };

  const boot = async () => {
    for (let i = 0; i < 60; i++) {
      if (document.body) break;
      await sleep(250);
    }
    mount();
    setInterval(() => {
      if (!$('#mbl-fab')) mount();
    }, 2000);
  };

  boot();
})();