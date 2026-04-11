const fs = require('fs');
const path = require('path');
const parse = require('@babel/parser').parse;
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;

const ROOT = path.join(__dirname, '..');

const REL_DIRS = ['src', 'server', 'scripts', 'app'];

const SKIP_NAMES = new Set(['strip-all-comments.js']);

const PARSER_PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'optionalChaining',
  'nullishCoalescingOperator',
  'numericSeparator',
  'logicalAssignment',
  'dynamicImport',
  'topLevelAwait',
  'importMeta',
  'objectRestSpread',
  'exportDefaultFrom',
  'exportNamespaceFrom',
];

function walkDir(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist-web' || name === 'dist-web-test' || name === '.git') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkDir(full, out);
    else if (name.endsWith('.js') && !SKIP_NAMES.has(name)) out.push(full);
  }
}

function stripFile(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      allowAwaitOutsideFunction: true,
      errorRecovery: true,
      plugins: PARSER_PLUGINS,
    });
  } catch (e) {
    console.error('PARSE FAIL', path.relative(ROOT, absPath), e.message);
    return false;
  }
  traverse(ast, {
    enter(p) {
      const n = p.node;
      if (!n || typeof n !== 'object') return;
      if ('leadingComments' in n) delete n.leadingComments;
      if ('innerComments' in n) delete n.innerComments;
      if ('trailingComments' in n) delete n.trailingComments;
    },
  });
  const out = generate(ast, { comments: false, retainLines: true, compact: false }, code).code;
  if (out !== code) fs.writeFileSync(absPath, out, 'utf8');
  return true;
}

function main() {
  const files = [];
  for (const rel of REL_DIRS) walkDir(path.join(ROOT, rel), files);
  for (const extra of ['babel.config.js', 'metro.config.js']) {
    const p = path.join(ROOT, extra);
    if (fs.existsSync(p)) files.push(p);
  }
  let ok = 0;
  for (const f of files) {
    if (stripFile(f)) ok += 1;
  }
  console.log('Processed', ok, 'files');
}

main();
