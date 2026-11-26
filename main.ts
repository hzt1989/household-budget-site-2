// 小家账本 v2 的交卷程序（Node 22，只用标准库）。
// 只做两件事：把仓库里的 app/ 和 screenshots/ 原样拷到输出目录，
// 再用 kit 自带的 vendor/makefun-frontend.ts 里的 buildDossier 写出 dossier.json。
// 评分器在沙箱里跑它两次，两次输出必须字节一致；这里不写时间、不写随机数，
// 拷文件只按内容走，所以两次结果天然相同。
// 在评分器外，MAKEFUN_OUTPUT_DIR 代替 /output：
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error('app/index.html 不见了：请确认在仓库根目录运行，app/ 就在 main.ts 旁边。');
}
if (!existsSync(shotsDir)) {
  throw new Error('screenshots/ 不见了：请先放 3 到 4 张网站截图进去。');
}

// 先验截图：3 到 4 张、每张都是普通文件、不超过 256 KiB。
// 不合规就现在报错，别等到 buildDossier 里才发现。
const shotNames = readdirSync(shotsDir)
  .filter((n) => !n.startsWith('.'))
  .filter((n) => statSync(join(shotsDir, n)).isFile())
  .sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`screenshots/ 里有 ${shotNames.length} 张图，要 3 到 4 张。`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) throw new Error(`截图 ${name} 有 ${size} 字节，超过 256 KiB 上限。`);
}

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// 和评分器同一套上限：正文最多 160 KiB；截图最多 4 张、每张最多 256 KiB；
// app/ 最多 993 个文件和目录、总共最多 16 MiB。超了 buildDossier 会直接报错。
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`dossier.json 写好了：${dossier.length} 字节；截图 ${shotNames.length} 张（${shotNames.join(', ')}）。`);
