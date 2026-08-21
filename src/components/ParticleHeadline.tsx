import { useEffect, useRef } from 'react';

/**
 * Headline rendered as drifting particles on a WebGL2 point cloud.
 *
 * How it works, in three steps:
 *  1. The real text is laid out by the browser (hidden but present), so the
 *     particles inherit every responsive Tailwind size without duplicating it.
 *  2. That text is rasterised to an offscreen 2D canvas; every lit pixel
 *     becomes a candidate particle position, in CSS pixels.
 *  3. A vertex shader does the rest on the GPU — idle drift, intro reveal and
 *     the cursor sphere — so it stays one draw call at any particle count.
 *
 * Progressive enhancement: the DOM text starts visible and is only faded out
 * once WebGL is confirmed working, so no-JS / no-WebGL visitors get plain type.
 */

export type ParticlePalette = {
  base: string;
  accent: string;
  hot: string;
};

// Monochrome peach: a deep amber body, the peach itself for lift, warm white
// for the occasional spark. The base is #FED7AA walked down in lightness at
// the same 32 degree hue — additive blending sums overlapping particles, so
// the body tone has to sit well below the highlight or the stroke cores clip.
const DEFAULT_PALETTE: ParticlePalette = {
  base: '#B27734',
  accent: '#FED7AA',
  hot: '#FFF3E6'
};

type Props = {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  palette?: ParticlePalette;
};

const VERTEX_SRC = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aTarget;
layout(location = 1) in vec2 aScatter;
layout(location = 2) in vec4 aRand;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uMouseOn;
uniform float uRadius;
uniform float uReveal;
uniform float uDpr;
uniform float uDrift;

out float vSeed;
out float vGlow;

