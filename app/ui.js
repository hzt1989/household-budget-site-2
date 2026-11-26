// 界面层：路由、五页渲染、表单与筛选。
// 数字全部来自 data.js 的现算结果，这里只管显示和接住点击。
import {
  OUT_CATS, IN_CATS, catName,
  readLedger, addEntry, editEntry, dropEntry,
  savePlans, setCarry, fillDemo, wipeAll,
  entriesOfMonth, monthTotals, outByCat, planRows,
  spendByDay, spendOfWeek, toCsv,
} from './data.js';
import { money, monthOf, monthText, dayText, dayWeekText, todayKey, thisMonthKey, moveMonth, pastMonths, weeksOfMonth, esc } from './numbers.js';
import { paintRing, paintTrend, paintBars } from './draw.js';

const ledger = readLedger();
let month = thisMonthKey();
let editing = null;
let kind = 'expense';
let weekIdx = 0;

const $ = (id) => document.getElementById(id);
const PAGES = ['home', 'new', 'list', 'plan', 'report'];

function pageName() {
  const hash = location.hash || '#/home';
  const name = hash.replace('#/', '').split('?')[0];
  return PAGES.includes(name) ? name : 'home';
}

function showPage(name) {
  for (const p of PAGES) {
    $('page-' + p).hidden = p !== name;
    document.querySelector('[data-tab="' + p + '"]')?.classList.toggle('on', p === name);
  }
}

function paintMonthBar() {
  $('monthNow').textContent = monthText(month);
  $('monthBack').hidden = month === thisMonthKey();
  $('monthHint').textContent = month === thisMonthKey()
    ? '就是这个月'
    : '看的是过去的月，记一笔会自动跳到那笔所在的月';
}

function markText(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  const needle = esc(q);
  const lower = safe.toLowerCase();
  const n = needle.toLowerCase();
  let out = '';
  let i = 0;
  while (true) {
    const at = lower.indexOf(n, i);
    if (at < 0) { out += safe.slice(i); break; }
    out += safe.slice(i, at) + '<mark>' + safe.slice(at, at + needle.length) + '</mark>';
    i = at + needle.length;
  }
  return out;
}

function entryRow(e, showDate, q) {
  const sign = e.kind === 'income' ? '+' : '-';
  const label = e.memo || catName(e.kind, e.cat);
  return `<li>
    <span class="entry-ico ${e.kind}">${esc(catName(e.kind, e.cat).slice(0, 2))}</span>
    <span class="entry-main">
      <span class="entry-note">${markText(label, q)}</span>
      <span class="entry-meta">${showDate ? dayWeekText(e.date) + ' · ' : ''}${esc(catName(e.kind, e.cat))}</span>
    </span>
    <span class="entry-amt ${e.kind}">${sign}${money(e.amount)}</span>
    <span class="entry-ops">
      <button type="button" class="mini-btn" data-fix="${e.id}" aria-label="改这笔">改</button>
      <button type="button" class="mini-btn danger" data-cut="${e.id}" aria-label="删这笔">删</button>
    </span>
  </li>`;
}

function wireEntryButtons(root) {
  root.querySelectorAll('[data-fix]').forEach((b) => {
    b.addEventListener('click', () => {
      editing = b.dataset.fix;
      location.hash = '#/new';
    });
  });
  root.querySelectorAll('[data-cut]').forEach((b) => {
    b.addEventListener('click', () => {
      const e = ledger.entries.find((x) => x.id === b.dataset.cut);
      if (!e) return;
      if (confirm('删掉这笔「' + (e.memo || catName(e.kind, e.cat)) + ' ' + money(e.amount) + '」吗？')) {
        dropEntry(ledger, e.id);
        paintAll();
      }
    });
  });
}

