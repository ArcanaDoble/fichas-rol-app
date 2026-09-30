# Third-party notices

## TokenMagic Fog shader

NOMA incorporates the `innerFog` fragment shader from
[Feu-Secret/Tokenmagic](https://github.com/Feu-Secret/Tokenmagic), revision
`0999bb9f2f4d4b5e41135913a67bc73a4fc2cc1d`.

- Original file: `tokenmagic/fx/glsl/fragmentshaders/fog.js`
- Local copy: `src/vendor/tokenmagic/fog.js`
- Verbatim GLSL SHA-256: `6979adfb0bc6ca25f7aa51afe167f5271a1355548b6ad1e68603eafe617565aa`
- License: GNU General Public License v3.0
- Copyright: Feu-Secret/Tokenmagic contributors

The shader source is preserved verbatim inside the exported GLSL string. NOMA
is distributed under GNU GPL v3; the complete license text is available in
`LICENSE`.

## TokenMagic Air Field and Magic Field

Presteza and Vitalidad adapt `surface4d`, `noisy` and their noise helpers from
`tokenmagic/fx/glsl/fragmentshaders/forcefield.js`, at the same revision above.
Selected GLSL functions are in `src/vendor/tokenmagic/potionFields.js`.
Copyright Feu-Secret/Tokenmagic contributors; GNU GPL v3.0.
NOMA adds transient consumption timing, portrait alignment, transparent light
composition, wind ribbons and a gold expanding field in
`src/components/potionBuffShader.js`. No upstream preview GIF is distributed.
