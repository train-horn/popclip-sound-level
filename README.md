# Sound Level at Distance (PopClip extension)

By [Train Horn](https://train-horn.com/), an independent US reference on train horns.

Select a sound level in any app, such as `150 dB` or `150 dB at 10 ft`, and PopClip shows the estimated level farther away:

```
150 dB @ 10 ft → 25 ft: 142.0 · 50 ft: 136.0 · 100 ft: 130.0 · 500 ft: 116.0 · 1000 ft: 110.0 dB (free field)
```

It uses the free-field inverse-square law:

```
L2 = L1 − 20 · log10(d2 / d1)
```

Every doubling of distance takes off about 6 dB, and every tenfold step takes off 20 dB.

## Install

1. Install [PopClip](https://www.popclip.app/) for macOS.
2. Install the extension from the PopClip extensions directory, or download this repository, then double-click `source/SoundLevelAtDistance.popclipext` and confirm the install in PopClip.

## Usage

Select text that contains a level in dB. Accepted forms:

| Selection | Reference used |
|---|---|
| `150 dB` | 10 ft (default) |
| `150 dB at 10 ft`, `150dB @ 10ft`, `149 dB at 1'` | the given distance in feet |
| `120 dBA at 3 m`, `120 dB @ 1 metre` | the given distance in meters; results are shown at 25/50/100/500/1000 **m** |
| `118 decibels from 100 feet` | 100 ft |
| A sentence such as `rated 150 dB at 10 ft by its maker` | the first level found |

Weighting letters (`dBA`, `dB(C)`) are kept in the output. Decimal commas (`120,5 dB`) work.

**Copy a table.** Turn on *Also copy a table to the clipboard* in the extension's settings, or hold **Shift** when you click the action. The clipboard then gets a tab-separated table you can paste into a spreadsheet:

```
Distance (ft)	Level (dB)
10 (reference)	150.0
25	142.0
50	136.0
100	130.0
500	116.0
1000	110.0
Free-field estimate: L2 = L1 - 20*log10(d2/d1). Not a measurement.
```

If the selection has no level, or uses an unsupported unit (for example `km` or `yards`), PopClip shows a short message saying what to select instead.

## Limitations

- **Free field only.** The estimate assumes a point source in open air with no reflections, ground effect, wind, temperature gradients, barriers or air absorption. Real levels at long distances are often lower (absorption, obstacles) and sometimes higher (reflections, downwind).
- **A manufacturer dB figure is not a measurement.** Ratings like "150 dB" on horns, sirens and speakers are usually the maker's claim, often at an unstated distance or weighting. This extension only rescales whatever number you give it; it cannot make that number more accurate.
- Very close distances (near field) do not follow the inverse-square law.
- Levels are limited to 0–200 dB and units to feet and meters.
- This is an estimate, not hearing-safety or legal advice.

For an interactive version in the browser, see the [decibel distance calculator on train-horn.com](https://train-horn.com/tools/decibel-distance/).

## Development

The extension is plain JavaScript with no dependencies. The pure functions (`parse`, `levelAt`, `formatResult`, `formatTable`, `run`) live in `soundlevel.js`; the PopClip glue at the end of the file runs only inside PopClip.

```
npm test        # node --test test/
```

The tests check the parser and math (150 dB @ 10 ft → 130.0 dB @ 100 ft), error messages, the PopClip glue (run in a VM with a mock `popclip` object, as PopClip runs it), and the selection regex in `Config.yaml`.

Repository layout:

```
popclip-directory.yaml
source/SoundLevelAtDistance.popclipext/Config.yaml
source/SoundLevelAtDistance.popclipext/soundlevel.js
test/soundlevel.test.js
```

## License

MIT. See [LICENSE](LICENSE).
