# 如何放入 11/13 真實照片（不需改程式）

1. **先確認授權**：只放照片持有人同意公開的照片。可辨識的人物要有適當同意；必要時遮蔽臉部、識別證、車牌、內部文件。
2. **移除中繼資料**：去掉 EXIF（尤其 GPS 位置）。例如 `exiftool -all= photo.jpg`，或用轉檔工具重新輸出。
3. **轉成 WebP 並縮小**（建議長邊 1600px 以內）：例如 `cwebp -q 82 -resize 1600 0 in.jpg -o taoyuan-01.webp`。
4. 放到 `dual-city-1230/public/assets/photos/`，命名 `taoyuan-01.webp`、`taoyuan-02.webp`、`taichung-01.webp`…（建議每城 2–5 張）。
5. 編輯 `dual-city-1230/public/data/event-photos.json`：

```json
{
  "event": "2026-11-13",
  "title": "12:30 雙城集結",
  "taoyuan": [
    { "src": "assets/photos/taoyuan-01.webp", "caption": "11/13 桃園活動照片", "credit": "攝影：○○（已授權）", "alt": "2026年11月13日桃園集結現場照片" }
  ],
  "taichung": [
    { "src": "assets/photos/taichung-01.webp", "caption": "11/13 台中活動照片", "credit": "攝影：○○（已授權）", "alt": "2026年11月13日台中集結現場照片" }
  ]
}
```
   - `src` 用相對路徑（**不要**以 `/` 開頭），程式會自動加上部署子路徑。
   - 陣列的順序就是顯示順序；Boss 成功或失敗都完全一樣。
   - 某一城留空 `[]` 就會顯示「○○真實活動照片整理中」，不影響另一城。
   - 某張檔案不存在或壞掉時，該張顯示「照片載入失敗」，其他照片照常。
6. `npm test` 會檢查 JSON 中列出的檔案都存在；然後 `npm run build`，推到 `main` 即自動部署。

**請勿**放海報、AI 生成圖或遊戲截圖冒充現場照片。說明文字請用中性描述（如「11/13 活動照片」），不要寫未經證實的細節。
