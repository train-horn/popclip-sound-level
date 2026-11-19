// Sound Level at Distance: free-field inverse-square estimate.
//   L2 = L1 - 20 * log10(d2 / d1)
// Same formula as the train-horn.com decibel-distance calculator and the
// trainhorn-calc core library. Pure functions below; the PopClip glue is at
// the end of the file.

var TARGETS = [25, 50, 100, 500, 1000];
var DEFAULT_REF_FT = 10;
var USAGE = 'Select a level like "150 dB" or "150 dB at 10 ft" (or "120 dB at 3 m").';

var UNIT_ALIASES = {
  ft: 'ft', feet: 'ft', foot: 'ft', "'": 'ft',
  m: 'm', meter: 'm', meters: 'm', metre: 'm', metres: 'm'
};

function toNumber(s) {
  return parseFloat(String(s).replace(',', '.'));
}

// Parse "150 dB", "150dBA", "150 dB(A) at 10 ft", "120 decibels @ 3 m".
// Returns { level, weighting, refDistance, unit, refGiven } or throws Error.
function parse(text) {
  var s = String(text == null ? '' : text);
  var lm = /(-?\d+(?:[.,]\d+)?)\s*(db|decibels?)(\([ac]\)|[ac](?![a-z]))?/i.exec(s);
  if (!lm) throw new Error('No sound level found. ' + USAGE);
  var level = toNumber(lm[1]);
  if (!isFinite(level) || level <= 0 || level > 200) {
    throw new Error('Sound level must be between 0 and 200 dB (got ' + lm[1] + ').');
  }
  var weighting = lm[3] ? lm[3].replace(/[()]/g, '').toUpperCase() : '';

  var rest = s.slice(lm.index + lm[0].length);
  var dm = /^[\s,;:]*(?:(at|@|from)\s*)?(-?\d+(?:[.,]\d+)?)\s*(feet|foot|ft|metres?|meters?|m(?![a-z])|'|[a-z]+)?/i.exec(rest);
  var refDistance = DEFAULT_REF_FT;
  var unit = 'ft';
  var refGiven = false;
  if (dm) {
    var rawUnit = dm[3] ? dm[3].toLowerCase() : '';
    if (rawUnit && !UNIT_ALIASES[rawUnit]) {
      throw new Error('Unsupported distance unit "' + dm[3] + '". Use ft or m.');
    }
    if (!rawUnit && !dm[1]) {
      // a bare number after the level that is not introduced by "at": ignore it
    } else {
      refDistance = toNumber(dm[2]);
      unit = rawUnit ? UNIT_ALIASES[rawUnit] : 'ft';
      refGiven = true;
      if (!isFinite(refDistance) || refDistance <= 0 || refDistance > 100000) {
        throw new Error('Reference distance must be greater than 0 (got ' + dm[2] + ').');
      }
    }
  }
  return { level: level, weighting: weighting, refDistance: refDistance, unit: unit, refGiven: refGiven };
}

// Inverse-square law in free field.
function levelAt(level, refDistance, distance) {
  if (!(refDistance > 0) || !(distance > 0)) throw new Error('Distances must be greater than 0.');
  return level - 20 * Math.log10(distance / refDistance);
}

function round1(x) {
  return (Math.round(x * 10) / 10).toFixed(1);
}

function fmtNum(x) {
  return String(Math.round(x * 1000) / 1000);
}

function table(p, targets) {
  targets = targets || TARGETS;
  return targets.map(function (d) {
    return { distance: d, unit: p.unit, level: levelAt(p.level, p.refDistance, d) };
  });
}

function dbLabel(p) {
  return p.weighting ? 'dB' + p.weighting : 'dB';
}

// One line for the PopClip bar.
function formatResult(p) {
  var parts = table(p).map(function (r) {
    return r.distance + ' ' + r.unit + ': ' + round1(r.level);
  });
  return fmtNum(p.level) + ' ' + dbLabel(p) + ' @ ' + fmtNum(p.refDistance) + ' ' + p.unit +
    ' → ' + parts.join(' · ') + ' ' + dbLabel(p) + ' (free field)';
}

// Small plain-text table for the clipboard.
function formatTable(p) {
  var unitLabel = dbLabel(p);
  var lines = ['Distance (' + p.unit + ')\tLevel (' + unitLabel + ')',
    fmtNum(p.refDistance) + ' (reference)\t' + round1(p.level)];
  table(p).forEach(function (r) {
    lines.push(r.distance + '\t' + round1(r.level));
  });
  lines.push('Free-field estimate: L2 = L1 - 20*log10(d2/d1). Not a measurement.');
  return lines.join('\n');
}

// Returns { ok, text, table }. Never throws: errors become a readable message.
function run(text) {
  try {
    var p = parse(text);
    return { ok: true, text: formatResult(p), table: formatTable(p), parsed: p };
  } catch (e) {
    return { ok: false, text: e.message, table: '' };
  }
}

if (typeof popclip !== 'undefined') {
  var res = run(popclip.input.text);
  var wantTable = (popclip.options && popclip.options.copytable) ||
    (popclip.modifiers && popclip.modifiers.shift);
  if (res.ok && wantTable) popclip.copyText(res.table);
  return res.text;
}
if (typeof module !== 'undefined') {
  module.exports = { parse: parse, levelAt: levelAt, formatResult: formatResult, formatTable: formatTable, run: run, TARGETS: TARGETS };
}
