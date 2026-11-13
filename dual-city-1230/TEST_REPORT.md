# 測試報告（2026-11-13）

環境：Linux 雲端容器、Node 22.23.4、Chromium（Playwright，headless）。**未在真實 iPhone / Android 實機測試**（見下方「未驗證」）。

## 執行的命令
```bash
npm install
npm test                       # 單元測試：18/18 通過
npm run build                  # 成功，無錯誤
npx vite preview --port 4173 & npm run test:e2e                         # 55/55 通過
# 模擬 GitHub Pages 子路徑：把網站組裝成 /Game/ 並以 /Game/dual-city-1230/ 提供
BASE_URL=http://localhost:8799/Game/dual-city-1230/ npm run test:e2e    # 55/55 通過
```

## 單元測試（tests/unit）
Combo 倍率公式、抵達分數取整、剩餘秒數獎勵、難度倍率、虛擬時鐘映射、同一 ID 不重複計分、Combo 視窗、陽光上下限、衝刺哥 +10 秒上限與「初始 +10 秒」天花板、技能消耗/冷卻/不疊加/斷訊封鎖、兩城所有路口皆可抵達集結區且排隊時改道、Boss DPS/3 秒暴擊/0.25 秒寬限重置/階段/初始傷害、同影格擊殺優先於時間到、存檔命名空間/遷移/分難度紀錄、成就、照片 JSON 容錯、出貨的照片 JSON 無偽造檔案。

## 端對端驗收（tests/e2e，對照 docs/07）
| 結果 | 項目 | 細節 |
|---|---|---|
| ✅ | 首次開場有略過選項 |  |
| ✅ | 首頁載入 |  |
| ✅ | 再次載入不強制重播開場 |  |
| ✅ | 最高紀錄按鈕可用 |  |
| ✅ | 免責說明按鈕可用 |  |
| ✅ | 教學按鈕可用 |  |
| ✅ | 音效開關保存 |  |
| ✅ | 首頁「11/13 真實紀錄」無條件直達相簿 |  |
| ✅ | 沒有真實照片時兩城皆顯示「照片整理中」 |  |
| ✅ | 相簿無偽造照片（無 <img>） |  |
| ✅ | 鍵盤返回首頁 |  |
| ✅ | 首次開始顯示教學 |  |
| ✅ | 教學狀態持久化 |  |
| ✅ | 桃園與台中同時更新 |  |
| ✅ | 點擊角色可選取 |  |
| ✅ | 點集合區下達指令 | moving |
| ✅ | 沿道路尋路抵達並計分 | {"has":true,"tao":1,"score":100} |
| ✅ | 同一角色重複抵達不重複計分 | delta=0 |
| ✅ | 虛擬時鐘 12:00→12:30 映射 | 12:04 @14.5s/90s |
| ✅ | 陽光不足不能施放並顯示原因 |  |
| ✅ | 冷卻中不能施放 |  |
| ✅ | 暫停時倒數/CD/Buff 停止 |  |
| ✅ | 分頁失焦自動暫停 |  |
| ✅ | 框選模式可多選 | selected=10 |
| ✅ | 事件生成與解除（排隊/烏雲/斷訊/開會） | {"queue":1,"queueCleared":true,"cloud":true,"cloudCleared":true,"blocked":"訊號中斷","unblocked":true,"meeting":tr |
| ✅ | 第一幕 → 第二幕 |  |
| ✅ | 第一幕已集結數保留到第二幕 | taoyuan=30 |
| ✅ | 進入 Boss（依雙城達標給初始傷害） | {"tao":63,"tai":63,"initDmg":150,"score":48820} |
| ✅ | 滑鼠瞄準弱點造成 Boss 扣血 | 850 → 825 |
| ✅ | Boss HP 0 → 成功 | score=55970 |
| ✅ | 成功過場文案 |  |
| ✅ | 成功過場可略過並進入相簿 |  |
| ✅ | 分享：不支援 Web Share 時下載 PNG | dual-city-1230-score.png |
| ✅ | 分難度保存最高分 |  |
| ✅ | 不污染其他遊戲 localStorage |  |
| ✅ | 重新遊玩無殘留舊局分數 |  |
| ✅ | 零城達標也可進 Boss | {"tao":0,"init":0} |
| ✅ | 時間 0 且 HP>0 → 失敗 | {"result":"lose","hp":1000} |
| ✅ | 失敗過場文案 |  |
| ✅ | 成功與失敗進入「完全相同」的相簿 |  |
| ✅ | 全程無 JS 錯誤 |  |
| ✅ | 僅一城有照片：另一城仍顯示整理中 |  |
| ✅ | 缺一張照片顯示載入失敗而不白屏 |  |
| ✅ | 左右切換與計數 |  |
| ✅ | 點擊放大燈箱 |  |
| ✅ | 燈箱鍵盤關閉 |  |
| ✅ | 照片 object-fit: contain 不裁切 |  |
| ✅ | 左右滑動切換 |  |
| ✅ | JSON 404 不白屏、兩城顯示整理中 |  |
| ✅ | 相簿可返回首頁 |  |
| ✅ | 版面 375×667 | {"mode":"portrait","cityH":254,"overlap":false,"minSkill":48,"scrollW":375,"fieldScale":0.7466666666666667} |
| ✅ | 版面 390×844 | {"mode":"portrait","cityH":339.5,"overlap":false,"minSkill":54,"scrollW":390,"fieldScale":0.945} |
| ✅ | 版面 393×852 | {"mode":"portrait","cityH":343.5,"overlap":false,"minSkill":54,"scrollW":393,"fieldScale":0.9525} |
| ✅ | 版面 430×932 | {"mode":"portrait","cityH":383.5,"overlap":false,"minSkill":54,"scrollW":430,"fieldScale":1.045} |
| ✅ | 版面 1366×768 | {"mode":"landscape","cityH":609,"overlap":false,"minSkill":54,"scrollW":1366,"fieldScale":1.685} |

說明：完整流程測試用了 `?test=1` 掛鉤加速時間（timeScale）與自動指派/瞄準，以在數分鐘內跑完兩種結局；選人、指派、框選、暫停、Boss 扣血等核心操作則以真實滑鼠/觸控事件驗證。

## 未驗證 / 已知限制
- iPhone Safari、Android Chrome 實機（觸控手感、安全區、音訊解鎖、系統分享面板）未實測；Chromium 行動裝置模擬已測。
- 音效只在無頭瀏覽器中確認不報錯，未以耳朵確認音色。
- 離線（斷網後已快取）情境未測；沒有 Service Worker，斷網重新整理會無法載入。
- 數值平衡只以自動玩家驗證「可達成」（完美操作約第一幕即可雙城達標），尚需真人試玩調整難度與單局時長。
- 真實照片尚未提供，相簿目前顯示「整理中」。
- Phaser 套件約 1.5 MB（gzip 約 340 KB），首次載入在慢速網路需數秒。
