[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/hzt1989/household-budget-site-2/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/hzt1989/household-budget-site-2/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

# 小家账本 · 一家人的钱，花得明白

一个给一家人记账的静态网站：记一笔、看月度收支、管分类预算、按周复盘，全在浏览器里完成，不联网、不上传。

## 能做什么

- **总览**：本月收入、支出、结余、预算执行情况一目了然；支出分类环形图、最近记账、预算提醒都在一页上。
- **记一笔**：支出还是收入、分类、金额、日期、备注，填完就存；随时可以改、可以删。金额有快捷加数（+10 / +50 / +100 / +200），填错了会当场提醒。
- **账单**：按月、按类型、按分类、按备注搜，搜到的字会高亮；每笔都能改能删，底部有本页合计。
- **预算**：给每个支出分类定每月上限，花到 80% 提醒，超了标红并告诉你超了多少；还可以把上月没花完的预算转结到本月。
- **统计**：最近六个月收支对照、本月每天花多少、本月支出排行，还有「按周复盘」——选一周看看比上周多花还是少花。
- **数据归你**：所有账单和预算只存在这台设备的浏览器 localStorage 里，不上传；可以导出 CSV，也可以一键清空；第一次用可以载入一份示例数据先逛逛。

## 怎么打开

不需要构建，不需要联网。进到 `app/` 目录，起一个静态服务器就行：

```bash
cd app
python3 -m http.server 8000
```

然后用浏览器打开 http://localhost:8000 。手机和桌面都能用。

## 仓库里有什么

- `app/`：网站本身（`index.html`、`theme.css`、`numbers.js`、`data.js`、`draw.js`、`ui.js`），纯静态文件。
- `screenshots/`：网站的真实截图。
- `main.ts`：交卷程序，把 `app/` 和 `screenshots/` 拷到输出目录并写出 `dossier.json`。
- `vendor/makefun-frontend.ts`：make.fun kit 自带的 dossier 工具，未改动。

## 许可

MIT，见 LICENSE。
