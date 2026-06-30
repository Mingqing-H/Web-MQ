export const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_pos;

void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform float u_rainAmount;
uniform float u_blurMix;
uniform float u_refraction;
uniform float u_rippleStrength;
uniform float u_lightning;
uniform float u_speed;
uniform float u_dropSize;
uniform float u_density;
uniform float u_spread;
uniform float u_zoom;
uniform vec4 u_ripples[8];

out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)
#define USE_POST_PROCESSING

vec3 N13(float p) {
  vec3 p3 = fract(vec3(p) * vec3(.1031, .11369, .13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

float N(float t) {
  return fract(sin(t * 12345.564) * 7658.76);
}

float Saw(float b, float t) {
  return S(0., b, t) * S(1., b, t);
}

vec2 DropLayer2(vec2 uv, float t) {
  vec2 UV = uv;
  uv.y += t * .75;
  vec2 a = vec2(6., 1.) * u_dropSize;
  vec2 grid = a * 2. * u_density;
  vec2 id = floor(uv * grid);
  float colShift = N(id.x);
  uv.y += colShift;
  id = floor(uv * grid);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid) - vec2(.5, 0.);
  float x = n.x - .5;
  float y = UV.y * 20.;
  float wiggle = sin(y + sin(y));
  x += wiggle * (.5 - abs(x)) * (n.z - .5);
  x *= .7;
  float ti = fract(t + n.z);
  y = (Saw(.85, ti) - .5) * .9 + .5;
  vec2 p = vec2(x, y);
  float d = length((st - p) * a.yx);
  float mainDrop = S(.3, .0, d);
  float r = sqrt(S(1., y, st.y));
  float cd = abs(st.x - x);
  float trail = S(.23 * r, .15 * r * r, cd);
  float trailFront = S(-.02, .02, st.y - y);
  trail *= trailFront * r * r;
  y = UV.y;
  float trail2 = S(.2 * r, .0, cd);
  float droplets = max(0., (sin(y * (1. - y) * 120.) - st.y))
    * trail2 * trailFront * n.z;
  y = fract(y * 10.) + (st.y - .5);
  float dd = length(st - vec2(x, y));
  droplets = S(.3, 0., dd);
  float m = mainDrop + droplets * r * trailFront;
  return vec2(m, trail);
}

float StaticDrops(vec2 uv, float t) {
  uv *= 40. * u_density;
  vec2 id = floor(uv);
  uv = fract(uv) - .5;
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - .5) * .7;
  float d = length(uv - p);
  float fade = Saw(.025, fract(t + n.z));
  return S(.3, 0., d) * fract(n.z * 10.) * fade;
}

vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
  float s = StaticDrops(uv, t) * l0;
  vec2 m1 = DropLayer2(uv, t) * l1;
  vec2 m2 = DropLayer2(uv * 1.85, t) * l2;
  float c = s + m1.x + m2.x;
  c = S(.3, 1., c);
  return vec2(c, max(m1.y * l0, m2.y * l1));
}

void mainImage(out vec4 fc, in vec2 fCoord) {
  vec2 uv = (fCoord.xy - .5 * iResolution.xy) / iResolution.y;
  vec2 UV = fCoord.xy / iResolution.xy;
  float T = iTime;
  float t = T * .2 * u_speed * u_dropSize;
  float rainAmount = u_rainAmount;
  float minBlur = mix(0., 4., u_blurMix);
  float maxBlur = mix(0., 6., rainAmount * u_blurMix);

  uv *= u_zoom;

  float staticDrops = S(-.5, 1., rainAmount) * 2.;
  float layer1 = S(.25, .75, rainAmount);
  float layer2 = S(.0, .5, rainAmount);
  vec2 c = Drops(uv, t, staticDrops, layer1, layer2);

  vec2 e = vec2(.001, 0.);
  float cx = Drops(uv + e, t, staticDrops, layer1, layer2).x;
  float cy = Drops(uv + e.yx, t, staticDrops, layer1, layer2).x;
  vec2 n = vec2(cx - c.x, cy - c.x) * u_refraction;

  vec2 rippleN = vec2(0.);
  float rippleGlow = 0.;
  float aspect = iResolution.x / iResolution.y;
  for (int i = 0; i < 8; i++) {
    vec4 ripple = u_ripples[i];
    float age = T - ripple.z;
    if (ripple.w > .5 && age >= 0. && age < 3.) {
      vec2 delta = UV - ripple.xy;
      delta.x *= aspect;
      float dist = length(delta);
      float radius = age * .24;
      float lag = radius - dist;
      float band = step(0., lag) * (1. - S(0., .16, lag));
      float decay = exp(-age * .72);
      float wave = sin(lag * 105.) * band * decay;
      vec2 dir = delta / max(dist, .001);
      dir.x /= aspect;
      rippleN += dir * wave * .009 * u_rippleStrength;
      rippleGlow += abs(wave) * .15 * u_rippleStrength;
    }
  }
  n += clamp(rippleN, vec2(-.025), vec2(.025));

  float focus = clamp(
    mix(maxBlur - c.y, minBlur, S(.1, .2, c.x)),
    0.,
    10.
  );
  vec2 bgUV = (UV + n - .5) * u_spread + .5;
  vec3 col = textureLod(iChannel0, bgUV, focus).rgb;
  col += min(rippleGlow, .65) * vec3(.12, .16, .20);

  #ifdef USE_POST_PROCESSING
  t = (T + 3.) * .5;
  float colFade = sin(t * .2) * .5 + .5;
  col *= mix(vec3(1.), vec3(.8, .9, 1.3), colFade);
  float lightning = sin(t * sin(t * 10.));
  lightning *= pow(max(0., sin(t + sin(t))), 10.);
  col *= 1. + lightning * u_lightning;
  col *= 1. - dot(UV -= .5, UV);
  #endif

  fc = vec4(col, 1.);
}

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}`;
