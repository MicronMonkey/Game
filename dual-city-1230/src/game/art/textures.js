// Procedurally drawn Q-style (≈2.2 heads tall) characters and effects.
// Everything is original canvas drawing — no external art assets.

export const CHAR_TYPES = ['lunch', 'black', 'volunteer', 'lost', 'sprinter', 'tired'];
export const CHAR_W = 48;
export const CHAR_H = 60;
export const VARIANTS = 3;
const DIRS = ['down', 'up', 'side'];

const SKIN = ['#F6D2B0', '#E8B98F', '#C98F65'];
const HAIR = ['#2A211C', '#5A3A22', '#1B1B24'];

const STYLE = {
  lunch: { shirt: ['#5B8DEF', '#4FB3A9', '#E07B5F'], pants: '#2F3A55' },
  black: { shirt: ['#15161A', '#1E1F25', '#101114'], pants: '#22242C', band: '#FFD447' },
  volunteer: { shirt: ['#FFD447', '#FFC93C', '#FFB627'], pants: '#3A3F4D' },
  lost: { shirt: ['#E8EEF6', '#DDE6F2', '#F2F5FA'], pants: '#9AA7BA' },
  sprinter: { shirt: ['#E83B3B', '#F0582F', '#D62F55'], pants: '#1F2433' },
  tired: { shirt: ['#8A93A3', '#7C8597', '#959CA8'], pants: '#454B57' },
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawChar(ctx, type, variant, dir, frame) {
  const st = STYLE[type];
  const skin = SKIN[variant % SKIN.length];
  const hair = type === 'lost' ? '#F2F5FA' : HAIR[(variant + 1) % HAIR.length];
  const shirt = st.shirt[variant % st.shirt.length];
  const cx = CHAR_W / 2;
  const cheer = frame === 2;
  const step = frame === 1 ? 1 : -1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, 56, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // legs
  ctx.strokeStyle = st.pants;
  ctx.lineWidth = 5;
  const legSwing = cheer ? 0 : step * 3;
  ctx.beginPath();
  if (dir === 'side') {
    ctx.moveTo(cx - 1, 44); ctx.lineTo(cx - 1 + legSwing, 54);
    ctx.moveTo(cx + 2, 44); ctx.lineTo(cx + 2 - legSwing, 54);
  } else {
    ctx.moveTo(cx - 4, 44); ctx.lineTo(cx - 4, 54 - (step > 0 ? 2 : 0));
    ctx.moveTo(cx + 4, 44); ctx.lineTo(cx + 4, 54 - (step < 0 ? 2 : 0));
  }
  ctx.stroke();
  // shoes
  ctx.fillStyle = type === 'sprinter' ? '#F5F5F5' : '#1A1C22';
  ctx.beginPath();
  if (dir === 'side') {
    ctx.ellipse(cx + legSwing + 1, 55, 4, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - legSwing + 3, 55, 4, 2.2, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(cx - 4, 55, 3.4, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 4, 55, 3.4, 2.2, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  // body
  ctx.fillStyle = shirt;
  rr(ctx, cx - 9, 30, 18, 16, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (type === 'volunteer') {
    // reflective vest stripes
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(cx - 9, 38, 18, 2);
  }
  if (type === 'black') {
    ctx.fillStyle = st.band;
    ctx.fillRect(cx - 9, 33, 4, 4); // armband
  }
  // arms
  ctx.strokeStyle = skin;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (cheer) {
    ctx.moveTo(cx - 8, 33); ctx.lineTo(cx - 13, 22);
    ctx.moveTo(cx + 8, 33); ctx.lineTo(cx + 13, 22);
  } else if (dir === 'side') {
    ctx.moveTo(cx + 2, 33); ctx.lineTo(cx + 2 - legSwing, 42);
  } else {
    ctx.moveTo(cx - 9, 33); ctx.lineTo(cx - 11, 41 + step);
    ctx.moveTo(cx + 9, 33); ctx.lineTo(cx + 11, 41 - step);
  }
  ctx.stroke();
  // props
  if (!cheer && dir !== 'up') {
    const px = dir === 'side' ? cx + 6 : cx + 11;
    if (type === 'lunch') {
      ctx.fillStyle = '#8B5A2B'; ctx.fillRect(px - 4, 39, 9, 6);
      ctx.fillStyle = '#E83B3B'; ctx.fillRect(px - 4, 41, 9, 1.6);
    } else if (type === 'tired') {
      ctx.fillStyle = '#F5F5F5'; ctx.fillRect(px - 3, 38, 6, 7);
      ctx.fillStyle = '#6B3E26'; ctx.fillRect(px - 3, 38, 6, 2);
    } else if (type === 'lost') {
      ctx.fillStyle = '#9BD1FF'; ctx.fillRect(px - 4, 38, 8, 6);
      ctx.strokeStyle = '#3F6FA8'; ctx.lineWidth = 0.8; ctx.strokeRect(px - 4, 38, 8, 6);
    } else if (type === 'volunteer') {
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, 44); ctx.lineTo(px, 26); ctx.stroke();
      ctx.fillStyle = '#FF9F1C'; ctx.fillRect(px, 26, 8, 6);
    }
  }
  if (cheer && type === 'lunch') {
    ctx.fillStyle = '#8B5A2B'; ctx.fillRect(cx - 17, 17, 9, 6);
  }
  // head
  const hy = 18;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx, hy, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // hair / headwear
  ctx.fillStyle = hair;
  ctx.beginPath();
  if (dir === 'up') {
    ctx.arc(cx, hy, 13.2, 0, Math.PI * 2);
  } else {
    ctx.arc(cx, hy - 2, 13.2, Math.PI * 1.02, Math.PI * 1.98);
    if (variant === 1) ctx.rect(cx - 13, hy - 4, 5, 8);
  }
  ctx.fill();
  if (type === 'volunteer') {
    ctx.fillStyle = '#FF9F1C';
    ctx.beginPath(); ctx.arc(cx, hy - 5, 12, Math.PI, 0); ctx.fill();
    if (dir !== 'up') ctx.fillRect(dir === 'side' ? cx : cx - 9, hy - 6, dir === 'side' ? 14 : 18, 3);
  }
  if (type === 'sprinter') {
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(cx - 13, hy - 7, 26, 3.5);
    ctx.fillStyle = '#E83B3B';
    ctx.fillRect(cx - 13, hy - 6, 26, 1.5);
  }
  if (type === 'lost') {
    // cleanroom hood + goggles strap
    ctx.strokeStyle = '#C9D4E3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, hy, 13.5, 0, Math.PI * 2); ctx.stroke();
  }
  // face
  if (dir !== 'up') {
    const fx = dir === 'side' ? cx + 4 : cx;
    if (type === 'black' && variant !== 2) {
      ctx.fillStyle = '#0A0A0A';
      rr(ctx, fx - 8, hy - 1, 16, 5, 2);
      ctx.fill();
    } else if (type === 'lost') {
      ctx.fillStyle = '#64B5F6';
      rr(ctx, fx - 8, hy - 2, 16, 6, 3);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1A1A1A';
      if (cheer) {
        ctx.lineWidth = 1.4; ctx.strokeStyle = '#1A1A1A';
        ctx.beginPath(); ctx.arc(fx - 4, hy + 1, 2, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(fx + 4, hy + 1, 2, Math.PI, 0); ctx.stroke();
      } else if (type === 'tired') {
        ctx.fillRect(fx - 6, hy + 1, 4, 1.4);
        ctx.fillRect(fx + 2, hy + 1, 4, 1.4);
        ctx.fillStyle = 'rgba(80,70,120,0.4)';
        ctx.fillRect(fx - 6, hy + 3, 4, 1.4);
        ctx.fillRect(fx + 2, hy + 3, 4, 1.4);
      } else {
        ctx.beginPath(); ctx.arc(fx - 4, hy + 1, 1.7, 0, Math.PI * 2); ctx.fill();
        if (dir !== 'side') { ctx.beginPath(); ctx.arc(fx + 4, hy + 1, 1.7, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(fx + 5, hy + 1, 1.7, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // mouth / blush
    ctx.fillStyle = 'rgba(232,59,59,0.35)';
    ctx.beginPath(); ctx.arc(fx - 7, hy + 6, 2, 0, Math.PI * 2); ctx.fill();
    if (dir !== 'side') { ctx.beginPath(); ctx.arc(fx + 7, hy + 6, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#5A2A2A'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (cheer) ctx.arc(fx, hy + 6, 3, 0, Math.PI);
    else if (type === 'tired') { ctx.moveTo(fx - 2, hy + 8); ctx.lineTo(fx + 2, hy + 8); }
    else ctx.arc(fx, hy + 6, 2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

export function charKey(type, variant, dir, frame) {
  return `ch_${type}_${variant}_${dir}_${frame}`;
}

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
}

export function generateTextures(scene) {
  for (const type of CHAR_TYPES) {
    for (let v = 0; v < VARIANTS; v++) {
      for (const dir of DIRS) {
        for (let f = 0; f < 3; f++) {
          canvasTex(scene, charKey(type, v, dir, f), CHAR_W, CHAR_H, (ctx) => drawChar(ctx, type, v, dir, f));
        }
      }
    }
  }
  canvasTex(scene, 'ring', 40, 16, (ctx) => {
    ctx.strokeStyle = '#FFD447';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(20, 8, 17, 6, 0, 0, Math.PI * 2); ctx.stroke();
  });
  canvasTex(scene, 'halo', 56, 56, (ctx) => {
    const g = ctx.createRadialGradient(28, 28, 2, 28, 28, 28);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 56, 56);
  });
  canvasTex(scene, 'spark', 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,212,71,0.9)');
    g.addColorStop(1, 'rgba(255,159,28,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
  });
  canvasTex(scene, 'glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,212,71,0.55)');
    g.addColorStop(0.6, 'rgba(255,159,28,0.18)');
    g.addColorStop(1, 'rgba(255,159,28,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  });
  canvasTex(scene, 'cloud', 96, 60, (ctx) => {
    ctx.fillStyle = 'rgba(70,78,96,0.92)';
    [[30, 34, 20], [50, 26, 24], [70, 36, 18], [46, 42, 20]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(30,34,44,0.6)';
    ctx.fillRect(28, 44, 44, 4);
  });
  canvasTex(scene, 'veil', 30, 24, (ctx) => {
    // falling 黑幕: a black sheet with redaction bars and a red edge
    ctx.fillStyle = '#050608';
    ctx.fillRect(1, 1, 28, 22);
    ctx.strokeStyle = '#E83B3B';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 28, 22);
    ctx.fillStyle = '#2a2d36';
    [5, 10, 15].forEach((y, i) => ctx.fillRect(5, y, 20 - i * 5, 3));
  });
  canvasTex(scene, 'dot', 8, 8, (ctx) => {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4, 4, 4, 0, Math.PI * 2); ctx.fill();
  });
}
