// 数据层：分类表、localStorage 存取、增删改、现算汇总。
// 金额统一按分取整再存，汇总不再受浮点误差拖累。
import { monthOf, daysInMonth } from './numbers.js';

const STORE_KEY = 'xiaojia-ledger-v2';

export const OUT_CATS = [
  { id: 'eat', name: '吃饭', color: '#b4552d' },
  { id: 'market', name: '买菜日用', color: '#0e7c6b' },
  { id: 'ride', name: '交通', color: '#2b5ea7' },
  { id: 'rent', name: '住房', color: '#6d4fc2' },
  { id: 'bills', name: '水电燃气', color: '#0a7ea4' },
  { id: 'mobile', name: '话费网络', color: '#5b8c2a' },
  { id: 'clinic', name: '看病买药', color: '#b03060' },
  { id: 'school', name: '孩子教育', color: '#c2700a' },
  { id: 'play', name: '玩乐', color: '#c22777' },
  { id: 'buy', name: '买东西', color: '#4b5b6b' },
  { id: 'social', name: '人情往来', color: '#8a6d1a' },
  { id: 'misc-out', name: '其他支出', color: '#94a3b8' },
];

export const IN_CATS = [
  { id: 'pay', name: '工资', color: '#0e7c6b' },
  { id: 'extra', name: '奖金补贴', color: '#5b8c2a' },
  { id: 'gig', name: '副业', color: '#2b5ea7' },
  { id: 'yield', name: '理财到账', color: '#6d4fc2' },
  { id: 'hongbao', name: '红包', color: '#b03060' },
  { id: 'misc-in', name: '其他收入', color: '#94a3b8' },
];

export function catName(kind, id) {
  const list = kind === 'income' ? IN_CATS : OUT_CATS;
  return (list.find((c) => c.id === id) || list[list.length - 1]).name;
}

export function catColor(kind, id) {
  const list = kind === 'income' ? IN_CATS : OUT_CATS;
  return (list.find((c) => c.id === id) || list[list.length - 1]).color;
}

function emptyLedger() {
  return { entries: [], plans: {}, carry: false };
}

function tidy(raw) {
  const clean = { entries: [], plans: {}, carry: false };
  if (raw && Array.isArray(raw.entries)) {
    for (const e of raw.entries) {
      if (!e || (e.kind !== 'expense' && e.kind !== 'income')) continue;
      const amt = Number(e.amount);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) continue;
      clean.entries.push({
        id: String(e.id || ''),
        kind: e.kind,
        cat: String(e.cat || ''),
        amount: Math.round(amt * 100) / 100,
        date: String(e.date),
        memo: String(e.memo || '').slice(0, 60),
      });
    }
  }
  if (raw && raw.plans && typeof raw.plans === 'object') {
    for (const [k, v] of Object.entries(raw.plans)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) clean.plans[k] = Math.round(n * 100) / 100;
    }
  }
  if (raw && raw.carry === true) clean.carry = true;
  clean.entries.sort(byDateDesc);
  return clean;
}

function byDateDesc(a, b) {
  if (a.date < b.date) return 1;
  if (a.date > b.date) return -1;
  return 0;
}

export function readLedger() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyLedger();
    return tidy(JSON.parse(raw));
  } catch {
    return emptyLedger();
  }
}

export function writeLedger(ledger) {
  localStorage.setItem(STORE_KEY, JSON.stringify(ledger));
}

