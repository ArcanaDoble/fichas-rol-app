/*
 * Air Field (surface4d) and Magic Field (noisy) from TokenMagic forcefield.js.
 * Copyright (c) Feu-Secret/Tokenmagic contributors. SPDX-License-Identifier: GPL-3.0-only
 * Source revision: 0999bb9f2f4d4b5e41135913a67bc73a4fc2cc1d
 * https://github.com/Feu-Secret/Tokenmagic/blob/0999bb9f2f4d4b5e41135913a67bc73a4fc2cc1d/tokenmagic/fx/glsl/fragmentshaders/forcefield.js
 * Selected GLSL functions preserved; NOMA supplies transient timing, colors,
 * transparent composition and the portrait-aligned field in potionBuffShader.js,
 * plus the persistent shield and impact response in arcaneBarrierFieldShader.js.
 */
export const potionFieldNoise = `
#define SQRT5B20 0.30901699
#define TWOPI 6.28318531
#define MU_TWOPI 0.15915494309
#define MU_289 0.00346020761
#define MU_3 0.33333333334
#define MU_1_5 0.66666666667
vec4 mod289(vec4 x) 
{
    return x - floor(x * MU_289) * 289.0;
}

float mod289(float x) 
{
    return x - floor(x * MU_289) * 289.0;
}

vec4 permute(vec4 x) 
{
    return mod289(((x*34.0)+1.0)*x);
}

float permute(float x) 
{
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) 
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r) 
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip) 
{
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p,s;

    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

    return p;
}

float snoise(vec4 v) 
{
    const vec4  C = vec4( 0.138196601125011,
                          0.276393202250021,
                          0.414589803375032,
                         -0.447213595499958);

    vec4 i  = floor(v + dot(v, vec4(SQRT5B20)) );
    vec4 x0 = v -   i + dot(i, C.xxxx);

    vec4 i0;
    vec3 isX = step( x0.yzw, x0.xxx );
    vec3 isYZ = step( x0.zww, x0.yyz );
      
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
      
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    vec4 i3 = clamp( i0, 0.0, 1.0 );
    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
    
    i = mod289(i);
    float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute( permute( permute( permute (
                        i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
                    + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
                + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
            + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));

    vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
            + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

}

float surface( vec4 coord ) 
{
	float n = 0.0;

	n += 0.25 * abs( snoise( coord * 4.0 ) );
	n += 0.5 * abs( snoise( coord * 8.0 ) );
	n += 0.25 * abs( snoise( coord * 16.0 ) );
	n += 0.125 * abs( snoise( coord * 32.0 ) );
	
	return n;
}


float random(vec2 n) 
{ 
	return fract(cos(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}


float noise(vec2 n) 
{
	const vec2 d = vec2(0.0, 1.0);
	vec2 b = floor(n);
	vec2 f = smoothstep(vec2(0.), vec2(1.0), fract(n));
	return mix(mix(random(b), random(b + d.yx), f.x), 
	       mix(random(b + d.xy), random(b + d.yy), f.x), f.y);
}

float fbm(vec2 n) 
{
	float total = 0.0, amp = 1.;
	for (int i = 0; i < 7; i++) {
		total += noise(n) * amp;
		n += n;
		amp *= 0.5;
	}
	return total;
}


vec4 surface4d(vec2 suv)
{
    float s = suv.x + 0.61;
    float t = suv.y + 0.5;
    float nx = cos( s * TWOPI ) * MU_TWOPI;
    float ny = cos( t * TWOPI ) * MU_TWOPI;
    float nz = sin( s * TWOPI ) * MU_TWOPI;
    float nw = sin( t * TWOPI ) * MU_TWOPI;

    float surf = surface( vec4( nx, ny, nz, nw ) + time * 0.03 );
    return vec4( color * vec3( surf ), 1.0 );
}

vec4 noisy(vec2 suv)
{
    vec4 noiseColor;
    noiseColor.rgb = (color.rgb * noise(suv + fbm(suv) + time*0.5));
    noiseColor.a = 1.;
    return clamp(noiseColor,0.,1.);
}


`;
