import { potionFieldNoise } from '../../../vendor/tokenmagic/potionFields';

export const barrierFieldVertex = `attribute vec2 position; varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }`;

// Uses the same TokenMagic Magic Field and Air Field functions as the potions.
// NOMA supplies a permanent shield skin, transparent composition and hit waves.
export const barrierFieldFragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float time, silhouette, impactAge;
uniform vec3 color;
varying vec2 uv;
${potionFieldNoise}
void main() {
  vec2 p = (uv - .5) * 2.;
  float r = length(p);
  float hit = impactAge < 0. ? 0. : exp(-impactAge * 6.);
  float waveRadius = .12 + max(0., impactAge) * 1.45;
  float wave = exp(-pow((r - waveRadius) * 19., 2.)) * hit;
  float bend = sqrt(max(.02, 1. - min(dot(p, p), .98)));
  vec2 sphere = p / (1. + bend);
  sphere += normalize(p + .001) * sin(r * 24. - max(0., impactAge) * 17.) * hit * .02;
  float a = time * .055;
  mat2 rotation = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 flow = rotation * sphere;
  float air = surface4d(flow * 1.1 + vec2(time * .018, -time * .009)).r / color.r;
  float magic = noisy(flow * 12. + vec2(air * 1.8, -air)).r / color.r;
  float veins = exp(-abs(air - .32) * 39.);
  float eddies = pow(magic, 3.) * (.35 + air);
  float mantle = smoothstep(.22, .67, r) * (1. - smoothstep(.78, .98, r));
  float body = mix(mantle, .6, silhouette);
  float breathing = .85 + .15 * sin(time * .45);
  float luminosity = (veins * .78 + eddies * 1.65 + air * .16) * body * breathing;
  // A soft, irregular boundary follows the shield rather than a drawn ring.
  float crest = .8 + (air - .35) * .045;
  float rim = exp(-pow((r - crest) * 55., 2.)) * (.35 + magic * .65) * (1. - silhouette);
  float halo = exp(-pow((r - .82) * 18., 2.)) * air * .27 * (1. - silhouette);
  luminosity += rim * .65 + halo + wave * .32;
  float edge = mix(1. - smoothstep(.94, 1., r), 1., silhouette);
  float alpha = clamp(luminosity * (1. + hit * .22), 0., .82) * edge;
  vec3 gold = mix(color, vec3(1., .95, .78), clamp(veins * .65 + rim * .25 + wave * .3, 0., .85));
  gl_FragColor = vec4(gold * alpha, alpha);
}`;
