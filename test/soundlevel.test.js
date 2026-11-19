// Run with: node --test   (or npm test)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EXT = path.join(__dirname, '../source/SoundLevelAtDistance.popclipext');
const SRC = fs.readFileSync(path.join(EXT, 'soundlevel.js'), 'utf8');
const s = require(path.join(EXT, 'soundlevel.js'));

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('math: 150 dB @ 10 ft is 130.0 dB @ 100 ft', () => {
  near(s.levelAt(150, 10, 100), 130);
});

test('math: doubling distance loses 20*log10(2) = 6.02 dB', () => {
  near(s.levelAt(100, 1, 2), 100 - 20 * Math.log10(2));
  near(150 - s.levelAt(150, 10, 20), 6.0206, 1e-4);
});

test('math: same distance keeps level; closer is louder', () => {
  near(s.levelAt(120, 3, 3), 120);
  assert.ok(s.levelAt(120, 10, 5) > 120);
});

test('math: rejects non-positive distances', () => {
  assert.throws(() => s.levelAt(150, 0, 10));
  assert.throws(() => s.levelAt(150, 10, -1));
});

test('parse: default reference is 10 ft', () => {
  const p = s.parse('150 dB');
  assert.equal(p.level, 150);
  assert.equal(p.refDistance, 10);
  assert.equal(p.unit, 'ft');
  assert.equal(p.refGiven, false);
});

test('parse: explicit distances and units', () => {
  const cases = [
    ['150 dB at 10 ft', 150, 10, 'ft'],
    ['150dB @ 10ft', 150, 10, 'ft'],
    ['152.5 dB from 4 feet', 152.5, 4, 'ft'],
    ["149 dB at 1'", 149, 1, 'ft'],
    ['120 dB at 3 m', 120, 3, 'm'],
    ['120 dB @ 1 metre', 120, 1, 'm'],
    ['120,5 dB at 2 meters', 120.5, 2, 'm'],
    ['118 decibels at 100 feet', 118, 100, 'ft'],
    ['150 dB, 10 m', 150, 10, 'm'],
    ['150 dB at 10', 150, 10, 'ft'],
    ['The K5LA is rated 150 dB at 10 ft by its maker.', 150, 10, 'ft'],
  ];
  for (const [text, level, d, unit] of cases) {
    const p = s.parse(text);
    assert.equal(p.level, level, text);
    assert.equal(p.refDistance, d, text);
    assert.equal(p.unit, unit, text);
  }
});

test('parse: weighting letters are kept', () => {
  assert.equal(s.parse('120 dBA at 3 m').weighting, 'A');
  assert.equal(s.parse('120 dB(C)').weighting, 'C');
  assert.equal(s.parse('120 dB at 3 m').weighting, '');
});

test('parse: invalid text gives a clear message', () => {
  assert.throws(() => s.parse('hello world'), /No sound level found/);
  assert.throws(() => s.parse(''), /No sound level found/);
  assert.throws(() => s.parse(null), /No sound level found/);
  assert.throws(() => s.parse('250 dB'), /between 0 and 200/);
  assert.throws(() => s.parse('0 dB'), /between 0 and 200/);
  assert.throws(() => s.parse('150 dB at 0 ft'), /greater than 0/);
  assert.throws(() => s.parse('150 dB at 2 km'), /Unsupported distance unit "km"/);
  assert.throws(() => s.parse('150 dB at 30 yards'), /Unsupported distance unit/);
});

test('run: never throws, returns message for invalid text', () => {
  const r = s.run('no numbers here');
  assert.equal(r.ok, false);
  assert.match(r.text, /^No sound level found\. Select a level like "150 dB"/);
});

test('result line: 150 dB @ 10 ft', () => {
  const r = s.run('150 dB at 10 ft');
  assert.equal(r.ok, true);
  assert.equal(r.text,
    '150 dB @ 10 ft → 25 ft: 142.0 · 50 ft: 136.0 · 100 ft: 130.0 · 500 ft: 116.0 · 1000 ft: 110.0 dB (free field)');
});

test('result line: meters input uses meters', () => {
  const r = s.run('120 dBA @ 3 m');
  assert.match(r.text, /^120 dBA @ 3 m → 25 m: 101\.6 .* 100 m: 89\.5 .* 1000 m: 69\.5 dBA/);
  assert.ok(!/ ft/.test(r.text));
});

test('table: rows for reference and targets', () => {
  const t = s.run('150 dB').table.split('\n');
  assert.equal(t[0], 'Distance (ft)\tLevel (dB)');
  assert.equal(t[1], '10 (reference)\t150.0');
  assert.deepEqual(t.slice(2, 7), ['25\t142.0', '50\t136.0', '100\t130.0', '500\t116.0', '1000\t110.0']);
  assert.match(t[7], /Not a measurement/);
});

// Run the file the way PopClip does: as a function body with a `popclip` global.
function runInPopClip(text, opts = {}) {
  const copied = [];
  const ctx = {
    popclip: {
      input: { text },
      options: { copytable: !!opts.copytable },
      modifiers: { shift: !!opts.shift },
      copyText: (t) => copied.push(t),
    },
  };
  const result = new vm.Script('(function(){' + SRC + '\n})()').runInNewContext(ctx);
  return { result, copied };
}

test('popclip glue: shows result, copies nothing by default', () => {
  const { result, copied } = runInPopClip('150 dB at 10 ft');
  assert.match(result, /100 ft: 130\.0/);
  assert.equal(copied.length, 0);
});

test('popclip glue: option or Shift copies the table', () => {
  assert.match(runInPopClip('150 dB', { copytable: true }).copied[0], /^Distance \(ft\)/);
  assert.match(runInPopClip('150 dB', { shift: true }).copied[0], /100\t130\.0/);
});

test('popclip glue: invalid text shows a message and copies nothing', () => {
  const { result, copied } = runInPopClip('banana', { copytable: true });
  assert.match(result, /No sound level found/);
  assert.equal(copied.length, 0);
});

test('Config.yaml: fields and selection regex', () => {
  const yaml = fs.readFileSync(path.join(EXT, 'Config.yaml'), 'utf8');
  for (const key of ['name:', 'identifier:', 'popclipVersion:', 'javaScriptFile: soundlevel.js', 'after: show-result', 'identifier: copytable']) {
    assert.ok(yaml.includes(key), key);
  }
  const raw = yaml.match(/regex: '(.*)'/)[1].replace(/''/g, "'");
  const re = new RegExp(raw.replace(/^\(\?i\)/, ''), 'i');
  for (const ok of ['150 dB', '150dB', '150 dBA', '120 decibels', '150 dB at 10 ft', '99.5 db']) assert.ok(re.test(ok), ok);
  for (const bad of ['hello', 'dB', '150 ft', 'decibel']) assert.ok(!re.test(bad), bad);
});

test('popclip-directory.yaml includes the extension folder', () => {
  const y = fs.readFileSync(path.join(__dirname, '../popclip-directory.yaml'), 'utf8');
  assert.match(y, /include: "source\/\*\.popclipext"/);
  assert.ok(fs.existsSync(EXT));
});
