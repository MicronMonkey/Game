# 《12:30！雙城集結令》 12:30 — Two Cities, One Voice

手機直式優先、桌面適配的 HTML5 策略街機遊戲（Phaser 3 + Vite + ES Modules）。
依 2026/11/13 12:30 桃園、台中同時集結活動發想的**虛構遊戲化改編**：遊戲內人數、角色、事件與 Boss 皆為虛構，**不是實際出席統計**。只有「11/13 真實紀錄」相簿會放經確認授權的真實照片。

線上版（合併到 `main` 並由 GitHub Actions 部署後）：https://micronmonkey.github.io/Game/dual-city-1230/

本專案與同 repo 的《晶片沉默者》《全民抓法克》完全獨立：程式在 `dual-city-1230/`，存檔只用 `dualCity1230.save.v1`，不會讀寫或清除其他遊戲的 localStorage。

## 玩法（四幕，單局約 4–6 分鐘）
開始時選難度，再選 **桃園廠** 或 **台中廠**。畫面只有你負責的那一座廠；另一座是「夥伴廠」，在上方自動同步前進（虛構）。

| 幕 | 時間（標準） | 內容 |
|---|---|---|
| 第一幕 午休集結 | 90 秒 | 虛擬時鐘 12:00→12:30。一個一個點人，再點金色集結區；前往中的人沿路顯示流動的 >>>> 箭頭（紅色＝走錯路，點他重新指引）。目標 30 人 |
| 第二幕 雙城同步 | 60 秒 | 已集結數保留；干擾變多。被干擾的人腳下發紅光並顯示 ❓迷路／📢開會／🐢排隊，上方紅色標籤寫明干擾與剩餘秒數 |
| 第三幕 陽光照進黑箱 | 60 秒 | 拖曳瞄準弱點（持續 3 秒暴擊）；光束掃過落下的「黑幕」可燒掉並累積「🔆雙城合擊」大招，黑幕落地會讓光束 -25%；第二階段護盾環繞擋光；最後依序擊破 1→2→3 三道鎖 |
| 第四幕 這一天，我們站在一起 | 自由停留 | 真實照片相簿：**Boss 贏或輸看到的相簿完全相同**；首頁也能直接開 |

- 六種 Q 版角色：午餐戰士、黑衣夥伴（+2 陽光）、陽光志工（周圍加速 10%）、迷路工程師（可能走錯）、超速衝刺哥（+2 秒，每局上限 10 秒）、加班疲勞人（☕，陽光照耀後恢復）。
- 陽光技能條：抵達補陽光，條上刻度標出三技能花費。技能面板：午休衝刺／陽光照耀／雙城共鳴，顯示花費、冷卻轉圈、就緒發光。
- Buff 生效時：人物金/橘色光環與殘影、戰場邊框發光、上方金色倒數標籤；結束即消失。
- Boss 的「夥伴之光」：你帶到集結區的人越多，光束越強（最多 +30%）。
- Combo、三種難度、成就、本機最高紀錄、分享成績卡、自動/手動暫停、音效、減少動態。

### 操作
| | 手機 | 電腦 |
|---|---|---|
| 選人 | 點人物（一個一個點可多選，再點一次取消） | 同左 |
| 出發 | 點金色集結區 | 點集結區，或空白鍵 / Enter |
| 技能 | 下方技能面板 | 1 / 2 / 3 |
| Boss | 手指拖曳瞄準；點「雙城合擊」 | 滑鼠移動或方向鍵；空白鍵放大招 |

## 開發
需求：Node.js 18 以上（CI 使用 20；本機以 22 測試）。

```bash
cd dual-city-1230
npm install
npm run dev        # 開發伺服器（http://localhost:5173）
npm test           # 單元測試（計分、Combo、技能、尋路、Boss、存檔、相簿 JSON）
npm run build      # 產生 dist/
npm run preview    # 預覽 dist/（http://localhost:4173）
npm run test:e2e   # 先 build + preview，再跑 Playwright 驗收（需已安裝 playwright）
```

## 部署（GitHub Pages）
repo 根目錄的 `.github/workflows/pages.yml` 會在推送 `main` 時：
1. 照舊檢查原本的遊戲；
2. 在 `dual-city-1230/` 執行 `npm ci && npm test && npm run build`；
3. 把整個網站（原遊戲不變）加上 `dual-city-1230/dist` → `/dual-city-1230/` 一起發佈。

Vite `base` 預設為 `./`（相對路徑），所以放在任何子路徑都能運作；所有 fetch 與圖片路徑都經過 `import.meta.env.BASE_URL`。若要固定絕對路徑，可在建置時設定 `VITE_BASE=/Game/dual-city-1230/`。

## 放入真實照片
請看 [PHOTOS.md](PHOTOS.md)。重點：只改 `public/data/event-photos.json` 與 `public/assets/photos/`，不需改程式。沒有照片時顯示「真實活動照片整理中」，**絕不使用 AI 圖或海報代替**。

## 可調整的設定
- `src/config/game-balance.json`：時間、目標人數、分數、角色速度、技能、Boss、難度倍率（交接包原始設定）。
- `src/game/config.js` 的 `TUNING`：生成間隔、人數上限、事件頻率與持續時間、Boss 招式時間等實作參數。
- `src/game/maps.js`：兩城的風格化道路圖（非真實廠區配置）。

## 架構
```
src/
  main.js                 Phaser 啟動（以裝置解析度繪製、CSS px 排版）
  config/game-balance.json
  game/
    app.js                共用狀態、版面計算、設定
    config.js / maps.js
    scenes/  Boot → Intro → Menu → Gathering → Sync → Boss → Ending（相簿）
    entities/ Character（角色）、CityField（單一城市畫面）
    systems/ GameState、scoring、SkillSystem、EventsSystem、BossSystem、pathing、Storage、achievements、AudioSystem
    ui/      hud、modal、tutorial、interstitial、gallery、shareCard
    art/     程序化繪製的角色與場景（無外部美術素材）
public/data/event-photos.json   照片設定（目前為空）
tests/unit  tests/e2e
docs/handoff/                   原始開發交接包（規格、設定、線框）
```
美術與音樂皆為程式即時繪製/合成的原創內容，無第三方素材授權問題。

## 測試結果
見 [TEST_REPORT.md](TEST_REPORT.md)。上線前人工檢查見 [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)。

## 免責說明
本作依 2026/11/13 桃園、台中同時集結活動發想，人物、對話、障礙、遊戲人數及 Boss 均為虛構遊戲設計，不代表當日實際情況。僅真實紀錄相簿使用經確認的活動照片。
