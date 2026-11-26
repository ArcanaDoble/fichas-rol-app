import { fireNoise } from '../../../vendor/tokenmagic/fireNoise';

export const fireballVertexShader = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;

export const fireballFragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform vec2 origin, size, start, control, destination, area;
uniform float elapsed, seed;
${fireNoise}
const float PI = 3.14159265;
float sat(float n) { return clamp(n, 0., 1.); }
vec2 trajectory(float t) {
    return mix(mix(start, control, t), mix(control, destination, t), t);
}
vec3 palette(float heat) {
    vec3 ember = mix(vec3(.42, .025, .008), vec3(1., .19, .015), smoothstep(.15, .5, heat));
    return mix(ember, vec3(1., .88, .48), smoothstep(.5, .9, heat));
}
void main() {
    vec2 p = origin + vec2(uv.x, 1. - uv.y) * size;
    float t = elapsed;
    float cell = min(area.x, area.y) * .5;
    float flight = sat((t - .38) / .72);
    vec2 orb = trajectory(flight * flight * (3. - 2. * flight));
    float orbRadius = cell * mix(.10, .28, smoothstep(0., .38, t));
    vec2 oq = (p - orb) / orbRadius;
    float turbulence = fireFbm(oq * 3. + vec2(seed, -t * 7.));
    float orbMask = (1. - smoothstep(.50, 1.25, length(oq) + turbulence * .35));
    float traveling = (1. - smoothstep(1.07, 1.14, t)) * smoothstep(0., .12, t);
    vec3 light = palette(turbulence + .3) * orbMask * traveling;
    float alpha = orbMask * traveling;
    float glow = exp(-dot(oq, oq) * .24) * .28 * traveling;
    light += vec3(1., .22, .025) * glow;
    alpha = max(alpha, glow);
    // A curved wake: cooling toward the caster, with broken tongues of fire.
    for (int i = 1; i <= 14; i++) {
        float index = float(i);
        float past = flight - index * .026;
        vec2 tail = trajectory(sat(past) * sat(past) * (3. - 2. * sat(past)));
        float radius = orbRadius * (1. - index / 17.);
        float wake = exp(-dot(p - tail, p - tail) / (radius * radius))
            * step(0., past) * traveling * (1. - index / 15.) * .25;
        light += vec3(1., .20 + .02 * index, .02) * wake;
        alpha = max(alpha, wake * 1.8);
    }
    float impact = max(0., t - 1.1);
    float arrived = step(1.1, t);
    float growth = mix(.10, 1., 1. - exp(-impact * 7.));
    vec2 q = (p - destination) / (area * .5);
    // Warped, rising noise provides rolling lobes and ragged flame edges.
    vec2 drift = vec2(seed, -impact * 1.5);
    float warp = fireFbm(q * 3.4 + drift);
    float noise = fireFbm(q * 6. + vec2(warp * 3., -impact * 3.));
    float edge = length(q) + (noise - .5) * .35;
    float bloom = 1. - smoothstep(growth * .6, growth * 1.18, edge);
    float square = 1. - smoothstep(.93, 1.08, max(abs(q.x), abs(q.y)));
    float hot = smoothstep(.22, .86, noise + bloom * .08);
    float billow = smoothstep(.08, .63, noise);
    float cooling = 1. - smoothstep(.85, 2.8, impact);
    float flame = bloom * square * cooling * arrived;
    light += palette(hot) * flame * (.45 + .55 * billow) * (1. + exp(-impact * 8.) * .4);
    alpha = max(alpha, flame * (.25 + .7 * billow));
    // The pressure wave is transient; it does not leave a burning terrain zone.
    float waveRadius = .18 + (1. - exp(-impact * 3.)) * 1.6;
    float wave = exp(-pow((length(q) - waveRadius) * 35., 2.))
        * exp(-impact * 2.8) * arrived * .65;
    light += vec3(1., .64, .22) * wave;
    alpha = max(alpha, wave);
    float flash = exp(-dot(q, q) * 3.) * exp(-impact * 11.) * arrived;
    light += vec3(1., .92, .69) * flash;
    alpha = max(alpha, flash * .85);
    // Cooling soot billows and individual ballistic embers remain after impact.
    float smoke = (1. - smoothstep(.5, 1.4, length(q - vec2(0., -impact * .09)) + warp * .3))
        * smoothstep(.3, 1., impact) * (1. - smoothstep(1.7, 3.3, impact)) * arrived * .20;
    light += vec3(.17, .105, .07) * smoke;
    alpha = max(alpha, smoke);
    for (int i = 0; i < 28; i++) {
        float n = float(i);
        float angle = n * 2.39996 + seed;
        float speed = .3 + fireRand(vec2(n, seed)) * .65;
        float age = max(0., impact - fireRand(vec2(seed, n)) * .16);
        vec2 spark = vec2(cos(angle), sin(angle)) * age * speed
            + vec2(0., age * age * .12 - age * .22);
        float sparkSize = .013 + .008 * fireRand(vec2(n + 1., seed));
        float ember = exp(-dot(q - spark, q - spark) / (sparkSize * sparkSize))
            * (1. - smoothstep(.6, 2.6, age)) * smoothstep(0., .12, age) * arrived;
        light += vec3(1., .47, .06) * ember;
        alpha = max(alpha, ember);
    }
    float fade = 1. - smoothstep(3.7, 4.4, t);
    // Premultiplied alpha prevents black boxes and harsh edges over the map.
    gl_FragColor = vec4(min(light, vec3(1.)) * fade, sat(alpha) * fade);
}
`;
