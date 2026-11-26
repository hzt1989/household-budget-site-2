// 手绘 canvas 图表，不拉任何库。画之前先按 CSS 尺寸定好像素比，字才不糊。
import { money } from './numbers.js';

const FONT = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

function prep(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.font = '13px ' + FONT;
  return ctx;
}

function cssWidth(canvas, fallback) {
  const rect = canvas.getBoundingClientRect();
  return Math.max(280, Math.round(rect.width) || fallback);
}

// 支出分类环形图：slices 是 [{name, color, amount}]，已按金额排好。
export function paintRing(canvas, slices, total) {
  const w = cssWidth(canvas, 300);
  const size = Math.min(w, 250);
  const ctx = prep(canvas, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 12;
  const hole = outer * 0.6;
  let angle = -Math.PI / 2;
  for (const s of slices) {
    const span = (s.amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer, angle, angle + span);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    angle += span;
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, hole, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#24313e';
  ctx.textAlign = 'center';
  ctx.font = '700 14px ' + FONT;
  ctx.fillText('本月共支出', cx, cy - 9);
  ctx.font = '700 19px ' + FONT;
  ctx.fillText(money(total), cx, cy + 16);
}

// 六个月收支对照：months 是 [{label, income, expense}]。
export function paintTrend(canvas, months) {
  const w = cssWidth(canvas, 900);
  const h = 320;
  const ctx = prep(canvas, w, h);
  const left = 60;
  const right = 12;
  const top = 28;
  const bottom = 28;
  const plotW = w - left - right;
  const plotH = h - top - bottom;
  const peak = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const yOf = (v) => top + plotH - (v / peak) * plotH;

  ctx.font = '12px ' + FONT;
  ctx.fillStyle = '#6b7683';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = (peak * i) / 4;
    const yy = yOf(v);
    ctx.strokeStyle = '#e6ddcb';
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(w - right, yy);
    ctx.stroke();
    ctx.fillText('¥' + Math.round(v).toLocaleString('zh-CN'), left - 8, yy + 4);
  }

  const slot = plotW / months.length;
  const bw = Math.min(24, slot / 3.6);
  months.forEach((m, i) => {
    const mid = left + slot * i + slot / 2;
    ctx.fillStyle = '#0e7c6b';
    ctx.fillRect(mid - bw - 3, yOf(m.income), bw, top + plotH - yOf(m.income));
    ctx.fillStyle = '#b4552d';
    ctx.fillRect(mid + 3, yOf(m.expense), bw, top + plotH - yOf(m.expense));
    ctx.fillStyle = '#24313e';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, mid, h - 8);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0e7c6b';
  ctx.fillRect(left, 5, 12, 12);
  ctx.fillStyle = '#24313e';
  ctx.fillText('收入', left + 17, 16);
  ctx.fillStyle = '#b4552d';
  ctx.fillRect(left + 66, 5, 12, 12);
  ctx.fillStyle = '#24313e';
  ctx.fillText('支出', left + 83, 16);
}

// 按天柱状：days 是 [{day, amount}]，每天一根柱。
export function paintBars(canvas, days, opts = {}) {
  const w = cssWidth(canvas, 440);
  const h = opts.height || 260;
  const ctx = prep(canvas, w, h);
  const left = 46;
  const right = 8;
  const top = 12;
  const bottom = 26;
  const plotW = w - left - right;
  const plotH = h - top - bottom;
  const peak = Math.max(1, ...days.map((d) => d.amount));
  const yOf = (v) => top + plotH - (v / peak) * plotH;
  const slot = plotW / days.length;
  const bw = Math.max(2, Math.min(15, slot - 3));

  ctx.font = '12px ' + FONT;
  ctx.fillStyle = '#6b7683';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const v = (peak * i) / 3;
    const yy = yOf(v);
    ctx.strokeStyle = '#e6ddcb';
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(w - right, yy);
    ctx.stroke();
    ctx.fillText('¥' + Math.round(v).toLocaleString('zh-CN'), left - 6, yy + 4);
  }
  days.forEach((d, i) => {
    const x = left + slot * i + (slot - bw) / 2;
    const tall = top + plotH - yOf(d.amount);
    ctx.fillStyle = d.amount > 0 ? (opts.color || '#0e7c6b') : '#e6ddcb';
    ctx.fillRect(x, yOf(d.amount), bw, Math.max(tall, d.amount > 0 ? 2 : 0));
    if (d.day === 1 || d.day % 5 === 0 || days.length <= 7) {
      ctx.fillStyle = '#6b7683';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.day), left + slot * i + slot / 2, h - 8);
    }
  });
}
