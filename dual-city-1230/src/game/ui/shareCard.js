// Score card drawn only with same-origin, self-made graphics (no event photos → no
// tainted canvas, no unlicensed images). Web Share when supported, else PNG download
// + copy share text.
import { toast } from './dom.js';

export function shareText(score) {
  const url = location.origin + location.pathname;
  return `11/13 雙城集結令／不同地點，同一時間。\n我的遊戲分數：${score.toLocaleString('en-US')}\n你能超越我嗎？ ${url}`;
}

export function drawShareCard({ score, difficultyLabel, bossWin, cities }) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px system-ui, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#101216');
  g.addColorStop(1, '#242832');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // sun rays
  x.save();
  x.translate(W / 2, 520);
  for (let i = 0; i < 24; i++) {
    x.rotate((Math.PI * 2) / 24);
    x.fillStyle = i % 2 ? 'rgba(255,212,71,0.08)' : 'rgba(255,159,28,0.05)';
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(-60, -900);
    x.lineTo(60, -900);
    x.fill();
  }
  x.restore();
  const sun = x.createRadialGradient(W / 2, 520, 10, W / 2, 520, 220);
  sun.addColorStop(0, '#FFF3B0');
  sun.addColorStop(0.4, '#FFD447');
  sun.addColorStop(1, 'rgba(255,159,28,0)');
  x.fillStyle = sun;
  x.beginPath();
  x.arc(W / 2, 520, 220, 0, Math.PI * 2);
  x.fill();
  // two city lights linked by a golden line
  const pts = [[230, 760, '桃園'], [850, 760, '台中']];
  x.strokeStyle = '#FFD447';
  x.lineWidth = 8;
  x.beginPath();
  x.moveTo(230, 760);
  x.quadraticCurveTo(W / 2, 640, 850, 760);
  x.stroke();
  for (const [px, py, label] of pts) {
    x.fillStyle = '#FFD447';
    x.beginPath();
    x.arc(px, py, 26, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#F5F5F5';
    x.font = font(700, 48);
    x.textAlign = 'center';
    x.fillText(label, px, py + 90);
    const cv = cities?.[label === '桃園' ? 'taoyuan' : 'taichung'];
    if (cv) {
      x.font = font(500, 34);
      x.fillStyle = '#cbd2df';
      x.fillText(`遊戲集結 ${cv.arrived}/${cv.target}`, px, py + 140);
    }
  }
  x.textAlign = 'center';
  x.fillStyle = '#FFD447';
  x.font = font(900, 92);
  x.fillText('12:30！雙城集結令', W / 2, 150);
  x.fillStyle = '#F5F5F5';
  x.font = font(500, 40);
  x.fillText('11/13 雙城集結令／不同地點，同一時間。', W / 2, 220);
  x.fillStyle = '#101216';
  x.font = font(900, 30);
  x.fillText(bossWin ? '陽光照進黑箱！' : '陽光不會停止', W / 2, 530);
  // score panel
  x.fillStyle = 'rgba(0,0,0,0.55)';
  x.fillRect(120, 990, W - 240, 230);
  x.strokeStyle = '#FFD447';
  x.lineWidth = 4;
  x.strokeRect(120, 990, W - 240, 230);
  x.fillStyle = '#F5F5F5';
  x.font = font(600, 40);
  x.fillText(`我的遊戲分數（${difficultyLabel}）`, W / 2, 1060);
  x.fillStyle = '#FFD447';
  x.font = font(900, 110);
  x.fillText(score.toLocaleString('en-US'), W / 2, 1180);
  x.fillStyle = '#F5F5F5';
  x.font = font(700, 44);
  x.fillText('你能超越我嗎？', W / 2, 1275);
  x.fillStyle = '#8A93A3';
  x.font = font(400, 24);
  x.fillText('遊戲分數為虛構設計，不代表活動實際人數', W / 2, 1325);
  return c;
}

export async function shareScore(info) {
  const canvas = drawShareCard(info);
  const text = shareText(info.score);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = blob ? new File([blob], 'dual-city-1230-score.png', { type: 'image/png' }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: '12:30！雙城集結令' });
      return 'shared-file';
    }
    if (navigator.share && !file) {
      await navigator.share({ text, title: '12:30！雙城集結令' });
      return 'shared-text';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
  }
  // fallback: download PNG + copy text
  if (blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dual-city-1230-score.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('已下載成績卡 PNG，並複製分享文字', 'good');
  } catch {
    toast('已下載成績卡 PNG', 'good');
  }
  return 'downloaded';
}