void main() {
  float s = aRand.x;

  // Intro: gather out of scattered dust, staggered per particle.
  float r = clamp(uReveal * 1.7 - s * 0.7, 0.0, 1.0);
  r = r * r * (3.0 - 2.0 * r);
  vec2 p = mix(aScatter, aTarget, r);

  // Idle float. Large seed multipliers decorrelate the axes so each particle
  // wanders on its own path rather than the whole field sloshing together.
  p.x += sin(uTime * 0.60 + s * 43.0) * uDrift;
  p.y += cos(uTime * 0.50 + s * 17.0) * uDrift;

  // Cursor sphere. An invisible ball rides with the pointer and the particles
  // RESIST it — everything caught inside is driven outward along the ball's
  // surface and off its sides, so the interior is left genuinely empty and no
  // letterform survives inside it. They fall straight back when it moves on.
  //
  // This is parley's model, ported to pixel space. Measured off their build:
  // the gaussian falloff L is 0.573x cap height, the peak push is 0.930L, the
  // resting depth spread is +/-0.170L, and their camera sits 10.84L away.
  //
  // It matters that the repulsion is solved in 3D against that depth spread:
  // in flat 2D every particle would slide radially around a disc, which is the
  // 2D-circle look. With depth they fan out around the ball instead.
  float z = 0.0;
  float F = uRadius * 0.930;          // peak push == cavity radius
  if (uMouseOn > 0.001) {
    float L  = uRadius;
    float z0 = (aRand.z - 0.5) * uRadius * 0.340;
    vec3  P  = vec3(p, z0);
    vec3  dm = P - vec3(uMouse, 0.0);
    float d2 = dot(dm, dm);
    vec3  moved = P + normalize(dm + 0.0001) * (F * exp(-d2 / (L * L)) * uMouseOn);
    p = moved.xy;
    // Depth GAINED, not absolute: at rest this is 0, so the resting depth
    // spread never softens the letterforms through the perspective divide.
    z = moved.z - z0;
  }

  // Perspective about the pointer, at parley's camera distance. The depth a
  // particle picks up riding over the ball becomes a little extra outward
  // drift, which is what makes them read as going around it rather than
  // sliding flat across it.
  float camZ  = uRadius * 10.84;
  float persp = camZ / max(1.0, camZ - z);
  p = uMouse + (p - uMouse) * persp;

  // A handful of particles sit almost exactly on the ball's axis, where dm is
  // nearly all depth and the push barely moves them sideways. They'd be left
  // stranded in the middle of an otherwise empty cavity, so fade them as they
  // go over the top — they are gone from the interior, and come straight back
  // when the pointer leaves.
  float cleared = smoothstep(F * 0.45, F * 0.85, length(p - uMouse));
  float inside  = mix(1.0, cleared, uMouseOn);

  float twinkle = 0.62 + 0.38 * sin(uTime * (0.55 + s * 1.3) + aRand.w * 6.2831);
  vGlow = twinkle * inside;
  vSeed = s;

  gl_Position = vec4(
    (p.x / uRes.x) * 2.0 - 1.0,
    1.0 - (p.y / uRes.y) * 2.0,
    0.0, 1.0);
  // Size carries the depth: particles thrown toward the eye read larger, the
  // ones driven behind the ball smaller. That split is the 3D cue — done with
  // size rather than brightness, so it adds no glow.
  float depth = z / max(1.0, uRadius * 0.930);
  gl_PointSize = (1.55 + aRand.y * 2.3) * uDpr * persp
               * max(0.35, 1.0 + 0.5 * depth) * r;
}`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;

in float vSeed;
in float vGlow;

uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec3  uHot;
uniform float uAlpha;

out vec4 outColor;

void main() {
  vec2  c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  float a = smoothstep(0.5, 0.04, d) * uAlpha * clamp(vGlow, 0.0, 2.0);
  // Three tiers, weighted so roughly a third of the field sits above the base
  // tone and a tenth burns pure white — that spread is what reads as sparkle.
  vec3  col = mix(uBase, uAccent, step(0.62, vSeed));
  col = mix(col, uHot, step(0.90, vSeed));

  // Premultiplied additive.
  outColor = vec4(col * a, a * 0.9);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  );
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }
  return program;
}

/** Greedy wrap that mirrors how the browser broke the same string. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function ParticleHeadline({
  text,
  className = '',
  showAsterisk = false,
  palette = DEFAULT_PALETTE
}: Props) {
  const hostRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const textEl = textRef.current;
    const canvas = canvasRef.current;
    if (!host || !textEl || !canvas) return;

    // Some environments throw rather than return null for an unsupported
    // context type (jsdom among them), so this has to be guarded.
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false
      });
    } catch {
      gl = null;
    }
    if (!gl) return; // Leave the plain DOM text visible.

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    type Uniforms = Record<string, WebGLUniformLocation | null>;

    let program: WebGLProgram | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let targetBuf: WebGLBuffer | null = null;
    let scatterBuf: WebGLBuffer | null = null;
    let randBuf: WebGLBuffer | null = null;
    let u: Uniforms = {};

    function createResources() {
      try {
        program = link(gl!, VERTEX_SRC, FRAGMENT_SRC);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
        program = null;
        return false;
      }
      vao = gl!.createVertexArray();
      targetBuf = gl!.createBuffer();
      scatterBuf = gl!.createBuffer();
      randBuf = gl!.createBuffer();
      u = Object.fromEntries(
        [
          'uRes',
          'uTime',
          'uMouse',
          'uMouseOn',
          'uRadius',
          'uReveal',
          'uDpr',
          'uDrift',
          'uBase',
          'uAccent',
          'uHot',
          'uAlpha'
        ].map((n) => [n, gl!.getUniformLocation(program!, n)])
      );
      gl!.disable(gl!.DEPTH_TEST);
      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.ONE, gl!.ONE); // additive, premultiplied
      return true;
    }

    if (!createResources()) return;

    let count = 0;
    let cssW = 0;
    let cssH = 0;
    let radius = 120;
    let dpr = 1;
    let driftAmp = 4;

    // Pointer state, in canvas-local CSS pixels.
    const mouse = { x: -9999, y: -9999 };
    const mouseTo = { x: -9999, y: -9999 };
    let mouseOn = 0;
    let mouseOnTo = 0;

    const raster = document.createElement('canvas');
    const rctx = raster.getContext('2d', { willReadFrequently: true })!;

    // Pointer maths needs the canvas box. Measuring it per pointermove forces a
    // layout flush up to 120x a second, so it is cached and refreshed once per
    // frame instead — bounded, and it can never fall out of step with a canvas
    // that moves (this one is sized in vw, so it moves on any viewport change).
    let rect = { left: 0, top: 0, width: 0, height: 0 };
    function refreshRect() {
      const r = canvas!.getBoundingClientRect();
      rect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    // The canvas only ever lives in the hero, so stop drawing once it scrolls
    // away rather than burning a 20k-point draw call per frame all the way down.
    let onScreen = true;

    function build() {
      const hostBox = host!.getBoundingClientRect();
      const textBox = textEl!.getBoundingClientRect();
      if (textBox.width < 4 || textBox.height < 4) return false;

      const cs = getComputedStyle(textEl!);
      const fontSize = parseFloat(cs.fontSize) || 64;
      const lineHeightRaw = parseFloat(cs.lineHeight);
      const lineHeight = Number.isFinite(lineHeightRaw)
        ? lineHeightRaw
        : fontSize * 1.2;

      // Room for ascenders/descenders that overflow a tight line-height, plus
      // headroom for the sphere to push particles outward without clipping.
      const pad = Math.round(fontSize * 0.55);

      cssW = Math.ceil(textBox.width + pad * 2);
      cssH = Math.ceil(textBox.height + pad * 2);
      // Gaussian falloff length. Parley's is 0.573x cap height; the push,
      // camera distance and depth spread are all derived from it inside the
      // shader, so scaling this one number scales the whole sphere. Held 7%
      // under parley's figure by request: 0.573 * 0.93.
      radius = Math.max(42, Math.min(130, fontSize * 0.533));
      // ~2.8% of cap height. Parley drifts 0.028 world units against a ~168px
      // headline, i.e. ~2.5%; anything near 1% is invisible at a glance.
      driftAmp = fontSize * 0.028;

      // Position the canvas over the text without disturbing layout.
      canvas!.style.left = `${textBox.left - hostBox.left - pad}px`;
      canvas!.style.top = `${textBox.top - hostBox.top - pad}px`;
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.ceil(cssW * dpr);
      canvas!.height = Math.ceil(cssH * dpr);

      // --- rasterise the headline -------------------------------------
      raster.width = cssW;
      raster.height = cssH;
      const font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
      rctx.clearRect(0, 0, cssW, cssH);
      rctx.font = font;
      if (cs.letterSpacing && cs.letterSpacing !== 'normal') {
        try {
          (rctx as unknown as { letterSpacing: string }).letterSpacing =
            cs.letterSpacing;
        } catch {
          /* Safari — ignore */
        }
      }
      // With `white-space: nowrap` the browser lays the headline out on one
      // line, so the raster must not re-wrap it behind the browser's back.
      const noWrap = cs.whiteSpace === 'nowrap' || cs.whiteSpace.startsWith('pre');
      const lines = noWrap ? [text] : wrapLines(rctx, text, textBox.width + 1);
      rctx.fillStyle = '#fff';
      rctx.textBaseline = 'middle';
      rctx.textAlign = 'left';

      let lastLineEnd = pad;
      let lastLineMid = pad;
      lines.forEach((line, i) => {
        const y = pad + lineHeight * (i + 0.5);
        rctx.fillText(line, pad, y);
        if (i === lines.length - 1) {
          lastLineEnd = pad + rctx.measureText(line).width;
          lastLineMid = y - fontSize * 0.3;
        }
      });

      // Park the asterisk against the end of the final line.
      if (starRef.current) {
        starRef.current.style.left = `${
          textBox.left - hostBox.left - pad + lastLineEnd
        }px`;
        starRef.current.style.top = `${
          textBox.top - hostBox.top - pad + lastLineMid
        }px`;
      }

      // --- lift lit pixels into particle positions ---------------------
      const px = rctx.getImageData(0, 0, cssW, cssH).data;
      const pool: number[] = [];
      for (let y = 0; y < cssH; y += 2) {
        for (let x = 0; x < cssW; x += 2) {
          if (px[(y * cssW + x) * 4 + 3] > 130) pool.push(x, y);
        }
      }
      const poolSize = pool.length / 2;
      if (poolSize === 0) return false;

      const cap = window.innerWidth < 720 ? 11000 : 26000;
      count = Math.max(3000, Math.min(cap, Math.round(poolSize * 1.4)));

      const targets = new Float32Array(count * 2);
      const scatter = new Float32Array(count * 2);
      const rand = new Float32Array(count * 4);

      for (let i = 0; i < count; i++) {
        const j = (Math.random() * poolSize) | 0;
        const tx = pool[j * 2] + (Math.random() - 0.5) * 1.6;
        const ty = pool[j * 2 + 1] + (Math.random() - 0.5) * 1.6;
        targets[i * 2] = tx;
        targets[i * 2 + 1] = ty;

        // Drift in from below and outward, echoing the old pull-up intro.
        const ang = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 320;
        scatter[i * 2] = tx + Math.cos(ang) * dist;
        scatter[i * 2 + 1] = ty + Math.sin(ang) * dist * 0.6 + 90 + Math.random() * 120;

        rand[i * 4] = Math.random();
        rand[i * 4 + 1] = Math.random();
        rand[i * 4 + 2] = Math.random();
        rand[i * 4 + 3] = Math.random();
      }

      gl!.bindVertexArray(vao);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, targetBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, targets, gl!.STATIC_DRAW);
      gl!.enableVertexAttribArray(0);
      gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);

      gl!.bindBuffer(gl!.ARRAY_BUFFER, scatterBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, scatter, gl!.STATIC_DRAW);
      gl!.enableVertexAttribArray(1);
      gl!.vertexAttribPointer(1, 2, gl!.FLOAT, false, 0, 0);

      gl!.bindBuffer(gl!.ARRAY_BUFFER, randBuf);
      gl!.bufferData(gl!.ARRAY_BUFFER, rand, gl!.STATIC_DRAW);
      gl!.enableVertexAttribArray(2);
      gl!.vertexAttribPointer(2, 4, gl!.FLOAT, false, 0, 0);
      gl!.bindVertexArray(null);

      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      refreshRect();
      return true;
    }

    function onPointerMove(e: PointerEvent) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const slack = radius * 3;
      const inside =
        x > -slack && y > -slack && x < rect.width + slack && y < rect.height + slack;
      mouseTo.x = x;
      mouseTo.y = y;
      mouseOnTo = inside ? 1 : 0;
      if (mouseOn < 0.01 && inside) {
        // Snap rather than sweep whenever the sphere is effectively gone, so
        // re-entering the hero doesn't drag it across the whole headline.
        // (mouseOn decays exponentially and never reaches exactly zero.)
        mouse.x = x;
        mouse.y = y;
      }
    }

    function onPointerLeave() {
      mouseOnTo = 0;
    }

    const [br, bg_, bb] = hexToRgb(palette.base);
    const [ar, ag, ab] = hexToRgb(palette.accent);
    const [hr, hg, hb] = hexToRgb(palette.hot);

    let raf = 0;
    let start = 0;
    let lastFrame = performance.now();
    let ready = false;
    let disposed = false;
    let listening = false;
    let handedOff = false;

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!ready || !onScreen) return;

      refreshRect();

      const now = performance.now();
      const elapsed = (now - start) / 1000;
      const reveal = reduceMotion ? 1 : Math.min(1, elapsed / 1.45);

      // Frame-rate independent smoothing. A flat per-frame lerp would settle
      // twice as fast on a 120Hz display as on 60Hz; the clamp stops a long
      // frame (tab switch, GC pause) from snapping the sphere across the text.
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const ease = (rate: number) => 1 - Math.pow(1 - rate, dt * 60);

      // Weighted enough to feel physical, not laggy.
      const kMouse = ease(0.16);
      const kOn = ease(0.09);
      mouse.x += (mouseTo.x - mouse.x) * kMouse;
      mouse.y += (mouseTo.y - mouse.y) * kMouse;
      mouseOn += (mouseOnTo - mouseOn) * kOn;

      gl!.useProgram(program);
      gl!.bindVertexArray(vao);

      gl!.uniform2f(u.uRes, cssW, cssH);
      gl!.uniform1f(u.uTime, reduceMotion ? 0 : elapsed);
      gl!.uniform2f(u.uMouse, mouse.x, mouse.y);
      gl!.uniform1f(u.uMouseOn, reduceMotion ? 0 : mouseOn);
      gl!.uniform1f(u.uRadius, radius);
      gl!.uniform1f(u.uReveal, reveal);
      gl!.uniform1f(u.uDpr, dpr);
      gl!.uniform1f(u.uDrift, reduceMotion ? 0 : driftAmp);
      gl!.uniform3f(u.uBase, br, bg_, bb);
      gl!.uniform3f(u.uAccent, ar, ag, ab);
      gl!.uniform3f(u.uHot, hr, hg, hb);
      gl!.uniform1f(u.uAlpha, 0.88);

      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.POINTS, 0, count);
      gl!.bindVertexArray(null);

      // Only now are there particles on screen to replace the DOM text. Doing
      // this any earlier leaves the headline blank whenever rAF is paused —
      // opening the site in a background tab, for instance.
      if (!handedOff) {
        handedOff = true;
        textEl!.style.opacity = '0';
        if (starRef.current) starRef.current.style.opacity = '1';
      }
    }

    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;

    // A lost context blanks the canvas. Because the DOM text is hidden once the
    // particles take over, that would leave the headline invisible — so put the
    // real text back, and pick the particles up again if the context returns.
    function onContextLost(e: Event) {
      e.preventDefault();
      ready = false;
      handedOff = false;
      textEl!.style.opacity = '';
      if (starRef.current) starRef.current.style.opacity = '0';
    }

    function onContextRestored() {
      if (disposed) return;
      if (!createResources()) return;
      activate();
    }

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    function activate() {
      if (disposed) return;
      if (!build()) return;
      start = performance.now();
      lastFrame = start;
      ready = true;

      refreshRect();
      if (listening) return;
      listening = true;

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave, { passive: true });
      io = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
        },
        { rootMargin: '120px' }
      );
      io.observe(canvas!);

      let resizeTimer = 0;
      ro = new ResizeObserver(() => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (!disposed) build();
        }, 140);
      });
      ro.observe(host!);
    }

    raf = requestAnimationFrame(frame);

    // Sample only once the display font is in, or the particles trace a
    // fallback face and reflow the moment the real one lands.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(activate).catch(activate);
    } else {
      activate();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      gl.deleteBuffer(targetBuf);
      gl.deleteBuffer(scatterBuf);
      gl.deleteBuffer(randBuf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      textEl.style.opacity = '';
    };
  }, [text, palette]);

  return (
    <h1 ref={hostRef} className={`relative ${className}`}>
      <span
        ref={textRef}
        className="inline-block select-none transition-opacity duration-500"
      >
        {text}
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0"
      />
      {showAsterisk ? (
        <span
          ref={starRef}
          aria-hidden="true"
          className="pointer-events-none absolute text-[0.31em] leading-none opacity-0 transition-opacity duration-500"
        >
          *
        </span>
      ) : null}
    </h1>
  );
}