function paintHome() {
  const t = monthTotals(ledger, month);
  $('statIn').textContent = money(t.income);
  $('statOut').textContent = money(t.expense);
  $('statLeft').textContent = money(t.left);
  $('statInCount').textContent = t.inCount + ' 笔';
  $('statOutCount').textContent = t.outCount + ' 笔';
  $('statLeftNote').textContent = t.left >= 0 ? '收入 − 支出，还剩这么多' : '这个月花超了，悠着点';

  const pr = planRows(ledger, month);
  if (pr.totalLimit > 0) {
    const rate = Math.round((pr.totalUsed / pr.totalLimit) * 100);
    $('statPlan').textContent = rate + '%';
    $('statPlan').classList.toggle('over', rate > 100);
    $('statPlanNote').textContent = '已花 ' + money(pr.totalUsed) + ' / 预算 ' + money(pr.totalLimit);
  } else {
    $('statPlan').textContent = '—';
    $('statPlan').classList.remove('over');
    $('statPlanNote').textContent = '尚未设置预算';
  }

  const blank = ledger.entries.length === 0;
  $('blankBox').hidden = !blank;
  $('homeBody').hidden = blank;
  $('warnBox').hidden = blank;
  if (blank) return;

  const cats = outByCat(ledger, month);
  $('ringNone').hidden = cats.length > 0;
  $('ringCanvas').hidden = cats.length === 0;
  $('ringList').hidden = cats.length === 0;
  if (cats.length > 0) {
    paintRing($('ringCanvas'), cats, t.expense);
    $('ringList').innerHTML = cats.slice(0, 6).map((c) => {
      const pct = t.expense > 0 ? Math.round((c.amount / t.expense) * 100) : 0;
      return `<li><span class="swatch" style="background:${c.color}"></span>${esc(c.name)}<span class="amt">${money(c.amount)}</span><span class="pct">${pct}%</span></li>`;
    }).join('');
  }

  const fresh = entriesOfMonth(ledger, month).slice(0, 6);
  $('freshNone').hidden = fresh.length > 0;
  $('freshList').innerHTML = fresh.map((e) => entryRow(e, true, '')).join('');
  wireEntryButtons($('freshList'));

  const alarms = pr.rows.filter((r) => r.effective > 0 && (r.rate >= 0.8 || r.rate > 1));
  $('warnNone').hidden = alarms.length > 0;
  $('warnList').innerHTML = alarms.map((r) => {
    if (r.rate > 1) {
      return `<li><span class="over">超了：</span>${esc(r.name)}预算 ${money(r.effective)}，已花 ${money(r.used)}，超了 ${money(r.used - r.effective)}。</li>`;
    }
    return `<li><span class="soon">快到了：</span>${esc(r.name)}预算 ${money(r.effective)}，已花 ${money(r.used)}（${Math.round(r.rate * 100)}%）。</li>`;
  }).join('');
}