export function makeId() {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addEntry(ledger, entry) {
  const item = {
    id: makeId(),
    kind: entry.kind,
    cat: entry.cat,
    amount: Math.round(Number(entry.amount) * 100) / 100,
    date: entry.date,
    memo: String(entry.memo || '').slice(0, 60),
  };
  ledger.entries.unshift(item);
  ledger.entries.sort(byDateDesc);
  writeLedger(ledger);
  return item;
}

export function editEntry(ledger, id, entry) {
  const item = ledger.entries.find((e) => e.id === id);
  if (!item) return null;
  item.kind = entry.kind;
  item.cat = entry.cat;
  item.amount = Math.round(Number(entry.amount) * 100) / 100;
  item.date = entry.date;
  item.memo = String(entry.memo || '').slice(0, 60);
  ledger.entries.sort(byDateDesc);
  writeLedger(ledger);
  return item;
}

export function dropEntry(ledger, id) {
  ledger.entries = ledger.entries.filter((e) => e.id !== id);
  writeLedger(ledger);
}

export function savePlans(ledger, plans) {
  ledger.plans = {};
  for (const [k, v] of Object.entries(plans)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) ledger.plans[k] = Math.round(n * 100) / 100;
  }
  writeLedger(ledger);
}

export function setCarry(ledger, on) {
  ledger.carry = on === true;
  writeLedger(ledger);
}

export function fillDemo(ledger) {
  ledger.entries = DEMO_ROWS.map((r) => ({ ...r, id: makeId() }));
  ledger.entries.sort(byDateDesc);
  ledger.plans = { ...DEMO_PLANS };
  ledger.carry = false;
  writeLedger(ledger);
}

export function wipeAll(ledger) {
  ledger.entries = [];
  ledger.plans = {};
  ledger.carry = false;
  writeLedger(ledger);
}

// ---- 现算汇总 ----

export function entriesOfMonth(ledger, key) {
  return ledger.entries.filter((e) => monthOf(e.date) === key);
}

export function monthTotals(ledger, key) {
  let income = 0;
  let expense = 0;
  let inCount = 0;
  let outCount = 0;
  for (const e of entriesOfMonth(ledger, key)) {
    if (e.kind === 'income') { income += e.amount; inCount++; }
    else { expense += e.amount; outCount++; }
  }
  const round2 = (n) => Math.round(n * 100) / 100;
  return { income: round2(income), expense: round2(expense), left: round2(income - expense), inCount, outCount };
}

