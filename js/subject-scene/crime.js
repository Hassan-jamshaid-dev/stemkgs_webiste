/**
 * Crime: realistic magnifying glass expands into the viewport, then settles
 * into a cheap evidence-dust field behind page content.
 * Palette: purple-black #0c0814, cool glass, brushed metal, amber dust.
 */
import { THREE, gsap, budgetCount } from "./core.js";

const CLEAR = 0x0c0814;

function makeLensMap(THREERef, size) {
  const s = size || 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const g = canvas.getContext("2d");
  const cx = s * 0.5;
  const cy = s * 0.5;
  const r = s * 0.49;

  g.clearRect(0, 0, s, s);

  // Convex glass body — cool refraction tint, denser at the rim
  const body = g.createRadialGradient(cx - r * 0.14, cy - r * 0.2, r * 0.02, cx, cy, r);
  body.addColorStop(0, "rgba(248, 252, 255, 0.78)");
  body.addColorStop(0.22, "rgba(198, 228, 248, 0.38)");
  body.addColorStop(0.5, "rgba(150, 196, 228, 0.16)");
  body.addColorStop(0.78, "rgba(100, 158, 205, 0.32)");
  body.addColorStop(0.92, "rgba(55, 110, 170, 0.58)");
  body.addColorStop(1, "rgba(28, 60, 105, 0.7)");
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = body;
  g.fill();

  g.save();
  g.beginPath();
  g.arc(cx, cy, r * 0.985, 0, Math.PI * 2);
  g.clip();

  // Primary specular crescent — upper-left glass catch light
  const spec = g.createRadialGradient(
    cx - r * 0.4,
    cy - r * 0.45,
    0,
    cx - r * 0.22,
    cy - r * 0.28,
    r * 0.7
  );
  spec.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  spec.addColorStop(0.12, "rgba(255, 255, 255, 0.7)");
  spec.addColorStop(0.32, "rgba(220, 240, 255, 0.22)");
  spec.addColorStop(0.55, "rgba(210, 235, 255, 0)");
  spec.addColorStop(1, "rgba(210, 235, 255, 0)");
  g.fillStyle = spec;
  g.fillRect(0, 0, s, s);

  // Arc highlight (classic lens shine stroke)
  g.strokeStyle = "rgba(255, 255, 255, 0.55)";
  g.lineWidth = s * 0.028;
  g.lineCap = "round";
  g.beginPath();
  g.arc(cx - r * 0.08, cy - r * 0.1, r * 0.72, -2.45, -0.85);
  g.stroke();
  g.strokeStyle = "rgba(255, 255, 255, 0.22)";
  g.lineWidth = s * 0.05;
  g.beginPath();
  g.arc(cx - r * 0.08, cy - r * 0.1, r * 0.72, -2.45, -0.85);
  g.stroke();

  // Soft secondary caustic opposite the highlight
  const caustic = g.createRadialGradient(
    cx + r * 0.3,
    cy + r * 0.36,
    0,
    cx + r * 0.26,
    cy + r * 0.32,
    r * 0.5
  );
  caustic.addColorStop(0, "rgba(100, 190, 255, 0.3)");
  caustic.addColorStop(0.5, "rgba(80, 150, 220, 0.08)");
  caustic.addColorStop(1, "rgba(80, 150, 220, 0)");
  g.fillStyle = caustic;
  g.fillRect(0, 0, s, s);

  // Thin chromatic fringe near the rim
  g.globalCompositeOperation = "screen";
  g.strokeStyle = "rgba(255, 130, 170, 0.28)";
  g.lineWidth = s * 0.014;
  g.beginPath();
  g.arc(cx, cy, r * 0.94, -1.0, 0.6);
  g.stroke();
  g.strokeStyle = "rgba(70, 210, 255, 0.28)";
  g.beginPath();
  g.arc(cx, cy, r * 0.915, 1.15, 2.7);
  g.stroke();
  g.globalCompositeOperation = "source-over";

  // Inner refraction ring (convex lens cue)
  g.strokeStyle = "rgba(255, 255, 255, 0.2)";
  g.lineWidth = s * 0.01;
  g.beginPath();
  g.arc(cx - r * 0.05, cy - r * 0.07, r * 0.58, 0, Math.PI * 2);
  g.stroke();

  g.restore();

  const tex = new THREERef.CanvasTexture(canvas);
  tex.colorSpace = THREERef.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeChromeMap(THREERef) {
  // Tube-cross-section gradient: dark → bright specular → mid → dark
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, "#3e3b36");
  grd.addColorStop(0.18, "#a8a298");
  grd.addColorStop(0.32, "#f7f2e8");
  grd.addColorStop(0.42, "#d8d2c6");
  grd.addColorStop(0.62, "#8e8980");
  grd.addColorStop(0.82, "#5a564f");
  grd.addColorStop(1, "#2a2824");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 64);
  // Lengthwise polish streak
  g.globalAlpha = 0.35;
  const streak = g.createLinearGradient(0, 0, 128, 0);
  streak.addColorStop(0, "rgba(255,255,255,0)");
  streak.addColorStop(0.45, "rgba(255,255,255,0.55)");
  streak.addColorStop(0.55, "rgba(255,255,255,0.55)");
  streak.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = streak;
  g.fillRect(0, 14, 128, 10);
  g.globalAlpha = 1;
  const tex = new THREERef.CanvasTexture(c);
  tex.colorSpace = THREERef.SRGBColorSpace;
  tex.wrapS = THREERef.RepeatWrapping;
  tex.wrapT = THREERef.ClampToEdgeWrapping;
  return tex;
}

