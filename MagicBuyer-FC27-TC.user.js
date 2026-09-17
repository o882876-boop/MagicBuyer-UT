// ==UserScript==
// @name         MagicBuyer FC27 繁體中文版
// @namespace    http://tampermonkey.net/
// @version      4.0.0-fc27fix-tc4
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
    ['RUNNING','運行中'],['PAUSED','已暫停'],['IDLE','待機'],
    ['Autobuyer Started','自動買家已開始'],['Autobuyer Stopped','自動買家已停止'],['Autobuyer Paused','自動買家已暫停'],['Autobuyer Resumed','自動買家已繼續'],
    ['Démarrer','開始'],['Arrêter','停止'],['Reprendre','繼續'],['Pause','暫停'],['Stop','停止'],
    ['Recherche','搜尋'],['Requêtes','搜尋次數'],['Acheter','買入'],['Achat','買入'],['Vendre','出售'],['Vente','出售'],['Enchère','出價'],
    ['Filtres','篩選'],['Filtre','篩選'],['Paramètres','設定'],['Prix','價格'],['Joueur','球員'],['Joueurs','球員'],
    ['Nom','名稱'],['Rareté','稀有度'],['Poste','位置'],['Styles de jeu','PlayStyle'],['Pays / région','國家／地區'],['Championnat','聯賽'],['Club','球會'],
    ['Tous','全部'],['Toutes','全部'],['Argent','銀卡'],['Or','金卡'],['Spéciale','特殊卡'],
    ['Prix min.','最低出價'],['Prix max.','最高出價'],['Min. achat imm.','最低立即購買'],['Max. achat imm.','最高立即購買'],
    ['Journal','運行記錄'],['Statistiques','統計'],['Gagnés','買入成功'],['Vendus','已售出'],['Invendus','未售出'],['Dispo','可用'],['Actifs','放售中'],['Bénéfice','利潤'],['Profit','利潤'],['Coins','金幣'],
    ['État','狀態'],['Temps','時間'],['Sécurité','安全'],['Marché','市場'],['Plus','更多'],['Vider les logs','清除記錄'],

    // 買入頁
    ["Prix d'achat auto",'自動買入價格'],['Utilise le prix FUTBIN pour l’achat immédiat','使用 FUTBIN 價格作立即買入參考'],['Utilise le prix FUTBIN pour l\'achat immédiat','使用 FUTBIN 價格作立即買入參考'],
    ['% du prix marché','市場價格百分比'],['Pourcentage du prix FUTBIN — 92% = marge de sécu','FUTBIN 價格百分比 — 92% = 預留安全利潤'],
    ['Enchérir au prix FUTBIN','按 FUTBIN 價格出價'],['Enchère si le bid actuel est sous le prix FUTBIN','目前出價低於 FUTBIN 價格時才出價'],
    ["Prix d'achat max",'最高買入價'],['Achat immédiat seulement si BIN ≤ ce montant','只有立即買入價不高於此金額時才購買'],
    ['Cartes max à acheter','最多購買張數'],['Stoppe le bot une fois ce total atteint','買滿此數量後自動停止'],
    ['Enchère max','最高出價'],["N'enchérit pas au-delà de ce montant",'不會出價高於此金額'],
    ['Enchérir si expire dans','只在即將到期時出價'],['S = sec, M = min, H = heures','S = 秒，M = 分鐘，H = 小時'],
    ['Seuil de résultats','搜尋結果上限'],['Ignore la page si trop de résultats — concurrence élevée','結果太多時略過該頁 — 代表競爭較高'],
    ['Enchère au prix exact','使用精確出價'],["Sans round EA des paliers d'enchère",'不使用 EA 出價級距自動取整'],

    // 賣出頁
    ['Prix de vente auto','自動售價'],['Utilise le prix FUTBIN pour lister','使用 FUTBIN 價格放售'],['% du prix de vente','售價百分比'],
    ["Fourchette % du prix FUTBIN — au-dessus de l'EA tax 5%",'FUTBIN 售價百分比範圍 — 已考慮 EA 5% 手續費'],
    ["Vérifier le prix d'achat",'檢查買入價'],['Liste seulement si achat < prix de vente','只有買入價低於售價時才放售'],
    ['Prix de vente','售價'],['Après taxe','扣稅後'],['transfert list','轉會列表'],['Durée de l’annonce','放售時間'],['Durée de l\'annonce','放售時間'],["Durée d'une mise en vente",'每次放售持續時間'],
    ['Vider les vendus à','已售物品達指定數量後清除'],['Nettoie les vendus après ce nombre','達到此數量後清理已售物品'],
    ['Note max à lister','最高放售評分'],['Ne liste pas au-dessus de cette note','評分高於此數值不會放售'],
    ['Relister les invendus','重新放售未售物品'],['Ne pas déplacer les cartes gagnées','不要移動已買到的卡'],['Reste en non assigné / cibles','保留在未分配／轉會目標'],

    // 市場設定頁
    ['Liste ignore / only-buy','忽略清單／只買清單'],["ON = n'achète que ces joueurs, OFF = les ignore",'開啟 = 只買清單內球員；關閉 = 忽略清單內球員'],
    ['Note min','最低評分'],['Note minimale du joueur','球員最低評分'],['Note max','最高評分'],['Note maximale du joueur','球員最高評分'],
    ['Pages de recherche max','最多搜尋頁數'],['Nombre de pages avant de revenir à la page 1','搜尋多少頁後返回第 1 頁'],
    ['Min bid aléatoire max','隨機最低出價上限'],['Varie minBid pour éviter les caches EA','隨機改變最低出價以減少 EA 快取重複結果'],['Min bid aléatoire','隨機最低出價'],
    ['Min buy aléatoire max','隨機最低立即買入上限'],['Varie minBuy pour éviter les caches EA','隨機改變最低買入價以減少 EA 快取重複結果'],['Min buy aléatoire','隨機最低買入價'],
    ['Recommandé pour mixer les résultats','建議開啟以混合搜尋結果'],['Ignorer les gardiens','忽略門將'],['Skip tous les GK','略過所有門將'],['Trier les joueurs','排序球員'],
    ['Players List','球員清單'],['Remove from Players List','從球員清單移除'],['Search Players','搜尋球員'],['Liste joueurs EA indisponible.','EA 球員清單暫時不可用。'],
    ['Le bot utilise tes critères de recherche du marché des transferts.','程式會使用你在轉會市場設定的搜尋條件。'],
    ['--Select Sort Attribute--','--選擇排序方式--'],['Expires on','到期時間'],['Buy now price','立即買入價'],['Bid now price','目前出價'],['Player rating','球員評分'],['Order','排序方向'],['Enabled = descending, Disabled = ascending','開啟 = 由高至低；關閉 = 由低至高'],

    ['Aucune recherche capturée — cherche un joueur dans Cible, ou lance une recherche sur le marché.','未捕捉到搜尋條件 — 請選擇球員或先在市場搜尋。'],
    ['Bot démarré — recherche en cours','自動買家已開始 — 正在搜尋'],['Reprise du bot','自動買家已繼續'],['Recherche marché','市場搜尋'],['Transfer Market Search','轉會市場搜尋'],['Transfer Market Results - List View','轉會市場結果'],
    ['Aucun élément','沒有搜尋結果'],['carte(s)','張卡'],['Joueur ignoré','已忽略此球員'],['Cached Item','已處理此物品'],['Coins insuffisants pour acheter/enchérir','金幣不足，無法買入／出價'],
    ['essaye d’achat à','嘗試買入'],["essaye d'achat à",'嘗試買入'],['tentative d’enchère à','嘗試出價'],["tentative d'enchère à",'嘗試出價'],['achat avec succès','買入成功'],['buy failed','買入失敗'],
    ['mise en vente','正在放售'],['listée à','已放售於'],['liste des transferts pleine','轉會列表已滿'],['envoyée au club','已送回球會'],
    ['Erreur recherche','搜尋錯誤'],['Erreur API marché','市場 API 錯誤'],['API marché introuvable','找不到市場 API'],['Search failed','搜尋失敗'],['Request Rejected','請求被拒絕'],['Too many request from this user','搜尋過於頻密'],['Other user won the (card / bid)','物品已被其他玩家買走'],['Attention !','注意！']
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
    timer = setTimeout(() => { try { if (document.body) translateNode(document.body); } catch (_) {} }, 50);
  };

  const startTranslator = () => {
    if (!document.documentElement) return setTimeout(startTranslator, 100);
    const obs = new MutationObserver(translatePage);
    obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
    translatePage();
    setInterval(translatePage, 1200);
  };

  const patchCode = (source) => {
    let code = source;
    const oldExact = 'const h=new Set((e.idAddIgnorePlayersList||[]).map((({id:e})=>e)))';
    const replacement = 'const h=new Set((()=>{const t=e.idAddIgnorePlayersList;if(!t)return[];if(Array.isArray(t))return t;if(t instanceof Set)return[...t];if(t instanceof Map)return[...t.values()];if("string"==typeof t)try{const e=JSON.parse(t);return Array.isArray(e)?e:[]}catch(e){return[]}return"object"==typeof t?Object.values(t):[]})().map((e=>"object"==typeof e&&e?e.id:e)).filter(Boolean))';
    if (code.includes(oldExact)) code = code.replace(oldExact, replacement);
    else code = code.replace(/const h=new Set\(\(e\.idAddIgnorePlayersList\|\|\[\]\)\.map\(\(\(\{id:e\}\)=>e\)\)\)/, replacement);

    const syncNeedle = 'const i=P();return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    const syncReplacement = 'let i;try{i=P()}catch(e){console.warn("[MagicBuyer FC27] criteria sync failed",e),i=(0,a.NA)("lastSearchCriteria")||{type:"player",defId:[]}}return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    if (code.includes(syncNeedle)) code = code.replace(syncNeedle, syncReplacement);
    return code;
  };

  const run = (source) => {
    try {
      const patched = patchCode(source);
      eval(patched + '\n//# sourceURL=MagicBuyer-FC27-TC-runtime.js');
      console.log('[MagicBuyer FC27 TC] 已載入修正版 tc4');
      startTranslator();
    } catch (err) {
      console.error('[MagicBuyer FC27 TC] 載入失敗', err);
      startTranslator();
    }
  };

  GM_xmlhttpRequest({
    method:'GET',
    url:SOURCE_URL + '?t=' + Date.now(),
    onload:(res)=>{ if (res.status>=200 && res.status<300 && res.responseText) run(res.responseText); else console.error('[MagicBuyer FC27 TC] 無法下載原程式：HTTP '+res.status); },
    onerror:(err)=>console.error('[MagicBuyer FC27 TC] 無法下載原程式',err)
  });
})();