// 本月每个支出分类花了多少，从多到少排好。
export function outByCat(ledger, key) {
  const sum = new Map();
  for (const e of entriesOfMonth(ledger, key)) {
    if (e.kind !== 'expense') continue;
    sum.set(e.cat, (sum.get(e.cat) || 0) + e.amount);
  }
  return [...sum.entries()]
    .map(([id, amount]) => ({ id, name: catName('expense', id), color: catColor('expense', id), amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

// 预算执行：每行带上限、已花、占比；carry 开启时上限算上上月剩余。
export function planRows(ledger, key) {
  const spent = outByCat(ledger, key);
  const spentMap = new Map(spent.map((s) => [s.id, s.amount]));
  const prevKey = prevMonthKey(key);
  const prevSpent = outByCat(ledger, prevKey);
  const prevMap = new Map(prevSpent.map((s) => [s.id, s.amount]));
  const rows = OUT_CATS.map((c) => {
    const limit = ledger.plans[c.id] || 0;
    const used = spentMap.get(c.id) || 0;
    const prevLimit = ledger.plans[c.id] || 0;
    const prevUsed = prevMap.get(c.id) || 0;
    const rollover = ledger.carry && prevLimit > prevUsed ? Math.round((prevLimit - prevUsed) * 100) / 100 : 0;
    const effective = limit + rollover;
    return {
      ...c,
      limit,
      rollover,
      effective,
      used: Math.round(used * 100) / 100,
      rate: effective > 0 ? used / effective : 0,
    };
  });
  const totalLimit = rows.reduce((s, r) => s + r.effective, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);
  const totalRollover = rows.reduce((s, r) => s + r.rollover, 0);
  return { rows, totalLimit, totalUsed, totalRollover, left: Math.round((totalLimit - totalUsed) * 100) / 100 };
}

export function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function spendByDay(ledger, key) {
  const per = {};
  for (const e of entriesOfMonth(ledger, key)) {
    if (e.kind !== 'expense') continue;
    const d = Number(e.date.slice(8, 10));
    per[d] = (per[d] || 0) + e.amount;
  }
  const out = [];
  for (let d = 1; d <= daysInMonth(key); d++) out.push({ day: d, amount: Math.round((per[d] || 0) * 100) / 100 });
  return out;
}

// 所选一周每天的支出（days 是 weeksOfMonth 给出的日期号）。
export function spendOfWeek(ledger, key, days) {
  const per = {};
  for (const e of entriesOfMonth(ledger, key)) {
    if (e.kind !== 'expense') continue;
    const d = Number(e.date.slice(8, 10));
    per[d] = (per[d] || 0) + e.amount;
  }
  const rows = days.map((d) => ({ day: d, amount: Math.round((per[d] || 0) * 100) / 100 }));
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, total: Math.round(total * 100) / 100 };
}

export function toCsv(ledger) {
  const head = '日期,类型,分类,金额（元）,备注';
  const lines = [...ledger.entries]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => [
      e.date,
      e.kind === 'income' ? '收入' : '支出',
      catName(e.kind, e.cat),
      e.amount.toFixed(2),
      '"' + String(e.memo || '').replaceAll('"', '""') + '"',
    ].join(','));
  return '\uFEFF' + [head, ...lines].join('\n');
}

// ---- 示例数据：只有点了「载入示例数据」才写进去，随时可清空 ----
// [日期, 收支, 分类, 金额（元）, 备注]
const DEMO = [
  // 2026年6月
  ['2026-06-04', 'expense', 'rent', 2750, '交房租'],
  ['2026-06-06', 'expense', 'market', 203.6, '周末大采购'],
  ['2026-06-09', 'expense', 'eat', 112, '加班晚饭'],
  ['2026-06-11', 'expense', 'ride', 118, '公交卡充值'],
  ['2026-06-14', 'expense', 'market', 176.2, '水果牛奶'],
  ['2026-06-15', 'income', 'pay', 17500, '6月工资'],
  ['2026-06-18', 'expense', 'bills', 192.4, '电费水费'],
  ['2026-06-21', 'expense', 'buy', 358, '换季买短袖'],
  ['2026-06-24', 'expense', 'play', 176, '周末看电影'],
  ['2026-06-27', 'expense', 'eat', 84, '早餐一周'],
  // 2026年7月
  ['2026-07-02', 'expense', 'market', 221.8, '超市采购'],
  ['2026-07-04', 'expense', 'rent', 2750, '交房租'],
  ['2026-07-08', 'expense', 'eat', 146, '请父母吃饭'],
  ['2026-07-11', 'expense', 'ride', 118, '公交卡充值'],
  ['2026-07-15', 'income', 'pay', 17500, '7月工资'],
  ['2026-07-15', 'income', 'extra', 1500, '高温补贴'],
  ['2026-07-17', 'expense', 'school', 720, '孩子画画班'],
  ['2026-07-20', 'expense', 'bills', 208.7, '水电燃气'],
  ['2026-07-23', 'expense', 'buy', 412, '凉鞋和帽子'],
  ['2026-07-26', 'expense', 'clinic', 92, '买退烧药'],
  // 2026年8月
  ['2026-08-03', 'expense', 'market', 187.4, '超市采购'],
  ['2026-08-05', 'expense', 'rent', 2750, '交房租'],
  ['2026-08-08', 'expense', 'eat', 172, '朋友小聚'],
  ['2026-08-11', 'expense', 'ride', 118, '公交卡充值'],
  ['2026-08-15', 'income', 'pay', 17500, '8月工资'],
  ['2026-08-16', 'expense', 'play', 298, '水上乐园'],
  ['2026-08-19', 'expense', 'market', 264.9, '月末补货'],
  ['2026-08-22', 'expense', 'bills', 241.3, '空调电费'],
  ['2026-08-25', 'expense', 'school', 320, '绘本和文具'],
  ['2026-08-29', 'expense', 'social', 500, '同事乔迁红包'],
  // 2026年9月
  ['2026-09-03', 'expense', 'market', 238.2, '开学采购'],
  ['2026-09-05', 'expense', 'rent', 2750, '交房租'],
  ['2026-09-08', 'expense', 'eat', 96, '工作日午饭'],
  ['2026-09-10', 'expense', 'ride', 118, '公交卡充值'],
  ['2026-09-13', 'expense', 'buy', 636, '秋装两件'],
  ['2026-09-15', 'income', 'pay', 17500, '9月工资'],
  ['2026-09-17', 'expense', 'school', 1150, '秋季兴趣班'],
  ['2026-09-20', 'expense', 'bills', 176.8, '水电费'],
  ['2026-09-23', 'expense', 'clinic', 148, '配眼镜'],
  ['2026-09-27', 'expense', 'play', 168, '中秋买月饼'],
  // 2026年10月
  ['2026-10-04', 'expense', 'market', 219.7, '超市采购'],
  ['2026-10-05', 'expense', 'rent', 2750, '交房租'],
  ['2026-10-07', 'expense', 'eat', 236, '国庆家宴'],
  ['2026-10-10', 'expense', 'ride', 118, '公交卡充值'],
  ['2026-10-13', 'expense', 'buy', 488, '换季外套'],
  ['2026-10-15', 'income', 'pay', 17500, '10月工资'],
  ['2026-10-16', 'expense', 'market', 201.5, '水果零食'],
  ['2026-10-19', 'expense', 'bills', 193.2, '水电燃气'],
  ['2026-10-22', 'expense', 'clinic', 226, '洗牙'],
  ['2026-10-25', 'expense', 'play', 245, '周末演出票'],
  ['2026-10-28', 'income', 'gig', 1200, '周末兼职'],
  // 2026年11月（本月）
  ['2026-11-02', 'expense', 'market', 258.4, '超市采购一周'],
  ['2026-11-03', 'expense', 'eat', 68, '工作日午饭'],
  ['2026-11-05', 'expense', 'rent', 2750, '交房租'],
  ['2026-11-06', 'expense', 'ride', 118, '公交卡充值'],
  ['2026-11-08', 'expense', 'eat', 142, '周末涮火锅'],
  ['2026-11-09', 'expense', 'market', 176.9, '水果和牛奶'],
  ['2026-11-11', 'expense', 'buy', 396, '双十一囤纸巾'],
  ['2026-11-12', 'expense', 'school', 720, '孩子兴趣班'],
  ['2026-11-14', 'expense', 'play', 108, '电影票两张'],
  ['2026-11-15', 'income', 'pay', 17500, '11月工资'],
  ['2026-11-16', 'expense', 'market', 224.6, '超市采购'],
  ['2026-11-17', 'expense', 'bills', 182.3, '水电燃气费'],
  ['2026-11-18', 'expense', 'eat', 59, '工作日午饭'],
  ['2026-11-19', 'expense', 'mobile', 88, '话费充值'],
  ['2026-11-21', 'expense', 'eat', 198, '请朋友吃饭'],
  ['2026-11-22', 'expense', 'clinic', 126, '买钙片'],
  ['2026-11-23', 'expense', 'market', 167.8, '蔬菜鸡蛋'],
  ['2026-11-24', 'expense', 'ride', 36, '打车回家'],
  ['2026-11-25', 'expense', 'buy', 259, '冬靴一双'],
];

export const DEMO_ROWS = DEMO.map(([date, kind, cat, amount, memo]) => ({ date, kind, cat, amount, memo }));

export const DEMO_PLANS = {
  eat: 1400,
  market: 1900,
  ride: 550,
  rent: 2900,
  bills: 480,
  mobile: 180,
  clinic: 450,
  school: 1300,
  play: 550,
  buy: 900,
  social: 600,
  'misc-out': 250,
};
