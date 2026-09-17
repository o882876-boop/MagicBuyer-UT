// ==UserScript==
// @name         MagicBuyer FC27 繁體中文版
// @namespace    http://tampermonkey.net/
// @version      4.0.0-fc27fix-tc5
// @description  MagicBuyer FC27 相容修正 + 完整繁體中文介面
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
    // 完整句子及設定名稱（一定要先過長字串）
    ['Aucune recherche capturée — cherche un joueur dans Cible, ou lance une recherche sur le marché.','未捕捉到搜尋條件 — 請選擇球員或先在市場搜尋。'],
    ['Pourcentage du prix FUTBIN — 92% = marge de sécu','FUTBIN 價格百分比 — 92% = 預留安全利潤'],
    ["Fourchette % du prix FUTBIN — au-dessus de l'EA tax 5%",'FUTBIN 售價百分比範圍 — 已考慮 EA 5% 手續費'],
    ['Ignore la page si trop de résultats — concurrence élevée','結果太多時略過該頁 — 代表競爭較高'],
    ['Le bot utilise tes critères de recherche du marché des transferts.','程式會使用你在轉會市場設定的搜尋條件。'],
    ['Nombre de pages avant de revenir à la page 1','搜尋多少頁後返回第 1 頁'],
    ['Plus de 15 recherches effectuées en une minute, vous devez augmenter votre temps d’attente entre les recherches !','每分鐘搜尋超過 15 次，請增加搜尋等待時間！'],
    ['Count of searches performed before switching to another filter','切換至下一個篩選器前的搜尋次數'],
    ['Type A for all notifications, B for buy or L for lost','A = 全部通知，B = 買入通知，L = 錯失通知'],
    ['Your browser does not support the audio element','你的瀏覽器不支援音訊播放'],
    ['Achat immédiat seulement si BIN ≤ ce montant','只有立即買入價不高於此金額時才購買'],
    ['Stoppe le bot une fois ce total atteint','買滿此數量後自動停止'],
    ["N'enchérit pas au-delà de ce montant",'不會出價高於此金額'],
    ["Sans round EA des paliers d'enchère",'不使用 EA 出價級距自動取整'],
    ['Liste seulement si achat < prix de vente','只有買入價低於售價時才放售'],
    ['Nettoie les vendus après ce nombre','達到此數量後清理已售物品'],
    ['Ne liste pas au-dessus de cette note','評分高於此數值不會放售'],
    ['Reste en non assigné / cibles','保留在未分配／轉會目標'],
    ["ON = n'achète que ces joueurs, OFF = les ignore",'開啟 = 只買清單內球員；關閉 = 忽略清單內球員'],
    ['Varie minBid pour éviter les caches EA','隨機改變最低出價以減少 EA 快取重複結果'],
    ['Varie minBuy pour éviter les caches EA','隨機改變最低買入價以減少 EA 快取重複結果'],
    ['Recommandé pour mixer les résultats','建議開啟以混合搜尋結果'],
    ['Enabled = descending, Disabled = ascending','開啟 = 由高至低；關閉 = 由低至高'],
    ['Secondes aléatoires, ex. 8-12 — trop bas = risk 429','隨機秒數，例如 8-12；太低可能觸發 429'],
    ["Garde 1 sauf si tu as un délai d'achat ≥ 3S",'建議保持 1，除非買入延遲至少 3 秒'],
    ['Nombre de recherches avant une pause, ex. 12-18','暫停前的搜尋次數，例如 12-18'],
    ["Pause après une tentative d'achat / enchère",'每次嘗試買入／出價後暫停'],
    ['Log si plus de 15 recherches / minute','每分鐘超過 15 次搜尋時顯示警告'],
    ['Nombre de fois où le code doit arriver','錯誤碼出現多少次後停止'],
    ['Cibles de transfert expirées','已到期的轉會目標'],
    ['Toutes les 2 minutes','每 2 分鐘'],
    ['Token of your own bot','你自己機械人的 Token'],
    ['Your Telegram ChatID','你的 Telegram Chat ID'],
    ['Your Discord Bot Token','你的 Discord Bot Token'],
    ['Your Discord Channel ID','你的 Discord 頻道 ID'],
    ['Your Discord Channel Webhook Url','你的 Discord 頻道 Webhook 網址'],
    ["Your FUT Market Alert App's Token",'你的 FUT Market Alert App Token'],
    ['Test Notification Message','測試通知訊息'],

    // 買入頁
    ["Prix d'achat auto",'自動買入價格'],
    ["Utilise le prix FUTBIN pour l'achat immédiat",'使用 FUTBIN 價格作立即買入參考'],
    ['Utilise le prix FUTBIN pour l’achat immédiat','使用 FUTBIN 價格作立即買入參考'],
    ['% du prix marché','市場價格百分比'],
    ['Enchérir au prix FUTBIN','按 FUTBIN 價格出價'],
    ['Enchère si le bid actuel est sous le prix FUTBIN','目前出價低於 FUTBIN 價格時才出價'],
    ["Prix d'achat max",'最高買入價'],
    ['Cartes max à acheter','最多購買張數'],
    ['Enchère max','最高出價'],
    ['Enchérir si expire dans','只在即將到期時出價'],
    ['S = sec, M = min, H = heures','S = 秒，M = 分鐘，H = 小時'],
    ['Seuil de résultats','搜尋結果上限'],
    ['Enchère au prix exact','使用精確出價'],

    // 出售頁
    ['Prix de vente auto','自動售價'],
    ['Utilise le prix FUTBIN pour lister','使用 FUTBIN 價格放售'],
    ['% du prix de vente','售價百分比'],
    ["Vérifier le prix d'achat",'檢查買入價'],
    ['Prix de vente','售價'],
    ['Après taxe','扣稅後'],
    ['Durée de l’annonce','放售時間'],
    ["Durée de l'annonce",'放售時間'],
    ["Durée d'une mise en vente",'每次放售持續時間'],
    ['Vider les vendus à','已售物品達指定數量後清除'],
    ['Note max à lister','最高放售評分'],
    ['Relister les invendus','重新放售未售物品'],
    ['Ne pas déplacer les cartes gagnées','不要移動已買到的卡'],

    // 市場／搜尋設定
    ['Liste ignore / only-buy','忽略清單／只買清單'],
    ['Note minimale du joueur','球員最低評分'],
    ['Note maximale du joueur','球員最高評分'],
    ['Pages de recherche max','最多搜尋頁數'],
    ['Min bid aléatoire max','隨機最低出價上限'],
    ['Min bid aléatoire','隨機最低出價'],
    ['Min buy aléatoire max','隨機最低立即買入上限'],
    ['Min buy aléatoire','隨機最低買入價'],
    ['Ignorer les gardiens','忽略門將'],
    ['Skip tous les GK','略過所有門將'],
    ['Trier les joueurs','排序球員'],
    ['Players List','球員清單'],
    ['Remove from Players List','從球員清單移除'],
    ['Search Players','搜尋球員'],
    ['Liste joueurs EA indisponible.','EA 球員清單暫時不可用。'],
    ['--Select Sort Attribute--','--選擇排序方式--'],
    ['Expires on','到期時間'],
    ['Buy now price','立即買入價'],
    ['Bid now price','目前出價'],
    ['Player rating','球員評分'],
    ['Order','排序方向'],
    ['Note min','最低評分'],
    ['Note max','最高評分'],

    // 安全設定
    ['Pause entre recherches','搜尋之間等待'],
    ['Achats max par recherche','每次搜尋最多購買'],
    ['Cycle avant pause','暫停前循環次數'],
    ['Durée de pause','暫停時間'],
    ['Délai après achat','買入後延遲'],
    ['Délai à ajouter','額外延遲'],
    ['Arrêt automatique','自動停止'],
    ['Alerte trop de recherches','搜尋過密警告'],
    ['S / M / H — ex. 20-40S','S／M／H，例如 20-40S'],
    ['S / M / H — ex. 1-2H','S／M／H，例如 1-2H'],
    ['S / M / H — ex. 30-60S','S／M／H，例如 30-60S'],
    ['S / M / H','S／M／H'],

    // 篩選設定
    ['No. of search For each filter','每個篩選器搜尋次數'],
    ['Switch filter sequentially','依次切換篩選器'],
    ['Runner Mode','Runner 模式'],
    ['Choose filter to load','選擇要載入的篩選器'],
    ['Upload filters','上載篩選器'],
    ['Download filters','下載篩選器'],
    ['Delete Filter','刪除篩選器'],
    ['Save Filter','儲存篩選器'],
    ['Report a problem','回報問題'],

    // 更多／通知／Captcha／一般
    ['Telegram Bot Token','Telegram Bot Token'],
    ['Telegram Chat ID','Telegram Chat ID'],
    ['Discord Bot Token','Discord Bot Token'],
    ['Discord Channel ID','Discord 頻道 ID'],
    ['Discord WebHook Url','Discord Webhook 網址'],
    ['Fut Market Alert Notification Token','FUT Market Alert 通知 Token'],
    ['Send Listing Notification','發送放售通知'],
    ['Notification Type','通知類型'],
    ['Send Notification','發送通知'],
    ['Sound Notification','聲音通知'],
    ['Use Custom Discord Webhook Name','使用自訂 Discord Webhook 名稱'],
    ['Test Notification','測試通知'],
    ['Fermer la Web App si captcha','出現 Captcha 時關閉 Web App'],
    ['Résoudre le captcha auto','自動解決 Captcha'],
    ['Clé Anti-Captcha','Anti-Captcha Key'],
    ['Adresse proxy','Proxy 地址'],
    ['Port proxy','Proxy Port'],
    ['User proxy (optionnel)','Proxy 用戶名稱（選填）'],
    ['Mot de passe proxy (optionnel)','Proxy 密碼（選填）'],
    ["Codes erreur d'arrêt (csv)",'停止用錯誤碼（CSV）'],
    ['Occurrences avant arrêt','停止前錯誤次數'],
    ['Reprise après erreur','錯誤後恢復時間'],
    ['Vider les logs auto','自動清除記錄'],
    ['Vider les expirés auto','自動清除已到期項目'],
    ['Prix Futwiz','使用 Futwiz 價格'],
    ['Sinon FUTBIN','否則使用 FUTBIN'],

    // 狀態／記錄
    ['Bot démarré — recherche en cours','自動買家已開始 — 正在搜尋'],
    ['Reprise du bot','自動買家已繼續'],
    ['Recherche marché','市場搜尋'],
    ['Transfer Market Search','轉會市場搜尋'],
    ['Transfer Market Results - List View','轉會市場結果'],
    ['Aucun élément','沒有搜尋結果'],
    ['carte(s)','張卡'],
    ['Joueur ignoré','已忽略此球員'],
    ['Cached Item','已處理此物品'],
    ['Coins insuffisants pour acheter/enchérir','金幣不足，無法買入／出價'],
    ["essaye d'achat à",'嘗試買入'],
    ['essaye d’achat à','嘗試買入'],
    ["tentative d'enchère à",'嘗試出價'],
    ['tentative d’enchère à','嘗試出價'],
    ['achat avec succès','買入成功'],
    ['buy failed','買入失敗'],
    ['mise en vente','正在放售'],
    ['listée à','已放售於'],
    ['liste des transferts pleine','轉會列表已滿'],
    ['envoyée au club','已送回球會'],
    ['Erreur recherche','搜尋錯誤'],
    ['Erreur API marché','市場 API 錯誤'],
    ['API marché introuvable','找不到市場 API'],
    ['Search failed','搜尋失敗'],
    ['Request Rejected','請求被拒絕'],
    ['Too many request from this user','搜尋過於頻密'],
    ['Other user won the (card / bid)','物品已被其他玩家買走'],
    ['Attention !','注意！'],

    // 通用介面（短字串一律最後做）
    ['Autobuyer Started','自動買家已開始'],['Autobuyer Stopped','自動買家已停止'],['Autobuyer Paused','自動買家已暫停'],['Autobuyer Resumed','自動買家已繼續'],
    ['RUNNING','運行中'],['PAUSED','已暫停'],['IDLE','待機'],
    ['Démarrer','開始'],['Arrêter','停止'],['Reprendre','繼續'],['Pause','暫停'],['Stop','停止'],
    ['Requêtes','搜尋次數'],['Recherche','搜尋'],['Acheter','買入'],['Achat','買入'],['Vendre','出售'],['Vente','出售'],['Enchère','出價'],
    ['Filtres','篩選'],['Filtre','篩選'],['Paramètres','設定'],['Joueurs','球員'],['Joueur','球員'],
    ['Styles de jeu','PlayStyle'],['Pays / région','國家／地區'],['Championnat','聯賽'],['Rareté','稀有度'],['Poste','位置'],['Nom','名稱'],['Club','球會'],
    ['Toutes','全部'],['Tous','全部'],['Spéciale','特殊卡'],['Argent','銀卡'],['Or','金卡'],
    ['Prix min.','最低出價'],['Prix max.','最高出價'],['Min. achat imm.','最低立即購買'],['Max. achat imm.','最高立即購買'],
    ['Journal','運行記錄'],['Statistiques','統計'],['Gagnés','買入成功'],['Vendus','已售出'],['Invendus','未售出'],['Dispo','可用'],['Actifs','放售中'],['Bénéfice','利潤'],['Profit','利潤'],['Coins','金幣'],
    ['État','狀態'],['Temps','時間'],['Sécurité','安全'],['Marché','市場'],['Plus','更多'],['Vider les logs','清除記錄'],['Prix','價格']
  ].sort((a,b) => b[0].length - a[0].length);

  const translateText = (text) => {
    if (!text || !String(text).trim()) return text;
    let out = String(text);
    for (const [from,to] of translations) out = out.split(from).join(to);
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
        if (next !== old) node.setAttribute(attr,next);
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
    if (!document.documentElement) return setTimeout(startTranslator,100);
    const obs = new MutationObserver(translatePage);
    obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    translatePage();
    setInterval(translatePage,1200);
  };

  const patchCode = (source) => {
    let code = source;
    const oldExact = 'const h=new Set((e.idAddIgnorePlayersList||[]).map((({id:e})=>e)))';
    const replacement = 'const h=new Set((()=>{const t=e.idAddIgnorePlayersList;if(!t)return[];if(Array.isArray(t))return t;if(t instanceof Set)return[...t];if(t instanceof Map)return[...t.values()];if("string"==typeof t)try{const e=JSON.parse(t);return Array.isArray(e)?e:[]}catch(e){return[]}return"object"==typeof t?Object.values(t):[]})().map((e=>"object"==typeof e&&e?e.id:e)).filter(Boolean))';
    if (code.includes(oldExact)) code = code.replace(oldExact,replacement);
    else code = code.replace(/const h=new Set\(\(e\.idAddIgnorePlayersList\|\|\[\]\)\.map\(\(\(\{id:e\}\)=>e\)\)\)/,replacement);

    const syncNeedle = 'const i=P();return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    const syncReplacement = 'let i;try{i=P()}catch(e){console.warn("[MagicBuyer FC27] criteria sync failed",e),i=(0,a.NA)("lastSearchCriteria")||{type:"player",defId:[]}}return(0,a.sO)("BuyerSettings",t),(0,a.sO)("CommonSettings",n),{buyer:t,common:n,criteria:i}';
    if (code.includes(syncNeedle)) code = code.replace(syncNeedle,syncReplacement);
    return code;
  };

  const run = (source) => {
    try {
      const patched = patchCode(source);
      eval(patched + '\n//# sourceURL=MagicBuyer-FC27-TC-runtime.js');
      console.log('[MagicBuyer FC27 TC] 已載入修正版 tc5');
      startTranslator();
    } catch (err) {
      console.error('[MagicBuyer FC27 TC] 載入失敗',err);
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