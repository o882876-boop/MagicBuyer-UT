// ==UserScript==
// @name         MagicBuyer FC27 繁體中文版
// @namespace    http://tampermonkey.net/
// @version      4.0.0-fc27fix-tc3
// @description  MagicBuyer FC27 相容修正 + 繁體中文介面
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

  const translations = [
    ['RUNNING', '運行中'], ['PAUSED', '已暫停'], ['IDLE', '待機'],
    ['Autobuyer Started', '自動買家已開始'], ['Autobuyer Stopped', '自動買家已停止'], ['Autobuyer Paused', '自動買家已暫停'],
    ['Démarrer', '開始'], ['Arrêter', '停止'], ['Reprendre', '繼續'], ['Pause', '暫停'],
    ['Recherche', '搜尋'], ['Requêtes', '搜尋次數'], ['Acheter', '買入'], ['Achat', '買入'], ['Vendre', '出售'], ['Vente', '出售'], ['Enchère', '出價'],
    ['Filtres', '篩選'], ['Filtre', '篩選'], ['Paramètres', '設定'], ['Prix', '價格'], ['Joueur', '球員'], ['Joueurs', '球員'],
    ['Nom', '名稱'], ['Rareté', '稀有度'], ['Poste', '位置'], ['Styles de jeu', 'PlayStyle'], ['Pays / région', '國家／地區'],
    ['Championnat', '聯賽'], ['Club', '球會'], ['Tous', '全部'], ['Toutes', '全部'], ['Argent', '銀卡'], ['Or', '金卡'], ['Spéciale', '特殊卡'],
    ['Prix min.', '最低出價'], ['Prix max.', '最高出價'], ['Min. achat imm.', '最低立即購買'], ['Max. achat imm.', '最高立即購買'],
    ['Journal', '運行記錄'], ['Statistiques', '統計'], ['Gagnés', '買入成功'], ['Vendus', '已售出'], ['Invendus', '未售出'],
    ['Dispo', '可用'], ['Disponible', '可用'], ['Disponibles', '可用'], ['Actifs', '放售中'], ['Transferts actifs', '放售中'], ['Bénéfice', '利潤'], ['Profit', '利潤'], ['Coins', '金幣'],
    ['État', '狀態'], ['Temps', '時間'], ['Sécurité', '安全'], ['Marché', '市場'], ['Plus', '更多'], ['Vider les logs', '清除記錄'],
    ['Aucune recherche capturée — cherche un joueur dans Cible, ou lance une recherche sur le marché.', '未捕捉到搜尋條件 — 請選擇球員或先在市場搜尋。'],
    ['Bot démarré — recherche en cours', '自動買家已開始 — 正在搜尋'], ['Reprise du bot', '自動買家已繼續'],
    ['Recherche marché', '市場搜尋'], ['Transfer Market Search', '轉會市場搜尋'], ['Transfer Market Results - List View', '轉會市場結果'],
    ['Aucun élément', '沒有搜尋結果'], ['carte(s)', '張卡'], ['Joueur ignoré', '已忽略此球員'], ['Cached Item', '已處理此物品'],
    ['Coins insuffisants pour acheter/enchérir', '金幣不足，無法買入／出價'], ['essaye d’achat à', '嘗試買入'], ["essaye d'achat à", '嘗試買入'],
    ['tentative d’enchère à', '嘗試出價'], ["tentative d'enchère à", '嘗試出價'], ['achat avec succès', '買入成功'], ['buy failed', '買入失敗'],
    ['mise en vente', '正在放售'], ['listée à', '已放售於'], ['liste des transferts pleine', '轉會列表已滿'], ['envoyée au club', '已送回球會'],
    ['Erreur recherche', '搜尋錯誤'], ['Erreur API marché', '市場 API 錯誤'], ['API marché introuvable', '找不到市場 API'],
    ['Search failed', '搜尋失敗'], ['Request Rejected', '請求被拒絕'], ['Too many request from this user', '搜尋過於頻密'],
    ['Other user won the (card / bid)', '物品已被其他玩家買走'], ['Attention !', '注意！'],
    ['Plus de 15 recherches effectuées en une minute, vous devez augmenter votre temps d’attente entre les recherches !', '每分鐘搜尋超過 15 次，請增加搜尋等待時間！'],
    ['Plus de 15 recherches effectuées en une minute, vous devez augmenter votre temps d\'attente entre les recherches !', '每分鐘搜尋超過 15 次，請增加搜尋等待時間！']
  ];

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
    for (const attr of ['placeholder', 'title', 'aria-label']) {
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
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    translatePage();
    setInterval(translatePage, 2000);
  };

  const patchCode = (source) => {
    let code = source;

    // FC27: ignore-list is not always an Array anymore.
    const oldExact = 'const h=new Set((e.idAddIgnorePlayersList||[]).map((({id:e})=>e)))';
    const replacement = 'const h=new Set((()=>{const t=e.idAddIgnorePlayersList;if(!t)return[];if(Array.isArray(t))return t;if(t instanceof Set)return[...t];if(t instanceof Map)return[...t.values()];if("string"==typeof t)try{const e=JSON.parse(t);return Array.isArray(e)?e:[]}catch(e){return[]}return"object"==typeof t?Object.values(t):[]})().map((e=>"object"==typeof e&&e?e.id:e)).filter(Boolean))';
    if (code.includes(oldExact)) {
      code = code.replace(oldExact, replacement);
    } else {
      code = code.replace(/const h=new Set\(\(e\.idAddIgnorePlayersList\|\|\[\]\)\.map\(\(\(\{id:e\}\)=>e\)\)\)/, replacement);
    }

    // FC27: the EA-native search controller can throw while syncing criteria.
    // In that case Start used to die before startAutoBuyer() was even called.
    const syncNeedle = 'const i=P();return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    const syncReplacement = 'let i;try{i=P()}catch(e){console.warn("[MagicBuyer FC27] criteria sync failed",e),i=(0,a.NA)("lastSearchCriteria")||{type:"player",defId:[]}}return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    if (code.includes(syncNeedle)) {
      code = code.replace(syncNeedle, syncReplacement);
    }

    return code;
  };

  const run = (source) => {
    try {
      const patched = patchCode(source);
      // Direct eval keeps Tampermonkey grants and unsafeWindow in scope.
      eval(patched + '\n//# sourceURL=MagicBuyer-FC27-TC-runtime.js');
      console.log('[MagicBuyer FC27 TC] 已載入修正版 tc3');
      startTranslator();
    } catch (err) {
      console.error('[MagicBuyer FC27 TC] 載入失敗', err);
      startTranslator();
    }
  };

  GM_xmlhttpRequest({
    method: 'GET',
    url: SOURCE_URL + '?t=' + Date.now(),
    onload: (res) => {
      if (res.status >= 200 && res.status < 300 && res.responseText) run(res.responseText);
      else console.error('[MagicBuyer FC27 TC] 無法下載原程式：HTTP ' + res.status);
    },
    onerror: (err) => console.error('[MagicBuyer FC27 TC] 無法下載原程式', err)
  });
})();
