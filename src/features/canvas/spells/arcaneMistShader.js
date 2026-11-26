import { fireNoise } from '../../../vendor/tokenmagic/fireNoise';

export const arcaneMistVertexShader = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;

// Domain-warped vapor inspired by TokenMagic Fog/Fumes. The reused noise is
// attributed in vendor/tokenmagic/fireNoise.js; launch and formation are NOMA.
export const arcaneMistFragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform vec2 origin, size, source, control, destination, area;
uniform float elapsed, cell, seed, showSource;
${fireNoise}
const float PI = 3.14159265;
float sat(float n) { return clamp(n, 0., 1.); }
vec2 rotate(vec2 p, float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)) * p; }
vec2 trajectory(float t) { return mix(mix(source, control, t), mix(control, destination, t), t); }
void layer(inout vec4 ink, vec3 color, float alpha) {
    alpha = clamp(alpha, 0., .86);
    ink.rgb = color * alpha + ink.rgb * (1. - alpha);
    ink.a = alpha + ink.a * (1. - alpha);
}
float vapor(vec2 p, float time) {
    vec2 drift = vec2(time * .27 + seed, -time * .38);
    vec2 warp = vec2(fireFbm(p * 1.35 + drift), fireFbm(p * 1.35 - drift.yx + 8.7));
    return fireFbm(p * 2.8 + warp * 2.8 + drift);
}
vec3 mistColor(float n) {
    return mix(vec3(.31, .29, .40), vec3(.87, .85, .91), smoothstep(.2, .76, n));
}
void main() {
    vec2 p = origin + vec2(uv.x, 1. - uv.y) * size;
    float t = elapsed;
    vec4 ink = vec4(0.);
    // The caster gathers vapor into three broken, revolving threads.
    vec2 sq = (p - source) / cell;
    float sr = length(sq), sa = atan(sq.y, sq.x);
    float charge = smoothstep(0., .22, t) * (1. - smoothstep(.65, 1.35, t)) * showSource;
    if (sr < 1.15 && charge > .001) {
        float n = vapor(sq * 2., t * 1.2);
        float curl = .57 + .09 * sin(sa * 3. + t * 4.) + .07 * n;
        float ribbons = exp(-pow((sr - curl) * 16., 2.))
            * smoothstep(-.5, .7, sin(sa * 3. - t * 5. + n * 4.));
        layer(ink, vec3(.77, .69, .89), ribbons * charge * .8);
        layer(ink, mistColor(n), exp(-sr * sr * 5.) * n * charge * .38);
        for (int i = 0; i < 9; i++) {
            float f = float(i), a = f * 2.399 + t * 1.8;
            vec2 mote = vec2(cos(a), sin(a)) * (.38 + .25 * fract(f * .61));
            float light = exp(-dot(sq - mote, sq - mote) * 1600.);
            layer(ink, vec3(.94, .87, .73), light * charge * .72);
        }
    }
    // A soft twisting ribbon travels to the cloud, rather than a damage orb.
    float flight = sat((t - .5) / .9);
    float traveling = smoothstep(.48, .65, t) * (1. - smoothstep(1.45, 2.05, t)) * showSource;
    if (traveling > .001) {
        vec2 tangent = normalize(destination - source + vec2(.001));
        vec2 normal = vec2(-tangent.y, tangent.x);
        for (int i = 0; i < 18; i++) {
            float index = float(i), u = flight - index * .025;
            if (u < 0.) break;
            vec2 center = trajectory(sat(u)) + normal * sin(u * 13. - t * 4.) * cell * .09;
            float radius = cell * (.16 + .07 * sin(index * .8 + t));
            vec2 q = (p - center) / radius;
            // Most fragments are outside this billow; avoid sampling noise there.
            if (dot(q, q) > 2.5) continue;
            float n = fireFbm(q * 2.1 + vec2(seed + index, -t * 2.));
            float cloud = (1. - smoothstep(.1, 1.3, length(q) + (n - .5) * .55));
            float life = step(0., u) * (1. - index / 21.) * traveling;
            layer(ink, mistColor(n + .15), cloud * life * .3);
            float thread = exp(-dot(q, q) * 6.) * life * .16;
            layer(ink, vec3(.88, .81, .94), thread);
        }
    }
    // Rolling lobes push outward across the whole square. Dark folds separate
    // the volumes; their light stays pearl/lilac instead of a white explosion.
    float arrival = showSource > .5 ? 1.4 : .15;
    float age = max(0., t - arrival);
    vec2 q = (p - destination) / (area * .5);
    float square = 1. - smoothstep(.94, 1.04, max(abs(q.x), abs(q.y)));
    if (square > .001 && t > arrival) {
        vec2 flow = rotate(q, -.3 * age) + vec2(.17 * sin(q.y * 3. + age), .12 * cos(q.x * 4. - age));
        float n = vapor(flow * 2. + .6, age);
        float detail = fireFbm(flow * 10. + vec2(seed, -age * .7));
        float radius = mix(.03, 1.66, smoothstep(0., 1.65, age));
        float front = 1. - smoothstep(radius - .2, radius + .13, length(q) + (n - .5) * .32);
        float fade = 1. - smoothstep(3.25, 4.4, t);
        float veil = square * front * smoothstep(0., .28, age) * fade;
        layer(ink, mistColor(n) * (.88 + detail * .18), veil * (.22 + n * .63));
        float fold = pow(sat(1. - abs(n - .49) * 10.), 3.);
        layer(ink, vec3(.78, .74, .85), fold * veil * .19);
        // A small invocation circle is swallowed by the gathering vapor.
        float ringRadius = cell * (.42 + .18 * sat(age));
        vec2 rq = (p - destination) / ringRadius;
        float angle = atan(rq.y, rq.x);
        float ring = exp(-pow((length(rq) - 1.) * 70., 2.));
        float broken = smoothstep(-.2, .3, sin(angle * 6. + age * .9));
        float sigil = ring * broken * smoothstep(0., .12, age) * (1. - smoothstep(.45, 1.25, age));
        layer(ink, vec3(.86, .78, .93), sigil * .65);
    }
    gl_FragColor = ink;
}
`;
