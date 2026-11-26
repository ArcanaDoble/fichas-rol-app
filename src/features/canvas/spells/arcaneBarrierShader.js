import { fireNoise } from '../../../vendor/tokenmagic/fireNoise';
import { BARRIER_ARRIVAL_MS } from '../../tactical-shared/arcaneBarrierTimeline';

export const arcaneBarrierVertexShader = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;

// Flight and sparse arrival glints. The caster and receiving token use the same
// Magic Field / Air Field surface, synchronized to this flight's arrival.
export const arcaneBarrierFragmentShader = `
precision mediump float;
varying vec2 uv;
uniform vec2 origin, size, source, control, destination, area;
uniform float cell, showSource, elapsed;
${fireNoise}
float band(float d, float width) { return exp(-abs(d) / width); }
vec2 curve(float t) { return mix(mix(source, control, t), mix(control, destination, t), t); }
float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  return length(p - a - ab * clamp(dot(p - a, ab) / max(.001, dot(ab, ab)), 0., 1.));
}
vec2 braid(float u, float strand, float t) {
  vec2 tangent = normalize(mix(control - source, destination - control, u) + vec2(.001));
  vec2 normal = vec2(-tangent.y, tangent.x);
  return curve(u) + normal * sin(u * 21. - t * 6. + strand * 2.0944) * cell * .065 * sin(u * 3.14159);
}
void main() {
  vec2 p = origin + vec2(uv.x, 1. - uv.y) * size;
  float t = elapsed;
  float arrival = ${BARRIER_ARRIVAL_MS / 1000};
  float arrive = smoothstep(arrival, arrival + .45, t);
  float fade = 1. - smoothstep(3.05, 4.4, t);
  vec2 q = (p - destination) / (area * .5);
  float r = length(q), wave = 0.;
  if (r < 1.65 && t > arrival) {
    float waveRadius = mix(.68, 1.18, smoothstep(arrival, arrival + .55, t));
    wave = band(r - waveRadius, .028) * .16 * smoothstep(arrival, arrival + .06, t)
      * (1. - smoothstep(arrival + .24, arrival + .65, t));
  }
  float tail = 0.;
  float flight = smoothstep(.5, arrival, t);
  float flying = showSource * smoothstep(.48, .62, t) * (1. - smoothstep(1.4, 1.68, t));
  if (flying > .001) {
    for (int i = 0; i < 18; i++) {
      float lag = mod(float(i), 6.) / 6.;
      float u = clamp(flight - lag * .38, 0., 1.);
      float next = clamp(flight - (lag + 1. / 6.) * .38, 0., 1.);
      float strand = floor(float(i) / 6.);
      float d = segmentDistance(p, braid(u, strand, t), braid(next, strand, t));
      tail += (band(d, cell * .009) * .7 + band(d, cell * .032) * .28) * pow(1. - lag, 1.4);
    }
    float nose = length(p - curve(flight)) / cell;
    tail += exp(-nose * 27.) * 1.3 + exp(-nose * 9.) * .25;
  }
  tail *= flying;
  float sparks = 0.;
  if (arrive * fade > .001) {
    for (int j = 0; j < 14; j++) {
      float n = float(j), angle = n * 2.39996 - t * .27;
      float rad = 1.2 + fract(n * .618) * .26 + max(0., t - 2.2) * .035;
      vec2 pos = destination + vec2(cos(angle), sin(angle)) * area * .5 * rad;
      vec2 d = abs(p - pos) / cell;
      float glint = exp(-length(d) * 85.) + exp(-d.x * 320. - d.y * 55.) * .4 + exp(-d.x * 55. - d.y * 320.) * .4;
      sparks += glint * (.35 + .65 * pow(abs(sin(t * 2.2 + n)), 6.)) * fireNoise(vec2(n, t));
    }
  }
  sparks *= arrive * fade * .4;
  float light = wave + tail + sparks;
  float alpha = clamp(light, 0., .88);
  vec3 gold = mix(vec3(.78, .48, .19), vec3(1., .95, .8), clamp(light * .9, 0., 1.));
  gl_FragColor = vec4(gold * alpha, alpha);
}
`;
