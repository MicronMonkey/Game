# 《12:30！雙城集結令》 12:30 — Two Cities, One Voice

手機直式優先、桌面適配的 HTML5 策略街機遊戲（Phaser 3 + Vite + ES Modules）。
依 2026/11/13 12:30 桃園、台中同時集結活動發想的**虛構遊戲化改編**：遊戲內人數、角色、事件與 Boss 皆為虛構，**不是實際出席統計**。只有「11/13 真實紀錄」相簿會放經確認授權的真實照片。

線上版（合併到 `main` 並由 GitHub Actions 部署後）：https://micronmonkey.github.io/Game/dual-city-1230/

本專案與同 repo 的《晶片沉默者》《全民抓法克》完全獨立：程式在 `dual-city-1230/`，存檔只用 `dualCity1230.save.v1`，不會讀寫或清除其他遊戲的 localStorage。

## 玩法（四幕，單局約 4–6 分鐘）
開始時選難度，再選 **桃園廠** 或 **台中廠**。你是帶頭的主角，畫面會自動往前捲動（像塞車中的街道），一路號召夥伴走到集結區。另一座廠是「夥伴廠」，自動同步推進（虛構）。

| 幕 | 內容 |
|---|---|
| 第一幕 午休集結 | 上下左右移動主角；黃色圈圈＝號召力，圈內的路人會加入、跟著走。帶至少 45 人（標準）抵達終點。虛擬時鐘 12:00→12:30 跟著進度走 |
| 第二幕 雙城同步 | 路更長、主管更多，目標 72 人 |
| 第三幕 陽光照進黑箱 | 瞄準弱點；光束燒掉落下的黑幕累積「🔆雙城合擊」；護盾環繞；依序擊破 1→2→3 三道鎖。帶到終點的人越多光束越強（最多 +30%） |
| 第四幕 這一天，我們站在一起 | 真實照片相簿：**Boss 贏或輸看到的相簿完全相同**；首頁也能直接開 |

- **門**：左右二選一，「+10 人」「人數 ×1.2」「號召力 +20」或陷阱「-10 人」「人數 ×0.8」「號召力 -20」。
- **道具**：📣大聲公 號召力+15、🍱便當 +5 人、☀️陽光 能量+25、☕咖啡 號召力+8・能量+10、💬謠言 號召力-15（會移動，要閃）。
- **困難**：主管（碰到黃圈會把 5 人或 15% 的夥伴拉回去開會）、📢會議室（待在裡面持續被拉走）、☁️信心不足霧氣（號召力 -40%）、塞車車陣（撞到會卡住夥伴）、「觀望中」人群需要號召力 ≥ 70/80 才加入。
- **技能**（號召夥伴累積能量；準備好就會發光）：📣大聲號召 號召力×1.6・6 秒／🛡️團結護盾 不怕主管、會議室、霧氣、謠言、車陣與負面門・6 秒／🔗雙城共鳴 吸引更大範圍的路人＋得分×1.5・8 秒。
- 永遠不會卡關：鏡頭持續前進，最後一定會把你推過終點；未達標也能進 Boss 與相簿。

### 操作
| | 手機 | 電腦 |
|---|---|---|
| 移動 | 在畫面上拖曳（主角跟著手指的方向移動）；拖曳的同時另一隻手指可直接按技能 | 方向鍵 / WASD（也可滑鼠拖曳） |
| 技能 | 下方三個技能按鈕 | 1 / 2 / 3 |
| Boss | 左下「瞄準」搖桿移動準星（手指不會擋住目標），右邊按「雙城合擊」 | 滑鼠、方向鍵或搖桿；空白鍵放大招 |

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
- `src/game/runner/runnerLogic.js`：關卡產生（人群、門、道具、困難的配置）與人數/號召力規則。

## 架構
```
src/
  main.js                 Phaser 啟動（以裝置解析度繪製、CSS px 排版）
  config/game-balance.json
  game/
    app.js                共用狀態、版面計算、設定
    config.js / maps.js
    scenes/  Boot → Intro → Menu → Gathering → Sync（RunnerScene）→ Boss → Ending（相簿）
    runner/  runnerLogic（關卡產生、門與號召力規則）
    systems/ GameState、scoring、SkillSystem、BossSystem、Storage、achievements、AudioSystem
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
