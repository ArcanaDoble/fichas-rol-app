# Third-party notices

## User-provided tree scenery

The Canvas tree catalog uses images supplied from the user's local
`Downloads/Arboles_PNG` and `Downloads/Arboles_Nuevos_PNG` folders. The twelve
images in the first folder were extracted from Forgotten Adventures'
`FA_Objects_A_v3.54.dungeondraft_pack`, according to its supplied provenance file.
Their original pack paths and hashes are retained in `public/scenery/trees/sources.json`.
The additional three images retain their supplied folder/file attribution in
`src/features/tactical-shared/treeCatalog.json`. NOMA creates transparent WebP
copies, thumbnails and simplified canopy contours; it does not alter the source PNGs.
These graphics retain their respective source rights and are not relicensed as
part of NOMA's GPL code license.

## User-provided caltrops scenery

The transparent WebPs in `public/scenery/hazards/` are from
`packs/FA35OB01/textures/objects/Decor/Clutter/Adventuring_Gear/` in the user's
local Forgotten Adventures `FA_Objects_A_v3.54.dungeondraft_pack`.
`abrojos.webp` is the original `Caltrops_Metal_Rusty_D_1x1.webp` used in the
inspector thumbnail. The field uses the individual piece `abrojos-1.webp`,
originally `Caltrops_Metal_Rusty_A_1x1.webp`. The companion WebPs
`abrojos-2.webp` and `abrojos-3.webp` preserve the original B and C variants.
The artwork retains its source rights.

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

Presteza, Vitalidad and Barrera rúnica's caster charge and persistent shield adapt `surface4d`, `noisy` and their noise helpers from
`tokenmagic/fx/glsl/fragmentshaders/forcefield.js`, at the same revision above.
Selected GLSL functions are in `src/vendor/tokenmagic/potionFields.js`.
Copyright Feu-Secret/Tokenmagic contributors; GNU GPL v3.0.
NOMA adds transient consumption timing, portrait alignment, transparent light
composition, wind ribbons and a gold expanding field in
`src/components/potionBuffShader.js`. No upstream preview GIF is distributed.
The continuous gold membrane and impact displacement in
`src/features/tactical-shared/components/arcaneBarrierFieldShader.js` reuse
those same Air Field/Magic Field functions. NOMA supplies the permanent timing,
shape mask, portrait transparency, shared GPU surface, caster charge, arrival reveal and transient hit wave.

## TokenMagic Fire v2 noise

Bola de fuego adapts the `rand`, `noise` and `fbm` helpers from
`tokenmagic/fx/glsl/fragmentshaders/xfire.js`, revision
`0999bb9f2f4d4b5e41135913a67bc73a4fc2cc1d`.
Local selection: `src/vendor/tokenmagic/fireNoise.js` (renamed functions and
fixed amplitude). Copyright Feu-Secret/Tokenmagic contributors; GNU GPL v3.0.
NOMA adds the launch trajectory, transient fire masks, pressure wave, cooling
smoke and ballistic embers in `src/features/canvas/spells/fireballShader.js`.
Proyectil arcano also reuses these attributed noise helpers in
`src/features/canvas/spells/arcaneProjectileShader.js` for its moving core,
filaments and transient violet field. Its sigils, wall-respecting braided trail,
fracture, fragments and timing are NOMA code; Electric and Magic Field were
consulted as visual/technical references without copying their shaders.
The preview GIFs are references only and are not distributed.

Niebla arcana reuses the same attributed noise in
`src/features/canvas/spells/arcaneMistShader.js` for gathering vapor, its curved
trail and the rolling square cloud. Fog and Fumes from the
[TokenMagic preview gallery](https://github.com/Feu-Secret/Tokenmagic/blob/master/wiki/TokenMagicPreview.md)
were visual/technical references; their shaders were not copied into this new
composition. The launch masks, premultiplied layers, timing and renderer are
NOMA code. The existing persistent fog and CSS fallback continue to use the
attributed Fog shader described above.

Barrera rúnica reuses the attributed Fire v2 noise helpers in
`src/features/canvas/spells/arcaneBarrierShader.js` for sparse arrival glints.
Magic Field and Waves in the TokenMagic preview gallery informed its visual
direction. The braided delivery, binding wave and local timing
are NOMA code; its caster charge and persistent material use the Air Field/Magic Field
adaptation described above. No preview media is distributed.

## Cinzel pointer lettering

The unmodified Cinzel Bold Latin WOFF2 from Google Fonts (version 26) is
included at `src/assets/fonts/cinzel-latin-700.woff2`, using the CSS family
alias `Noma Pointer Cinzel` only for Canvas pointer names.
Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel).
License: SIL Open Font License 1.1, distributed in
`public/licenses/cinzel-OFL.txt` (served at `/licenses/cinzel-OFL.txt`).
Source: https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgfY3lDQ.woff2
