# 上線前人工檢查表

## 照片與文案（必須由人確認）
- [ ] 每張照片都有持有人書面/訊息同意公開，`credit` 欄填寫正確
- [ ] 可辨識人物已取得同意或已遮蔽；識別證、車牌、螢幕、內部文件已遮蔽
- [ ] 照片 EXIF/GPS 已移除
- [ ] 說明文字中性，沒有未經證實的敘述
- [ ] 沒有使用海報、AI 圖、遊戲畫面冒充現場照片
- [ ] 若要在遊戲中原樣使用活動海報，已確認權利（目前遊戲**沒有**使用海報）
- [ ] 免責說明（首頁 →「事件與遊戲免責說明」）內容正確

## 部署
- [ ] GitHub → Settings → Pages → Source：GitHub Actions
- [ ] 合併到 `main` 後 Actions「Deploy chapter one」成功
- [ ] https://micronmonkey.github.io/Game/dual-city-1230/ 可開啟，相簿 JSON 正常載入
- [ ] 原本的 https://micronmonkey.github.io/Game/ 與 fack.html 仍正常，舊紀錄還在

## 實機（自動測試無法涵蓋）
- [ ] iPhone Safari：觸控選人/框選不會捲動頁面、瀏海/Home 條安全區、點一下後有聲音、靜音開關
- [ ] Android Chrome：同上；分享按鈕叫出系統分享面板
- [ ] 桌面 Chrome / Edge：滑鼠拖曳框選、鍵盤快捷鍵
- [ ] 低階手機：幀率可接受（可開「減少動態」）
- [ ] 實際玩家單局時間約 4–6 分鐘、標準難度新手可理解、熟手可高分（數值可在設定檔調整）
