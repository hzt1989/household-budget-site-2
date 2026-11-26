// 展示用的小换算：金额、日期怎么写，只管显示，不管数据。
export function money(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const body = Number.isInteger(abs)
    ? abs.toLocaleString('zh-CN')
    : abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '-¥' : '¥') + body;
}

// '2026-11-26' -> '2026-11'：全站用这个键认月份。
export function monthOf(dateStr) {
  return String(dateStr).slice(0, 7);
}

export function monthText(key) {
  const [y, m] = key.split('-').map(Number);
  return y + '年' + m + '月';
}

// '2026-11-26' -> '11月26日'
export function dayText(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return m + '月' + d + '日';
}

// '2026-11-26' -> '11月26日（周四）'
export function dayWeekText(dateStr) {
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(dateStr + 'T12:00:00');
  return dayText(dateStr) + '（周' + week[d.getDay()] + '）';
}

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function thisMonthKey() {
  return todayKey().slice(0, 7);
}

export function moveMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// 从 key 往前推 n 个月，从早到晚排好。
export function pastMonths(key, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(moveMonth(key, -i));
  return out;
}

// 一个月有几天。
export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// 把一个月的每一天按周一切（周一开头），返回 [{label, from, to, days:[日期]}]。
// label 如“第 1 周”，from/to 是 '11月2日' 这种写法。
export function weeksOfMonth(key) {
  const [y, m] = key.split('-').map(Number);
  const total = daysInMonth(key);
  const weeks = [];
  let start = 1;
  // 第一周从 1 号切到第一个周日；之后每 7 天一周。
  const first = new Date(y, m - 1, 1);
  const firstSunday = 1 + ((7 - first.getDay()) % 7);
  const cuts = [firstSunday];
  for (let end = firstSunday + 7; end < total; end += 7) cuts.push(end);
  cuts.push(total);
  let idx = 0;
  for (const end of cuts) {
    const days = [];
    for (let d = start; d <= end; d++) days.push(d);
    weeks.push({
      label: '第 ' + (idx + 1) + ' 周',
      from: m + '月' + start + '日',
      to: m + '月' + end + '日',
      days,
    });
    start = end + 1;
    idx++;
  }
  return weeks;
}

export function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
