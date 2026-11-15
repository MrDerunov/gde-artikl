// Build: concatenates src into one autonomous gde-artikl.html + dev.html (external files).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const listDir = (dir) => fs.readdirSync(path.join(ROOT, dir))
  .filter((f) => /\.(css|js)$/.test(f))
  .sort();

const cssFiles = listDir('src/css');
const jsFiles = listDir('src/js');
if (!cssFiles.length || !jsFiles.length) { console.error('empty src'); process.exit(1); }

const shell = read('src/shell.html');
if (!shell.includes('<!--INJECT_CSS-->') || !shell.includes('<!--INJECT_JS-->')) {
  console.error('shell.html: markers missing'); process.exit(1);
}

const css = cssFiles.map((f) => '/* ===== ' + f + ' ===== */\n' + read('src/css/' + f)).join('\n');
const js = jsFiles.map((f) => '/* ===== ' + f + ' ===== */\n' + read('src/js/' + f)).join('\n;\n');

// safety: no closing script tag inside inlined JS
if (/<\/script/i.test(js)) { console.error('ERROR: JS contains </script>'); process.exit(1); }

// external resource audit
const all = js + '\n' + css;
const external = (all.match(/https?:\/\//gi) || []);
const externalCss = (css.match(/@import/gi) || []);

const finalHtml = shell
  .replace('<!--INJECT_CSS-->', '<style>\n' + css + '\n</style>')
  .replace('<!--INJECT_JS-->', '<script>\n' + js + '\n</script>');
fs.writeFileSync(path.join(ROOT, 'gde-artikl.html'), finalHtml, 'utf8');

const devHtml = shell
  .replace('<!--INJECT_CSS-->', cssFiles.map((f) => '<link rel="stylesheet" href="src/css/' + f + '">').join('\n'))
  .replace('<!--INJECT_JS-->', jsFiles.map((f) => '<script src="src/js/' + f + '"></script>').join('\n'));
fs.writeFileSync(path.join(ROOT, 'dev.html'), devHtml, 'utf8');

const size = fs.statSync(path.join(ROOT, 'gde-artikl.html')).size;
const sizeKb = (size / 1024).toFixed(1);
console.log('BUILD OK  gde-artikl.html = ' + sizeKb + ' KB');
console.log('  css: ' + cssFiles.join(', '));
console.log('  js : ' + jsFiles.join(', '));
if (external.length) console.log('  WARNING external urls: ' + external.slice(0, 5).join(' '));
if (externalCss.length) console.log('  WARNING @import in css');
if (size > 1.6 * 1024 * 1024) console.log('  WARNING size > 1.6 MB');
