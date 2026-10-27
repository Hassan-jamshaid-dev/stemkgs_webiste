/**
 * Computer Science flagship: binary/hex/code vortex → splash → calm binary field.
 * Palette: midnight navy, cyan, cool blue. Real HTML stays above the canvas.
 */
import { THREE, gsap, makeCharAtlas, isMobileBudget } from "./core.js";

const CHARS = "01ABCDEF<>{};/#$%&*[]=+";

export function createCsExperience(mount) {
  let points = null;
  let rings = [];
  let mode = "vortex"; // vortex | calm
  let splashEl = null;
  const state = {
    pull: 0,
    spin: 0.55,
    camZ: 16,
    opacity: 1,
  };

  return mount({
    id: "cs",
    clearColor: 0x070b14,
    fogColor: 0x070b14,
    fogNear: 8,
    fogFar: 36,
    build(ctx) {
      splashEl = ctx.splash;
      const mobile = ctx.mobile || isMobileBudget();
      const count = mobile ? 1600 : 3200;
      const atlas = makeCharAtlas(THREE, CHARS, { color: "#7dd3fc", size: 64 });
      ctx.track(atlas.texture);

      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const seeds = new Float32Array(count * 4);
      const glyphs = new Float32Array(count * 2);

      const colCyan = new THREE.Color(0x5eead4);
      const colBlue = new THREE.Color(0x4a8fd4);
      const colCool = new THREE.Color(0xa5f3fc);
      const colDeep = new THREE.Color(0x38bdf8);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.35 + Math.random() * 10.5;
        const y = (Math.random() - 0.5) * 18;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = y;
        positions[i3 + 2] = Math.sin(angle) * radius;

        const mix = Math.random();
        let c;
        if (mix < 0.35) c = colCyan.clone().lerp(colCool, Math.random());
        else if (mix < 0.7) c = colBlue.clone().lerp(colCyan, Math.random());
        else c = colDeep.clone().lerp(colCool, Math.random() * 0.5);
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;

        seeds[i * 4] = angle;
        seeds[i * 4 + 1] = radius;
        seeds[i * 4 + 2] = y;
        seeds[i * 4 + 3] = 0.35 + Math.random() * 1.8;

        const glyph = Math.floor(Math.random() * CHARS.length);
        glyphs[i * 2] = glyph % atlas.cols;
        glyphs[i * 2 + 1] = Math.floor(glyph / atlas.cols);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
      geo.setAttribute("aGlyph", new THREE.BufferAttribute(glyphs, 2));

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uMap: { value: atlas.texture },
          uCols: { value: atlas.cols },
          uRows: { value: atlas.rows },
          uSize: { value: mobile ? 26.0 : 34.0 },
          uOpacity: { value: 0.95 },
        },
        vertexShader: `
          attribute vec3 color;
          attribute vec2 aGlyph;
          uniform float uSize;
          varying vec3 vColor;
          varying vec2 vGlyph;
          void main() {
            vColor = color;
            vGlyph = aGlyph;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D uMap;
          uniform float uCols;
          uniform float uRows;
          uniform float uOpacity;
          varying vec3 vColor;
          varying vec2 vGlyph;
          void main() {
            vec2 uv = vec2(
              (vGlyph.x + gl_PointCoord.x) / uCols,
              1.0 - (vGlyph.y + gl_PointCoord.y) / uRows
            );
            vec4 texel = texture2D(uMap, uv);
            float a = texel.a * max(texel.r, max(texel.g, texel.b));
            if (a < 0.08) discard;
            gl_FragColor = vec4(vColor * texel.rgb, a * uOpacity);
          }
        `,
      });

      points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      ctx.scene.add(points);
      ctx.track(points);

      for (let r = 0; r < 6; r++) {
        const ringGeo = new THREE.TorusGeometry(1.45 + r * 1.05, 0.016, 8, 96);
        const ringMat = new THREE.MeshBasicMaterial({
          color: r % 2 ? 0x5eead4 : 0x4a8fd4,
          transparent: true,
          opacity: 0.28 - r * 0.035,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 + (r - 2.5) * 0.14;
        ring.rotation.z = r * 0.45;
        ctx.scene.add(ring);
        rings.push(ring);
        ctx.track(ring);
      }

      const amb = new THREE.AmbientLight(0x4a8fd4, 0.35);
      ctx.scene.add(amb);
      ctx.track(amb);

      ctx.camera.position.set(0, 0.15, state.camZ);
      ctx.camera.lookAt(0, 0, 0);

      ctx._cs = { positions, seeds, count, mat };
    },
    intro(ctx) {
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      // Spiral inward
      tl.to(state, { pull: 1, spin: 2.05, camZ: 6.8, duration: 2.75, ease: "power3.in" }, 0);
      tl.to(ctx.camera.position, {
        z: 6.8,
        duration: 2.75,
        ease: "power3.in",
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 0);
      // Final pull / collapse
      tl.to(state, { pull: 1.45, duration: 0.5, ease: "power4.in" }, 2.55);
      // Splash bloom
      tl.add(function () {
        if (!splashEl) return;
        gsap.fromTo(
          splashEl,
          { opacity: 0, scale: 0.35 },
          { opacity: 1, scale: 1.45, duration: 0.42, ease: "power2.out" }
        );
      }, 2.95);
      tl.to(splashEl || { opacity: 0 }, { opacity: 0, duration: 0.55, ease: "power2.in" }, 3.3);
      // Settle into calm binary rain
      tl.to(state, { spin: 0.16, pull: 0.1, duration: 0.95 }, 3.25);
      tl.to(ctx.camera.position, {
        z: 12.5,
        y: 0.4,
        duration: 1.15,
        ease: "power2.out",
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 3.25);
      tl.add(function () { mode = "calm"; }, 3.65);
      return tl;
    },
    onPersistent(ctx) {
      mode = "calm";
      state.pull = 0.06;
      state.spin = 0.1;
      if (ctx._cs && ctx._cs.mat && ctx._cs.mat.uniforms) {
        ctx._cs.mat.uniforms.uOpacity.value = 0.42;
        ctx._cs.mat.uniforms.uSize.value = ctx.mobile ? 16.0 : 20.0;
      }
      ctx.camera.position.set(0, 0.35, 13.5);
      ctx.camera.lookAt(0, 0, 0);
      rings.forEach(function (ring, i) {
        ring.material.opacity = 0.04 + (i % 2) * 0.015;
      });
    },
    update(ctx, dt, t) {
      if (!ctx._cs || !points) return;
      const { positions, seeds, count } = ctx._cs;
      const attr = points.geometry.attributes.position;
      const cols = 56;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const a0 = seeds[i * 4];
        const r0 = seeds[i * 4 + 1];
        const y0 = seeds[i * 4 + 2];
        const speed = seeds[i * 4 + 3];

        if (mode === "vortex") {
          const spiral = t * state.spin * speed + a0;
          const inward = THREE.MathUtils.lerp(r0, r0 * (1 - state.pull * 0.85) + 0.12, state.pull);
          const twistY = y0 * (1 - state.pull * 0.58) + Math.sin(spiral * 2.4) * state.pull * 0.4;
          positions[i3] = Math.cos(spiral) * inward;
          positions[i3 + 1] = twistY;
          positions[i3 + 2] = Math.sin(spiral) * inward;
        } else {
          // Calm columnar binary / hex rain behind readable HTML
          const col = (i % cols) / cols;
          const x = (col - 0.5) * 24 + Math.sin(t * 0.18 + a0) * 0.12;
          const fall = ((y0 + 9 + t * (0.28 + speed * 0.42)) % 18) - 9;
          const z = -7 + (r0 / 11) * 11 + Math.cos(t * 0.12 + a0) * 0.18;
          positions[i3] = x;
          positions[i3 + 1] = fall;
          positions[i3 + 2] = z;
        }
      }
      attr.needsUpdate = true;

      rings.forEach(function (ring, i) {
        ring.rotation.z += dt * (0.14 + i * 0.035) * (mode === "vortex" ? state.spin : 0.2);
        ring.rotation.x += dt * 0.045 * (i % 2 ? 1 : -1);
        if (mode === "vortex") {
          ring.scale.setScalar(1 + state.pull * (0.22 + i * 0.04));
        } else {
          ring.scale.setScalar(0.92);
        }
      });
    },
  });
}
