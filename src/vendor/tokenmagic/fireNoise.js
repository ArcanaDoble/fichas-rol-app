/*
 * Noise helpers adapted from TokenMagic Fire v2 (xfire.js).
 * Copyright (c) Feu-Secret/Tokenmagic contributors.
 * SPDX-License-Identifier: GPL-3.0-only
 * Source revision: 0999bb9f2f4d4b5e41135913a67bc73a4fc2cc1d
 * https://github.com/Feu-Secret/Tokenmagic/blob/0999bb9f2f4d4b5e41135913a67bc73a4fc2cc1d/tokenmagic/fx/glsl/fragmentshaders/xfire.js
 * Renamed helpers and fixed amplitude. NOMA supplies the spatial masks,
 * projectile, transient explosion, smoke, sparks and timing.
 */
export const fireNoise = `
float fireRand(vec2 n) {
    return fract(cos(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}
float fireNoise(vec2 n) {
    const vec2 d = vec2(0.0, 1.0);
    vec2 b = floor(n);
    vec2 f = smoothstep(vec2(0.), vec2(1.0), fract(n));
    return mix(mix(fireRand(b), fireRand(b + d.yx), f.x),
               mix(fireRand(b + d.xy), fireRand(b + d.yy), f.x), f.y);
}
float fireFbm(vec2 n) {
    float total = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++) {
        total += fireNoise(n) * amp;
        n += n;
        amp *= 0.5;
    }
    return total;
}
`;
