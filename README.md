# 晶片沉默者：九人的協議

《晶片沉默者》繁體中文劇情試玩版（導演強化版，約 30 分鐘）：四間可旋轉 CSS 3D 房間、角色對話、七份證據、三道推理、三種章節結局及三種失敗結局、本機自動存檔。設計目標約 30 分鐘；實際玩家測時仍待驗證。

直接開啟 index.html 即可遊玩；建議在此目錄執行 `python -m http.server 8080`，再開啟 http://localhost:8080 。不需安裝套件或編譯。Google Fonts 無法載入時會使用系統字型。存檔限同裝置瀏覽器，部分瀏覽器會限制 file:// 存檔。

GitHub Pages：Settings → Pages → Source 選 GitHub Actions。推送 main 或手動執行附帶工作流程。預期網址 https://micronmonkey.github.io/Game/ ，以 Actions 成功回報為準，未成功前不代表已上線。相對資源路徑支援 /Game/ 子目錄。

包含序章、六章與終章；10/21 簽署為固定事件，玩家只能讓虛構幹部動搖、保留證據與影響後續組織。CG 場景新增夜班、日班、跨廠、會場、辦公室及簽署會議室；遊戲提供場景地圖、已去過與已交談標記，對話有新內容才可再次點擊。\n\n**小遊戲獨立版：** [fack.html](fack.html)（上線後為 https://micronmonkey.github.io/Game/fack.html ）可單獨遊玩與分享，手機用右下角搖桿操控，會有 🍬 糖糖橫越畫面擋路或把人黏走，配上 Web Audio 即時合成的原創惡搞配樂與音效（右上角可關），有簡單／中等／難／地獄四種難度、各難度最佳紀錄、稱號與分享按鈕；引擎 `game/chase.js` 與主遊戲共用。地圖參考中科大型晶圓廠常見配置（無塵室廠房、辦公大樓、天橋、員工餐廳、氣體站、冷卻水塔、停車場、大門），為虛構示意，不代表真實廠區配置。

第 5 章結尾新增「11/3 疏散演練」：神隱很久的法克出現在集合區，玩家化身桃園會長、抱著一箱連署書在可捲動的集合區地圖追他（手指點／拖曳或方向鍵、約 75 秒，可略過）。介面改為上方只留章節、地點與數值，其餘功能收進「☰ 選單」；手機直向為上半場景、下半對話，選項固定可見。完整設計見 [DESIGN.md](DESIGN.md)。驗證指令：`node tests/smoke.cjs`（另有 GitHub Actions 腳本語法檢查及新導覽測試）。

## 史實與虛構

查閱日期 2026-11-01。真實背景與可玩小說分開，所有遊戲角色、晶衡公司、九人小組、文件、數字、時間及結局均為虛構，無真人對照。

- [焦點事件 10/23：協商與罷工](https://eventsinfocus.org/news/7148521)：報導簽約爭議與桃園幹部 24 小時罷工；質疑不等於證實背叛。
- [焦點事件 10/25：獎酬方案分析](https://eventsinfocus.org/news/7148522)：公司有一次性獎金與後續方案，不可概括為完全沒發獎金。
- [焦點事件 10/28：協議性質](https://eventsinfocus.org/news/7148527)：報導引述勞動部人員說明，非遊戲的司法判決。
- [維基百科延伸閱讀](https://zh.wikipedia.org/wiki/2026年臺灣美光勞資爭議)：次級整理，不作唯一依據。

未證實的金流、背叛、保密年限不作事實陳述。遊戲不是法律意見，也未重製新聞全文、照片或真人肖像。

## 參考引擎

[fab24hr-engine](https://github.com/mcltyl/fab24hr-engine) 為場景、對話、任務、存檔等玩法參考。本試玩版獨立實作，未移植其程式或素材，使用 CSS 3D 立體佈景，沒有自由行走與路徑搜尋。未來若實際採用該引擎，須遵守其非商用授權與首頁、結局署名規定。
Game

## 全民找法克 正式版（經典＋冒險）

[fack.html](fack.html)：經典模式（沿用 V2 紀錄，不會清除）＋冒險模式四關、隨機 Buff、三階段 Boss、擴充成就、23 種永久裝備與每日挑戰。冒險資料另存於 `fack.expansion.v1`。舊的測試連結 `fack_v3.html` 會自動轉到正式版。完整說明、相容性分析與測試結果見 [EXPANSION.md](EXPANSION.md)。測試：`node tests/expansion_store.cjs`、`node tests/expansion_e2e.cjs`。

## 新遊戲：《12:30！雙城集結令》

獨立的新遊戲，原始碼在 [dual-city-1230/](dual-city-1230/)（Phaser 3 + Vite），上線後網址為 https://micronmonkey.github.io/Game/dual-city-1230/ 。與上面的遊戲完全分開，存檔使用自己的 `dualCity1230.save.v1`，不會動到其他遊戲的紀錄。說明見 [dual-city-1230/README.md](dual-city-1230/README.md)。