function chromeMat(THREERef, color, map) {
  // Basic — guaranteed chrome read under sparse lights (no env map needed)
  return new THREERef.MeshBasicMaterial({
    color: color != null ? color : 0xffffff,
    map: map || null,
    toneMapped: false,
  });
}

function makeMagnifier(THREERef, mobile) {
  const root = new THREERef.Group();
  const segs = mobile ? 28 : 48;
  const rimR = 1.08;
  const tube = 0.12;
  const attachA = -Math.PI / 3.55;
  const ax = Math.cos(attachA) * (rimR + tube * 0.25);
  const ay = Math.sin(attachA) * (rimR + tube * 0.25);

  const chromeMap = makeChromeMap(THREERef);

  // Outer chrome rim
  const rim = new THREERef.Mesh(
    new THREERef.TorusGeometry(rimR, tube, mobile ? 10 : 16, segs),
    chromeMat(THREERef, 0xffffff, chromeMap)
  );
  root.add(rim);

  // Mid-tone bevel
  const rimMid = new THREERef.Mesh(
    new THREERef.TorusGeometry(rimR, tube * 0.62, 8, segs),
    chromeMat(THREERef, 0xb0aaa0)
  );
  rimMid.position.z = 0.02;
  root.add(rimMid);

  // Inner lip — darker bezel depth
  const rimInner = new THREERef.Mesh(
    new THREERef.TorusGeometry(rimR - tube * 0.95, tube * 0.4, 8, segs),
    chromeMat(THREERef, 0x4a4640)
  );
  rimInner.position.z = 0.03;
  root.add(rimInner);

  // Bright rim highlight strip (metal specular catch)
  const rimShine = new THREERef.Mesh(
    new THREERef.TorusGeometry(rimR + tube * 0.22, tube * 0.24, 6, segs),
    new THREERef.MeshBasicMaterial({
      color: 0xfffaf0,
      transparent: true,
      opacity: 0.55,
      blending: THREERef.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  rimShine.position.z = 0.05;
  root.add(rimShine);

  // Lens disc with refraction / highlight map
  const lensMap = makeLensMap(THREERef, mobile ? 192 : 256);
  const glass = new THREERef.Mesh(
    new THREERef.CircleGeometry(rimR - tube * 0.55, segs),
    new THREERef.MeshBasicMaterial({
      map: lensMap,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
      side: THREERef.DoubleSide,
    })
  );
  glass.position.z = 0.025;
  root.add(glass);

  // Soft additive bloom behind the lens
  const glassGlow = new THREERef.Mesh(
    new THREERef.CircleGeometry(rimR - tube * 0.15, mobile ? 20 : 32),
    new THREERef.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.12,
      blending: THREERef.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREERef.DoubleSide,
    })
  );
  glassGlow.position.z = -0.025;
  root.add(glassGlow);

  // Soft specular glint (ellipse, not a hard white disc)
  const focus = new THREERef.Mesh(
    new THREERef.SphereGeometry(0.11, 12, 10),
    new THREERef.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.42,
      blending: THREERef.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  focus.scale.set(1.6, 0.85, 0.4);
  focus.position.set(-0.36, 0.4, 0.07);
  root.add(focus);

  // Ferrule — short metal collar where handle meets rim
  const ferrule = new THREERef.Mesh(
    new THREERef.CylinderGeometry(0.18, 0.21, 0.38, mobile ? 10 : 14),
    chromeMat(THREERef, 0xffffff, chromeMap)
  );
  ferrule.position.set(ax, ay, 0);
  ferrule.rotation.z = attachA + Math.PI / 2;
  root.add(ferrule);

  // Handle shaft — dark ebonite with slight taper
  const handleLen = 2.45;
  const handle = new THREERef.Mesh(
    new THREERef.CylinderGeometry(0.115, 0.145, handleLen, mobile ? 10 : 14),
    chromeMat(THREERef, 0x4a4038)
  );
  const hx = ax + Math.cos(attachA) * (handleLen * 0.5 + 0.14);
  const hy = ay + Math.sin(attachA) * (handleLen * 0.5 + 0.14);
  handle.position.set(hx, hy, 0);
  handle.rotation.z = attachA + Math.PI / 2;
  root.add(handle);

  // End cap on the handle
  const cap = new THREERef.Mesh(
    new THREERef.SphereGeometry(0.14, mobile ? 8 : 12, mobile ? 6 : 8),
    chromeMat(THREERef, 0xffffff, chromeMap)
  );
  cap.position.set(
    ax + Math.cos(attachA) * (handleLen + 0.2),
    ay + Math.sin(attachA) * (handleLen + 0.2),
    0
  );
  root.add(cap);

  // Mid-handle band
  const band = new THREERef.Mesh(
    new THREERef.TorusGeometry(0.13, 0.032, 6, mobile ? 12 : 18),
    chromeMat(THREERef, 0xffffff, chromeMap)
  );
  band.position.set(
    ax + Math.cos(attachA) * (handleLen * 0.55),
    ay + Math.sin(attachA) * (handleLen * 0.55),
    0
  );
  band.rotation.x = Math.PI / 2;
  band.rotation.z = attachA + Math.PI / 2;
  root.add(band);

  return { root, glass, glassGlow, focus, rim, handle, rimShine };
}

function applyPersistentPose(mag, markers, dust, ctx, state) {
  state.expand = 0.15;
  state.dim = 1;
  state.spin = 0.08;
  if (mag) {
    mag.root.scale.setScalar(1.05);
    mag.root.position.set(2.75, -1.5, -1.35);
    mag.root.rotation.set(0.28, -0.2, -0.55);
    mag.glass.material.opacity = 0.72;
    mag.glassGlow.material.opacity = 0.05;
    mag.focus.material.opacity = 0.18;
    if (mag.rimShine) mag.rimShine.material.opacity = 0.1;
  }
  markers.forEach(function (m) {
    m.material.opacity = 0.08;
  });
  if (dust) dust.material.opacity = 0.1;
  ctx.camera.position.set(0, 0.25, 11.8);
  ctx.camera.lookAt(0, 0, 0);
  if (ctx.scene.fog) {
    ctx.scene.fog.near = 12;
    ctx.scene.fog.far = 42;
  }
}

export function createCrimeExperience(mount) {
  let mag = null;
  let dust = null;
  let markers = [];
  const state = { expand: 0, dim: 0, spin: 0.35 };

  return mount({
    id: "crime",
    clearColor: CLEAR,
    fogColor: CLEAR,
    fogNear: 7,
    fogFar: 32,
    build(ctx) {
      mag = makeMagnifier(THREE, ctx.mobile);
      mag.root.scale.setScalar(0.62);
      mag.root.position.set(0.15, 0.22, 0);
      // Tip the glass so the torus rim reads as a round metal bezel, not a flat ring
      mag.root.rotation.set(0.42, -0.38, -0.28);
      ctx.scene.add(mag.root);
      ctx.track(mag.root);

      const markN = ctx.mobile ? 5 : 8;
      for (let i = 0; i < markN; i++) {
        const a = (i / markN) * Math.PI * 2;
        const r = 2.4 + (i % 3) * 0.55;
        const tick = new THREE.Mesh(
          new THREE.CircleGeometry(0.06 + (i % 2) * 0.03, 10),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? 0xf87171 : 0x67e8f9,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        );
        tick.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.72, -0.8 - (i % 4) * 0.35);
        ctx.scene.add(tick);
        markers.push(tick);
        ctx.track(tick);
      }

      const n = budgetCount(140, 80, 48);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      }
      dust = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          color: 0xfcd34d,
          size: ctx.mobile ? 0.045 : 0.055,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      ctx.scene.add(dust);
      ctx.track(dust);

      const key = new THREE.PointLight(0xfff5e8, 2.1, 32);
      key.position.set(2.2, 3.0, 5.0);
      ctx.scene.add(key);
      ctx.track(key);
      const fill = new THREE.PointLight(0xa5d8ff, 0.55, 30);
      fill.position.set(-3.4, -0.6, 3.0);
      ctx.scene.add(fill);
      ctx.track(fill);
      const rimLight = new THREE.PointLight(0xfbbf24, 0.7, 24);
      rimLight.position.set(-1.8, 2.4, -1.2);
      ctx.scene.add(rimLight);
      ctx.track(rimLight);
      const amb = new THREE.AmbientLight(0x2a2040, 0.75);
      ctx.scene.add(amb);
      ctx.track(amb);

      ctx.camera.position.set(0, 0.15, 7.2);
      ctx.camera.lookAt(0, 0.1, 0);
      ctx._crimeKey = key;
    },
    intro(ctx) {
      // Reduced-motion: brief settle into cheap persistent field
      if (ctx.reduced) {
        const tl = gsap.timeline();
        applyPersistentPose(mag, markers, dust, ctx, state);
        tl.to({}, { duration: 0.28 });
        return tl;
      }

      const tl = gsap.timeline();

      // Present the glass — tip into a readable 3/4 view
      tl.to(state, { expand: 0.35, spin: 0.55, duration: 0.65, ease: "power2.out" }, 0);
      tl.to(mag.root.rotation, { x: 0.18, y: -0.12, z: 0.04, duration: 1.0, ease: "power2.inOut" }, 0);
      tl.to(mag.root.position, { x: 0, y: 0.06, duration: 0.95, ease: "power2.inOut" }, 0);
      markers.forEach(function (m, i) {
        tl.to(m.material, { opacity: 0.45, duration: 0.4 }, 0.3 + i * 0.05);
      });
      tl.to(dust.material, { opacity: 0.3, duration: 0.75 }, 0.15);

      // Magnifier expands — lens fills the viewport
      tl.to(
        mag.root.scale,
        { x: 5.2, y: 5.2, z: 5.2, duration: 1.5, ease: "power3.in" },
        0.85
      );
      tl.to(state, { expand: 1, duration: 1.5, ease: "power3.in" }, 0.85);
      tl.to(mag.glass.material, { opacity: 1, duration: 1.15, ease: "power2.in" }, 0.9);
      tl.to(mag.glassGlow.material, { opacity: 0.38, duration: 1.15, ease: "power2.in" }, 0.9);
      tl.to(mag.focus.material, { opacity: 0.85, duration: 1.0 }, 1.0);
      if (mag.rimShine) {
        tl.to(mag.rimShine.material, { opacity: 0.45, duration: 1.0 }, 0.95);
      }
      tl.to(
        ctx.camera.position,
        {
          z: 3.1,
          x: 0.04,
          y: 0.04,
          duration: 1.5,
          ease: "power3.in",
          onUpdate() {
            ctx.camera.lookAt(0, 0.04, 0);
          },
        },
        0.85
      );

      // Lens-fill splash → reveal page
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.3 },
          { opacity: 1, scale: 1.6, duration: 0.4, ease: "power2.out" }
        );
      }, 2.2);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.48 }, 2.55);

      // Dim into calm persistent field
      tl.to(state, { expand: 0.2, dim: 1, spin: 0.12, duration: 0.95 }, 2.4);
      tl.to(
        mag.root.scale,
        { x: 1.15, y: 1.15, z: 1.15, duration: 1.0, ease: "power2.inOut" },
        2.4
      );
      tl.to(mag.root.position, { x: 2.65, y: -1.4, z: -1.2, duration: 1.0 }, 2.4);
      tl.to(mag.root.rotation, { x: 0.28, y: -0.2, z: -0.52, duration: 1.0 }, 2.4);
      tl.to(mag.glass.material, { opacity: 0.72, duration: 0.85 }, 2.45);
      tl.to(mag.glassGlow.material, { opacity: 0.05, duration: 0.85 }, 2.45);
      tl.to(mag.focus.material, { opacity: 0.18, duration: 0.85 }, 2.45);
      if (mag.rimShine) {
        tl.to(mag.rimShine.material, { opacity: 0.1, duration: 0.85 }, 2.45);
      }
      markers.forEach(function (m) {
        tl.to(m.material, { opacity: 0.1, duration: 0.8 }, 2.5);
      });
      tl.to(dust.material, { opacity: 0.14, duration: 0.85 }, 2.5);
      tl.to(
        ctx.camera.position,
        {
          z: 11.5,
          x: 0,
          y: 0.25,
          duration: 1.05,
          ease: "power2.inOut",
          onUpdate() {
            ctx.camera.lookAt(0, 0, 0);
          },
        },
        2.4
      );
      if (ctx.scene.fog) {
        tl.to(ctx.scene.fog, { near: 11, far: 40, duration: 0.95 }, 2.45);
      }

      return tl;
    },
    onPersistent(ctx) {
      applyPersistentPose(mag, markers, dust, ctx, state);
    },
    update(ctx, dt, t) {
      if (!mag) return;
      mag.root.rotation.y = -0.12 + Math.sin(t * 0.2) * 0.035 * state.spin;
      // Specular speck drifts across the lens
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.35);
      mag.focus.position.x = -0.32 + Math.sin(t * 0.7) * 0.12;
      mag.focus.position.y = 0.38 + Math.cos(t * 0.55) * 0.1;
      mag.focus.material.opacity =
        (state.dim ? 0.14 : 0.35 + pulse * 0.35) * (0.5 + state.expand * 0.5);
      if (mag.glassGlow) {
        mag.glassGlow.scale.setScalar(1 + Math.sin(t * 1.5) * 0.028 * (1 - state.dim * 0.7));
      }

      if (dust) {
        dust.rotation.z = Math.sin(t * 0.05) * 0.03;
        dust.position.y = Math.sin(t * 0.18) * 0.12;
      }

      if (!state.dim) {
        markers.forEach(function (m, i) {
          m.material.opacity = 0.35 + Math.sin(t * 1.4 + i) * 0.05;
        });
      }
    },
  });
}
