/**
 * tools/check-undef.js
 *
 * 「宣言も import もされていない識別子」を検出する静的チェッカー。
 *
 * なぜ必要か：
 *   esbuild は構文しか見ないため、定数を削除・移動したあとに参照だけ
 *   残っていても素通りする。実機で初めて
 *     - ReferenceError: Property 'XXX' doesn't exist      （import ごと消した場合）
 *     - Cannot convert undefined value to object           （import 名だけ残した場合）
 *   として落ちる。テーマ移行のような大規模な定数の移動では必須。
 *
 * 使い方（プロジェクトルートで）：
 *   node tools/check-undef.js src
 *   node tools/check-undef.js src App.js
 *
 * 依存：@babel/parser, @babel/traverse
 *   入っていなければ：npx --yes --package @babel/parser --package @babel/traverse node tools/check-undef.js src
 *
 * 終了コード：問題なし 0 / 検出あり 1
 */

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const path = require('path');

/** グローバル扱いする識別子（RN / Hermes 環境で存在するもの） */
const GLOBALS = new Set([
  'console', 'require', 'module', 'exports', 'process',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Promise', 'JSON', 'Math', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Date', 'RegExp', 'Error', 'TypeError', 'Map', 'Set', 'WeakMap', 'Symbol',
  'Infinity', 'NaN', 'undefined', 'globalThis', 'global', '__DEV__',
  'fetch', 'Intl', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURIComponent', 'decodeURIComponent',
  'Uint8Array', 'ArrayBuffer', 'atob', 'btoa', 'TextDecoder', 'performance',
]);

function collect(target, out = []) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.js')) out.push(target);
    return out;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const p = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) collect(p, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('使い方: node tools/check-undef.js <ファイルまたはディレクトリ>...');
  process.exit(2);
}

let bad = 0;
for (const target of targets) {
  for (const file of collect(target)) {
    const code = fs.readFileSync(file, 'utf8');
    let ast;
    try {
      ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    } catch (e) {
      console.log(`❌ PARSE ${file}: ${e.message}`);
      bad++;
      continue;
    }
    traverse(ast, {
      ReferencedIdentifier(p) {
        const name = p.node.name;
        if (GLOBALS.has(name)) return;
        if (p.scope.hasBinding(name, true)) return;
        console.log(`❌ ${file}:${p.node.loc.start.line}  '${name}' は宣言も import もされていない`);
        bad++;
      },
    });
  }
}

console.log(bad ? `\n--- ${bad} 件の未定義参照` : '\n✅ 未定義参照なし');
process.exit(bad ? 1 : 0);