function fillCatOptions() {
  const list = kind === 'income' ? IN_CATS : OUT_CATS;
  $('fCat').innerHTML = list.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

function setKind(next) {
  kind = next;
  $('kindOut').classList.toggle('on', next === 'expense');
  $('kindOut').classList.toggle('out', next === 'expense');
  $('kindOut').setAttribute('aria-pressed', String(next === 'expense'));
  $('kindIn').classList.toggle('on', next === 'income');
  $('kindIn').classList.toggle('in', next === 'income');
  $('kindIn').setAttribute('aria-pressed', String(next === 'income'));
  fillCatOptions();
}

function checkAmount() {
  const raw = $('fAmt').value;
  const tip = $('amtTip');
  if (!raw) { tip.hidden = true; return; }
  const v = Number(raw);
  if (!Number.isFinite(v)) { tip.hidden = true; return; }
  if (v > 999999) {
    tip.textContent = '金额超过 ¥999,999 了，确认一下是不是多打了个零。';
    tip.hidden = false;
    return;
  }
  if (/\.\d{3,}/.test(raw)) {
    tip.textContent = '金额只留到分（小数点后两位），多余的位数不会保存。';
    tip.hidden = false;
    return;
  }
  tip.hidden = true;
}

function paintNew() {
  const target = editing ? ledger.entries.find((e) => e.id === editing) : null;
  $('entryTitle').textContent = target ? '改这笔' : '记一笔';
  $('formMsg').hidden = true;
  $('amtTip').hidden = true;
  if (target) {
    setKind(target.kind);
    $('fCat').value = target.cat;
    $('fAmt').value = target.amount;
    $('fDate').value = target.date;
    $('fNote').value = target.memo || '';
  } else {
    setKind('expense');
    $('fAmt').value = '';
    $('fDate').value = todayKey();
    $('fNote').value = '';
  }
}

function paintList() {
  const kindF = $('fltKind').value;
  const catF = $('fltCat').value;
  const q = $('fltQ').value.trim();
  let rows = entriesOfMonth(ledger, month);
  if (kindF !== 'all') rows = rows.filter((e) => e.kind === kindF);
  if (catF !== 'all') rows = rows.filter((e) => e.cat === catF);
  if (q) rows = rows.filter((e) => (e.memo || '').includes(q));
  $('listCount').textContent = '共 ' + rows.length + ' 笔';
  $('listNone').hidden = rows.length > 0;
  $('listRows').innerHTML = rows.map((e) => entryRow(e, true, q)).join('');
  wireEntryButtons($('listRows'));
  let out = 0;
  let inc = 0;
  for (const e of rows) {
    if (e.kind === 'expense') out += e.amount;
    else inc += e.amount;
  }
  $('listOut').textContent = money(out);
  $('listIn').textContent = money(inc);
}

function planRowHtml(r) {
  const pct = r.effective > 0 ? Math.min(100, Math.round((r.used / r.effective) * 100)) : 0;
  const cls = r.rate > 1 ? 'over' : r.rate >= 0.8 ? 'soon' : '';
  let meta;
  if (r.effective > 0) {
    const base = '已花 ' + money(r.used);
    const carryBit = r.rollover > 0 ? '，含上月转结 <span class="carry-text">' + money(r.rollover) + '</span>' : '';
    if (r.rate > 1) meta = base + carryBit + '，<span class="over-text">超了 ' + money(r.used - r.effective) + '</span>';
    else if (r.rate >= 0.8) meta = base + carryBit + '，<span class="soon-text">快到预算了（' + Math.round(r.rate * 100) + '%）</span>';
    else meta = base + carryBit + '，还剩 ' + money(r.effective - r.used);
  } else {
    meta = '还没给这个分类定预算';
  }
  return `<li data-cat="${r.id}">
    <div class="plan-row">
      <span class="plan-name">${esc(r.name)}</span>
      <label class="plan-input">每月预算 ¥<input type="number" min="0" step="1" inputmode="decimal" value="${r.limit || ''}" placeholder="0" aria-label="${esc(r.name)}每月预算"></label>
    </div>
    <div class="plan-bar"><i class="${cls}" style="width:${pct}%"></i></div>
    <div class="plan-meta">${meta}</div>
  </li>`;
}

function readPlanInputs() {
  const out = {};
  document.querySelectorAll('#planList li').forEach((li) => {
    const v = Number(li.querySelector('input').value);
    if (Number.isFinite(v) && v > 0) out[li.dataset.cat] = v;
  });
  return out;
}

function previewPlanTotals() {
  const draft = readPlanInputs();
  const pr = planRows(ledger, month);
  let limit = 0;
  for (const v of Object.values(draft)) limit += v;
  let rollover = 0;
  if (ledger.carry) {
    for (const r of pr.rows) rollover += r.rollover;
  }
  const total = limit + rollover;
  $('planTotal').textContent = money(total);
  $('planUsed').textContent = money(pr.totalUsed);
  $('planRemain').textContent = money(total - pr.totalUsed);
  $('planCarry').textContent = rollover > 0 ? '其中上月转结 ' + money(rollover) : '';
}

function paintPlan() {
  const pr = planRows(ledger, month);
  $('carryToggle').checked = ledger.carry;
  $('planList').innerHTML = pr.rows.map(planRowHtml).join('');
  previewPlanTotals();
  $('planDone').hidden = true;
  document.querySelectorAll('#planList input').forEach((input) => {
    input.addEventListener('input', () => {
      previewPlanTotals();
      $('planDone').hidden = true;
    });
  });
}

function paintReport() {
  const keys = pastMonths(month, 6);
  const months = keys.map((k) => {
    const t = monthTotals(ledger, k);
    return { label: Number(k.slice(5, 7)) + '月', income: t.income, expense: t.expense };
  });
  const monthsWithRows = keys.filter((k) => entriesOfMonth(ledger, k).length > 0).length;
  $('trendNone').hidden = monthsWithRows >= 2;
  $('trendCanvas').hidden = monthsWithRows < 2;
  if (monthsWithRows >= 2) paintTrend($('trendCanvas'), months);

  // 按周复盘：默认选中今天所在的那一周。
  const weeks = weeksOfMonth(month);
  const today = Number(todayKey().slice(8, 10));
  let defIdx = weeks.length - 1;
  if (month === thisMonthKey()) {
    weeks.forEach((w, i) => { if (today >= w.days[0] && today <= w.days[w.days.length - 1]) defIdx = i; });
  }
  if (weekIdx >= weeks.length) weekIdx = weeks.length - 1;
  if (!$('weekPick').dataset.built || $('weekPick').dataset.month !== month) {
    $('weekPick').innerHTML = weeks.map((w, i) =>
      `<option value="${i}">${w.label}（${w.from} – ${w.to}）</option>`).join('');
    $('weekPick').dataset.built = '1';
    $('weekPick').dataset.month = month;
    weekIdx = defIdx;
    $('weekPick').value = String(weekIdx);
  }
  const week = weeks[weekIdx];
  const wk = spendOfWeek(ledger, month, week.days);
  const prevWk = weekIdx > 0 ? spendOfWeek(ledger, month, weeks[weekIdx - 1].days) : null;
  let line = week.label + '（' + week.from + ' – ' + week.to + '）共支出 <b>' + money(wk.total) + '</b>';
  if (prevWk) {
    const diff = wk.total - prevWk.total;
    if (diff > 0) line += '，比上周多花 <span class="up">' + money(diff) + '</span>';
    else if (diff < 0) line += '，比上周少花 <span class="down">' + money(-diff) + '</span>';
    else line += '，和上周花得一样';
  } else {
    line += '，这是本月第一周';
  }
  $('weekLine').innerHTML = line;
  $('weekNone').hidden = wk.total > 0;
  $('weekCanvas').hidden = wk.total === 0;
  if (wk.total > 0) paintBars($('weekCanvas'), wk.rows, { height: 240, color: '#b4552d' });

  const days = spendByDay(ledger, month);
  const hasDaily = days.some((d) => d.amount > 0);
  $('dailyNone').hidden = hasDaily;
  $('dailyCanvas').hidden = !hasDaily;
  if (hasDaily) paintBars($('dailyCanvas'), days);

  const cats = outByCat(ledger, month);
  $('topNone').hidden = cats.length > 0;
  $('topList').innerHTML = cats.slice(0, 8).map((c) =>
    `<li>${esc(c.name)}<span class="amt">${money(c.amount)}</span></li>`).join('');
}

function paintAll() {
  paintMonthBar();
  const name = pageName();
  showPage(name);
  if (name === 'home') paintHome();
  else if (name === 'new') paintNew();
  else if (name === 'list') paintList();
  else if (name === 'plan') paintPlan();
  else if (name === 'report') paintReport();
}

// ---- 接线 ----

$('monthPrev').addEventListener('click', () => { month = moveMonth(month, -1); paintAll(); });
$('monthNext').addEventListener('click', () => { month = moveMonth(month, 1); paintAll(); });
$('monthBack').addEventListener('click', () => { month = thisMonthKey(); paintAll(); });

$('sampleBlank').addEventListener('click', () => { fillDemo(ledger); paintAll(); });
$('doSample').addEventListener('click', () => {
  if (ledger.entries.length > 0 && !confirm('这会用示例数据替换现在的全部账单和预算，确定吗？')) return;
  fillDemo(ledger);
  paintAll();
});
$('doWipe').addEventListener('click', () => {
  if (confirm('确定要清空全部账单和预算吗？这个操作不能撤销。')) {
    wipeAll(ledger);
    paintAll();
  }
});
$('doExport').addEventListener('click', () => {
  const blob = new Blob([toCsv(ledger)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '小家账本-账单.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('kindOut').addEventListener('click', () => setKind('expense'));
$('kindIn').addEventListener('click', () => setKind('income'));
$('fAmt').addEventListener('input', checkAmount);
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const cur = Number($('fAmt').value) || 0;
    $('fAmt').value = Math.round((cur + Number(chip.dataset.add)) * 100) / 100;
    checkAmount();
    $('fAmt').focus();
  });
});

$('entryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = Number($('fAmt').value);
  const date = $('fDate').value;
  const msg = $('formMsg');
  if (!Number.isFinite(amount) || amount <= 0) {
    msg.textContent = '金额要填一个大于 0 的数。';
    msg.hidden = false;
    return;
  }
  if (amount > 9999999) {
    msg.textContent = '金额太大了，确认一下是不是多打了零。';
    msg.hidden = false;
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    msg.textContent = '日期不对，选一个有效日期。';
    msg.hidden = false;
    return;
  }
  const entry = { kind, cat: $('fCat').value, amount, date, memo: $('fNote').value.trim() };
  if (editing) {
    editEntry(ledger, editing, entry);
    editing = null;
  } else {
    addEntry(ledger, entry);
  }
  const key = monthOf(date);
  if (key !== month) month = key;
  location.hash = '#/list';
  paintAll();
});
$('formBack').addEventListener('click', () => {
  editing = null;
  location.hash = '#/list';
  paintAll();
});

$('fltKind').addEventListener('change', paintList);
$('fltCat').addEventListener('change', paintList);
$('fltQ').addEventListener('input', paintList);

$('carryToggle').addEventListener('change', () => {
  setCarry(ledger, $('carryToggle').checked);
  paintPlan();
});
$('planSave').addEventListener('click', () => {
  savePlans(ledger, readPlanInputs());
  $('planDone').hidden = false;
  paintPlan();
});

$('weekPick').addEventListener('change', () => {
  weekIdx = Number($('weekPick').value);
  paintReport();
});

window.addEventListener('hashchange', () => { paintAll(); });
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(paintAll, 150);
});

// 账单分类筛选：支出和收入分类放一起，按类型分组显示。
(function buildCatFilter() {
  const groups = [['支出', OUT_CATS], ['收入', IN_CATS]];
  $('fltCat').innerHTML = '<option value="all">全部分类</option>' + groups.map(([label, list]) =>
    `<optgroup label="${label}">` + list.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('') + '</optgroup>').join('');
})();

if (!location.hash) location.hash = '#/home';
paintAll();
