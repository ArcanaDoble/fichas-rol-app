import { fireNoise } from '../../../vendor/tokenmagic/fireNoise';

export const arcaneProjectileVertexShader = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;

// TokenMagic's noise drives a transient magic field. The sigils, braided route,
// ivory core, fracture and event choreography are specific to NOMA's projectile.
export const arcaneProjectileFragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform vec2 origin, size, source, destination, head;
uniform vec4 trail[20];
uniform float radius, elapsed, heading;
const float PI = 3.14159265;
const float TAU = 6.28318531;
const vec3 VIOLET = vec3(.52, .26, .83);
const vec3 LILAC = vec3(.78, .57, .95);
const vec3 IVORY = vec3(1., .94, .85);
${fireNoise}

mat2 rotate(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
float line(float distance, float width) { return 1. - smoothstep(width, width + .025, abs(distance)); }
float segment(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / max(dot(ab, ab), .0001), 0., 1.));
}
float seal(vec2 p, float rotation) {
    p = rotate(rotation) * p;
    float r = length(p), a = atan(p.y, p.x);
    float sector = mod(a + PI / 8., PI / 4.) - PI / 8.;
    vec2 q = vec2(cos(sector), sin(sector)) * r;
    float outer = line(r - .96, .007) * smoothstep(.06, .1, abs(sin(a * 8.)));
    float inner = line(r - .77, .006);
    float chevron = min(segment(q, vec2(.82, -.06), vec2(.9, 0.)), segment(q, vec2(.9, 0.), vec2(.82, .06)));
    float rune = line(chevron, .007);
    float diamond = line(abs(q.x - .6) + abs(q.y) - .095, .006);
    float spoke = line(segment(q, vec2(.32, 0.), vec2(.5, 0.)), .004);
    return max(max(outer, inner * .65), max(rune, max(diamond, spoke * .45)));
}
vec3 core(vec2 p, float clock) {
    float r = length(p);
    float noise = fireFbm(p * 4. + vec2(clock * -.9, clock * .6));
    float cloud = exp(-r * r * 3.8) * (.25 + noise * .7);
    float skin = line(r - .48 - (noise - .5) * .14, .025);
    float a = atan(p.y, p.x);
    float curl = line(r - .31 - sin(a * 3. + clock * 5. + noise) * .08, .018);
    float heart = exp(-r * r * 36.);
    return VIOLET * cloud * .8 + LILAC * skin * .7 + IVORY * (heart * 1.9 + curl * .6);
}
void main() {
    vec2 world = origin + vec2(uv.x, 1. - uv.y) * size;
    vec3 light = vec3(0.);
    float t = max(0., elapsed);

    if (t < .72) {
        float charge = smoothstep(0., .32, t) * (1. - smoothstep(.42, .72, t));
        vec2 p = (world - source) / radius;
        float contraction = 1.15 - smoothstep(0., .42, t) * .32;
        light += LILAC * seal(p / contraction, t * .7) * charge * .65;
        light += core(p / (.3 + t * .35), t) * charge;
        for (int i = 0; i < 6; i++) {
            float a = float(i) * TAU / 6. + t * 1.8;
            vec2 mote = vec2(cos(a), sin(a)) * (1. - clamp(t / .42, 0., 1.)) * .8;
            light += IVORY * exp(-dot(p - mote, p - mote) * 1800.) * charge;
        }
    }

    if (t >= .42 && t < 1.92) {
        float flight = smoothstep(.42, .5, t) * (1. - smoothstep(1.42, 1.92, t));
        vec2 p = (world - head) / radius;
        vec2 facing = rotate(heading) * p;
        float near = 100., along = 0., strength = 0., side = 0.;
        for (int i = 0; i < 19; i++) {
            vec2 ab = trail[i + 1].xy - trail[i].xy;
            float projection = clamp(dot(world - trail[i].xy, ab) / max(dot(ab, ab), .0001), 0., 1.);
            vec2 d = world - mix(trail[i].xy, trail[i + 1].xy, projection);
            float distance = length(d) / radius;
            if (distance < near) {
                near = distance;
                along = mix(trail[i].z, trail[i + 1].z, projection);
                strength = mix(trail[i].w, trail[i + 1].w, projection);
                side = (ab.x * d.y - ab.y * d.x) / max(length(ab) * radius, .001);
            }
        }
        if (near < .55) {
            float n = fireNoise(vec2(along * 5. - t * 2., side * 9.));
            float weave = sin(along * 7. - t * 9. + n * 2.) * .075 + (n - .5) * .06;
            float endcap = 1. - smoothstep(.08, .45, sqrt(max(0., near * near - side * side)));
            float filament = (line(side - weave, .006) + line(side + weave * .6 + .025, .004) * .5) * endcap;
            float mist = exp(-near * near * 24.) * (.15 + n * .25);
            float taper = strength * strength;
            light += (LILAC * mist + IVORY * filament * .62) * taper * flight;
            float dust = pow(fireNoise(vec2(along * 23., side * 34. - t)), 18.);
            light += IVORY * dust * exp(-near * near * 12.) * taper * flight * 1.8;
        }
        if (length(p) < 1.1) {
            light += core(vec2(facing.x * 1.1, facing.y * 1.6), t) * flight;
            float flank = line(abs(facing.y) - (.15 + .1 * sin(facing.x * 5. + t * 6.)), .007);
            flank *= smoothstep(-.6, -.15, facing.x) * (1. - smoothstep(.05, .45, facing.x));
            light += LILAC * flank * flight * .5;
            float star = exp(-abs(facing.x) * 8. - abs(facing.y) * 65.);
            light += IVORY * star * flight * .8;
        }
    }

    if (t >= 1.42) {
        float age = t - 1.42;
        vec2 p = (world - destination) / radius;
        float r = length(p), a = atan(p.y, p.x);
        float fade = 1. - smoothstep(1.4, 2.98, age);
        float flash = (1. - smoothstep(0., .38, age)) * smoothstep(0., .06, age);
        light += IVORY * exp(-r * r * 6.) * flash * 2.;
        light += IVORY * pow(abs(cos(a * 3. - heading)), 18.) * exp(-r * 2.8) * flash * 1.4;
        float wave = .25 + sqrt(age) * 1.35;
        light += LILAC * line(r - wave, .012) * exp(-age * 2.3) * .65;
        if (r < 1.8) {
            float n = fireFbm(p * 3. + vec2(age * .35, -age * .6));
            float vortex = line(r - (.42 + .18 * sin(a * 3. - age * 2. + n * 3.)), .035);
            float field = exp(-r * r * 2.8) * (.12 + n * .32);
            float open = smoothstep(0., .24, age);
            light += (VIOLET * field + LILAC * vortex * .34) * fade * open;
            float expansion = .64 + .4 * smoothstep(0., .5, age);
            float wedge = floor((a + PI / 8.) / (PI / 4.)) * PI / 4.;
            vec2 separation = vec2(cos(wedge), sin(wedge)) * smoothstep(.35, 1.5, age) * .16;
            light += mix(LILAC, IVORY, .45) * seal((p - separation) / expansion, 0.) * fade * open * .72;
        }
        if (r < 2.3) for (int i = 0; i < 32; i++) {
            float fi = float(i), seed = fireRand(vec2(fi, 9.));
            float angle = fi * 2.39996;
            float spread = (.3 + sqrt(age) * (.45 + seed * .6));
            vec2 shard = vec2(cos(angle), sin(angle)) * spread;
            vec2 q = rotate(angle + age * .4) * (p - shard);
            float shape = abs(q.x) + abs(q.y * 2.4);
            float sparkle = line(shape - .022, .004) + exp(-dot(q, q) * 5000.) * .5;
            float life = (1. - smoothstep(.45 + seed, 1.5 + seed, age)) * smoothstep(0., .12, age);
            light += mix(LILAC, IVORY, seed) * sparkle * life * .8;
        }
    }
    // Premultiplied transparent light leaves the target and map legible.
    float peak = max(light.r, max(light.g, light.b));
    float alpha = 1. - exp(-peak * 1.5);
    vec3 color = light / max(peak, .001);
    gl_FragColor = vec4(color * alpha, alpha);
}
`;
