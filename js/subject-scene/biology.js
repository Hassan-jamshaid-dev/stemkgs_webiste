/**
 * Biology: food-through-intestines journey into the page.
 * Tasteful anatomical lighting/materials (soft mucosa, warm bolus) — not gore.
 * Longer cinematic path; calm cheap field after. Clear: purple-black #0c0814.
 */
import { THREE, gsap, budgetCount } from "./core.js";

const CLEAR = 0x0c0814;

/** Side-view GI path: mouth → esophagus → stomach → coils → deep +Z into page. */
function buildGutCurve() {
  return new THREE.CatmullRomCurve3(
    [
      // Oral entry / pharynx
      new THREE.Vector3(-7.2, 4.05, -3.4),
      new THREE.Vector3(-6.55, 3.35, -2.55),
      // Esophagus drop
      new THREE.Vector3(-5.85, 2.15, -1.65),
      new THREE.Vector3(-5.2, 0.55, -0.75),
      new THREE.Vector3(-4.55, -0.85, 0.05),
      // Cardia → stomach pouch
      new THREE.Vector3(-3.55, -1.55, 0.85),
      new THREE.Vector3(-2.25, -1.95, 1.55),
      new THREE.Vector3(-0.85, -1.45, 2.15),
      // Pylorus / duodenal flexure
      new THREE.Vector3(0.35, -0.55, 2.85),
      new THREE.Vector3(1.25, 0.55, 3.55),
      // Jejunal coils — longer meander
      new THREE.Vector3(1.95, 1.45, 4.45),
      new THREE.Vector3(1.15, 2.05, 5.45),
      new THREE.Vector3(-0.35, 1.55, 6.35),
      new THREE.Vector3(-1.55, 0.45, 7.15),
      new THREE.Vector3(-1.25, -0.85, 8.05),
      new THREE.Vector3(0.15, -1.45, 8.95),
      new THREE.Vector3(1.55, -0.75, 9.85),
      new THREE.Vector3(2.15, 0.55, 10.85),
      // Ileum deepening into the page
      new THREE.Vector3(1.35, 1.55, 12.0),
      new THREE.Vector3(-0.15, 1.25, 13.25),
      new THREE.Vector3(-1.05, 0.15, 14.55),
      new THREE.Vector3(0.25, -0.65, 15.85),
      new THREE.Vector3(1.45, 0.15, 17.2),
      new THREE.Vector3(0.85, 0.95, 18.6),
    ],
    false,
    "catmullrom",
    0.38
  );
}

/** Tiny procedural mucosa mottling — cheap, isotropic, no image fetch. */
function makeMucosaMap(size) {
  const s = size || 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const c = canvas.getContext("2d", { alpha: false });
  const img = c.createImageData(s, s);
  const d = img.data;
  function hash(ix, iy) {
    const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function valueNoise(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0);
    const b = hash(x0 + 1, y0);
    const e = hash(x0, y0 + 1);
    const f = hash(x0 + 1, y0 + 1);
    return a + (b - a) * ux + (e - a) * uy + (a - b - e + f) * ux * uy;
  }
  for (let i = 0; i < s * s; i++) {
    const x = i % s;
    const y = (i / s) | 0;
    const n =
      valueNoise(x * 0.18, y * 0.18) * 0.55 +
      valueNoise(x * 0.45, y * 0.45) * 0.3 +
      valueNoise(x * 0.9, y * 0.9) * 0.15;
    // Soft rose mucosa mottling — warm, never blood-red
    const v = 0.62 + n * 0.38;
    const o = i * 4;
    d[o] = Math.min(255, (210 * v) | 0);
    d[o + 1] = Math.min(255, (155 * v) | 0);
    d[o + 2] = Math.min(255, (140 * v) | 0);
    d[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4.5, 3.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  return tex;
}

function foldRadiusAt(u) {
  // Match visual tube radius for mucosal fold rings.
  if (u < 0.18) return 0.34;
  if (u > 0.22 && u < 0.36) return 0.78;
  return 0.4 + Math.sin(u * Math.PI * 6) * 0.03;
}

/** Tiny equirect env so clearcoat/spec reads without HDR assets. */
function makeSoftEnv(renderer) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d", { alpha: false });
  const grd = g.createLinearGradient(0, 0, 0, 32);
  grd.addColorStop(0, "#4a3048");
  grd.addColorStop(0.4, "#1c101c");
  grd.addColorStop(1, "#0c0814");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = "rgba(255, 214, 170, 0.65)";
  g.beginPath();
  g.arc(50, 9, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(200, 140, 170, 0.35)";
  g.beginPath();
  g.arc(14, 20, 7, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return envRT.texture;
}

export function createBiologyExperience(mount) {
  let gut = null;
  let gutMat = null;
  let lumenMat = null;
  let stomach = null;
  let stomachMat = null;
  let bolus = null;
  let bolusGlow = null;
  let bolusCore = null;
  let motes = null;
  let curve = null;
  let lookTarget = null;
  let folds = [];
  let mucosaMap = null;
  const progress = { u: 0 };
  const state = { pulse: 0.45, dim: 0, camLag: 0 };

  const tmpPos = new THREE.Vector3();
  const tmpTan = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const tmpCam = new THREE.Vector3();
  const tmpSide = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);

  function placeAlongPath(u, camFollow) {
    if (!curve || !bolus) return;
    const t = THREE.MathUtils.clamp(u, 0, 1);
    curve.getPointAt(t, tmpPos);
    curve.getTangentAt(t, tmpTan).normalize();
    bolus.position.copy(tmpPos);
    if (bolusGlow) bolusGlow.position.copy(tmpPos);
    if (bolusCore) bolusCore.position.copy(tmpPos);

    const ahead = Math.min(t + 0.038, 1);
    curve.getPointAt(ahead, tmpLook);
    lookTarget.copy(tmpLook);

    if (camFollow) {
      // Ride beside the tract so coils read clearly (not a dark tunnel peephole)
      tmpSide.crossVectors(tmpTan, tmpUp).normalize();
      if (tmpSide.lengthSq() < 0.01) tmpSide.set(1, 0, 0);
      tmpSide.multiplyScalar(1.35 + Math.sin(t * Math.PI * 2) * 0.15);
      tmpCam
        .copy(tmpPos)
        .addScaledVector(tmpTan, -2.85)
        .add(tmpSide);
      tmpCam.y += 0.55 + Math.sin(t * Math.PI * 2.2) * 0.14;
      const blend = 0.14 + state.camLag * 0.36;
      camFollow.position.lerp(tmpCam, blend);
      // Look ahead along the path + slight pull toward the bolus
      tmpLook.lerp(tmpPos, 0.22);
      camFollow.lookAt(tmpLook);
      if (camFollow.isPerspectiveCamera) {
        const targetFov = t > 0.2 && t < 0.38 ? 56 : 48;
        camFollow.fov += (targetFov - camFollow.fov) * 0.035;
        camFollow.updateProjectionMatrix();
      }
    }
  }

  function setPersistentLook(ctx) {
    placeAlongPath(1, null);
    ctx.camera.position.set(1.05, 1.55, 11.2);
    ctx.camera.lookAt(0.45, 0.25, 16.4);
    if (ctx.camera.isPerspectiveCamera) {
      ctx.camera.fov = 48;
      ctx.camera.updateProjectionMatrix();
    }
    if (ctx.scene.fog) {
      ctx.scene.fog.near = 14;
      ctx.scene.fog.far = 44;
    }
  }

  return mount({
    id: "biology",
    clearColor: CLEAR,
    fogColor: CLEAR,
    fogNear: 5,
    fogFar: 26,
    /** Journey ~15s + settle; fail-safe past unlock. */
    failSafeMs: 22000,
    build(ctx) {
      curve = buildGutCurve();
      lookTarget = new THREE.Vector3();
      folds = [];

      // Prefer smoother walls — faceted open ends read as low-poly otherwise
      const tubular = budgetCount(160, 110, 64);
      const radial = budgetCount(24, 16, 12);

      gut = new THREE.Group();
      ctx.scene.add(gut);
      ctx.track(gut);

      mucosaMap = makeMucosaMap(ctx.weak ? 64 : 128);
      ctx.track(mucosaMap);

      // Soft env for wet clearcoat highlights (no HDR fetch)
      if (!ctx.weak) {
        const env = makeSoftEnv(ctx.renderer);
        ctx.scene.environment = env;
        ctx.scene.environmentIntensity = 0.55;
        ctx.track(env);
      }

      // Soft living mucosa — dusty rose / warm taupe + light clearcoat (wet, not gore)
      const Phys = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
      gutMat = new Phys({
        color: 0xe2b8a8,
        map: mucosaMap,
        roughness: 0.48,
        metalness: 0.02,
        emissive: 0x5a3028,
        emissiveIntensity: 0.38,
        clearcoat: 0.42,
        clearcoatRoughness: 0.38,
        sheen: 0.35,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color(0xf8dcc8),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
      const wall = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubular, 0.44, radial, false),
        gutMat
      );
      gut.add(wall);
      ctx.track(wall);

      // Soft outer serosa shell — volume without second texture fetch
      const serosa = new THREE.Mesh(
        new THREE.TubeGeometry(curve, Math.max(48, Math.floor(tubular * 0.55)), 0.56, Math.max(8, radial - 6), false),
        new THREE.MeshStandardMaterial({
          color: 0x9a7468,
          roughness: 0.88,
          metalness: 0,
          emissive: 0x1c0e12,
          emissiveIntensity: 0.18,
          transparent: true,
          opacity: 0,
          side: THREE.FrontSide,
          depthWrite: false,
        })
      );
      gut.add(serosa);
      ctx.track(serosa);
      ctx._bioSerosa = serosa.material;

      // Inner lumen sheen (warm peach — lit from within, tasteful)
      lumenMat = new Phys({
        color: 0xfae4d8,
        emissive: 0xe8b0a0,
        emissiveIntensity: 0.55,
        roughness: 0.32,
        metalness: 0,
        clearcoat: 0.55,
        clearcoatRoughness: 0.28,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const lumen = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubular, 0.3, Math.max(10, radial - 4), false),
        lumenMat
      );
      gut.add(lumen);
      ctx.track(lumen);

      // Cap the oral entry so the open TubeGeometry polygon is hidden
      curve.getPointAt(0, tmpPos);
      curve.getTangentAt(0, tmpTan).normalize();
      const mouth = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.07, 8, radial),
        new Phys({
          color: 0xd4a090,
          roughness: 0.45,
          metalness: 0.03,
          emissive: 0x4a2820,
          emissiveIntensity: 0.3,
          clearcoat: 0.4,
          clearcoatRoughness: 0.35,
          transparent: true,
          opacity: 0,
        })
      );
      mouth.position.copy(tmpPos);
      mouth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmpTan);
      gut.add(mouth);
      ctx.track(mouth);
      ctx._bioMouth = mouth.material;

      // Stomach pouch accent (soft ellipsoid at cardia/fundus region)
      stomachMat = new Phys({
        color: 0xd4a090,
        map: mucosaMap,
        roughness: 0.5,
        metalness: 0.04,
        emissive: 0x422820,
        emissiveIntensity: 0.4,
        clearcoat: 0.38,
        clearcoatRoughness: 0.4,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xf5d0c0),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
      stomach = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, ctx.mobile ? 20 : 32, ctx.mobile ? 16 : 24),
        stomachMat
      );
      curve.getPointAt(0.28, tmpPos);
      stomach.position.copy(tmpPos);
      stomach.scale.set(1.28, 0.8, 0.98);
      gut.add(stomach);
      ctx.track(stomach);

      // Mucosal fold rings — soft circularis cues, not schematic neon
      const foldCount = budgetCount(9, 6, 4);
      for (let i = 0; i < foldCount; i++) {
        const u = 0.08 + (i / (foldCount - 1 || 1)) * 0.86;
        curve.getPointAt(u, tmpPos);
        curve.getTangentAt(u, tmpTan).normalize();
        const rr = foldRadiusAt(u);
        const fold = new THREE.Mesh(
          new THREE.TorusGeometry(rr, 0.018, 5, ctx.mobile ? 16 : 22),
          new THREE.MeshStandardMaterial({
            color: 0xd4b0a0,
            emissive: 0x5c3a32,
            emissiveIntensity: 0.18,
            roughness: 0.7,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          })
        );
        fold.position.copy(tmpPos);
        fold.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmpTan);
        gut.add(fold);
        ctx.track(fold);
        folds.push(fold);
      }

      // Warm food bolus — toasted grain / soft apricot (never red/gore)
      const bolusSeg = ctx.mobile ? 16 : 24;
      bolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, bolusSeg, Math.max(12, bolusSeg - 4)),
        new THREE.MeshStandardMaterial({
          color: 0xf5d6a0,
          emissive: 0xc89030,
          emissiveIntensity: 0.85,
          roughness: 0.4,
          metalness: 0.06,
          transparent: true,
          opacity: 0,
        })
      );
      // Slightly irregular food shape
      bolus.scale.set(1.1, 0.84, 0.96);
      ctx.scene.add(bolus);
      ctx.track(bolus);

      bolusCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        new THREE.MeshBasicMaterial({
          color: 0xfff0d0,
          transparent: true,
          opacity: 0,
          toneMapped: false,
        })
      );
      ctx.scene.add(bolusCore);
      ctx.track(bolusCore);

      bolusGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 12, 10),
        new THREE.MeshBasicMaterial({
          color: 0xffd878,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ctx.scene.add(bolusGlow);
      ctx.track(bolusGlow);

      // Soft floating chyme / enzyme motes
      const n = budgetCount(160, 90, 52);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const along = Math.random();
        curve.getPointAt(along, tmpPos);
        const spread = 0.35 + Math.random() * 2.8;
        pos[i * 3] = tmpPos.x + (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = tmpPos.y + (Math.random() - 0.5) * spread * 0.7;
        pos[i * 3 + 2] = tmpPos.z + (Math.random() - 0.5) * spread * 0.55;
      }
      motes = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          color: 0xe8c4a8,
          size: ctx.mobile ? 0.04 : 0.05,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      ctx.scene.add(motes);
      ctx.track(motes);

      // Lighting: warm key rides the bolus, soft mauve fill, hemi catch — no shadows
      const key = new THREE.PointLight(0xffe8c8, 2.2, 14, 1.6);
      key.position.set(-6, 3.5, -2);
      ctx.scene.add(key);
      ctx.track(key);

      const fill = new THREE.PointLight(0xc898b0, 0.7, 32, 2);
      fill.position.set(3.5, 2.2, 9);
      ctx.scene.add(fill);
      ctx.track(fill);

      const hemi = new THREE.HemisphereLight(0xfff0e4, 0x120810, 0.72);
      ctx.scene.add(hemi);
      ctx.track(hemi);

      progress.u = 0;
      placeAlongPath(0, null);
      ctx.camera.position.set(-9.1, 4.6, -6.2);
      ctx.camera.lookAt(-6.2, 3.2, -2.4);
      ctx._bioKey = key;
      ctx._bioFill = fill;
    },
    intro(ctx) {
      // Reduced-motion: brief settle into cheap persistent field (short path)
      if (ctx.reduced) {
        const tl = gsap.timeline();
          if (gutMat) gutMat.opacity = 0.18;
        if (ctx._bioSerosa) ctx._bioSerosa.opacity = 0.06;
        if (ctx._bioMouth) ctx._bioMouth.opacity = 0.1;
        if (lumenMat) lumenMat.opacity = 0.08;
        if (stomachMat) stomachMat.opacity = 0.12;
        if (motes && motes.material) motes.material.opacity = 0.1;
        if (bolus && bolus.material) bolus.material.opacity = 0.12;
        if (bolusGlow && bolusGlow.material) bolusGlow.material.opacity = 0.04;
        if (bolusCore && bolusCore.material) bolusCore.material.opacity = 0.08;
        folds.forEach(function (f) {
          if (f.material) f.material.opacity = 0.08;
        });
        progress.u = 1;
        state.dim = 1;
        state.pulse = 0.28;
        setPersistentLook(ctx);
        tl.to({}, { duration: 0.28 });
        return tl;
      }

      const tl = gsap.timeline();

      // Instant start — tract reveals while camera already tracking entry
      tl.to(gutMat, { opacity: 0.96, duration: 1.1, ease: "power2.out" }, 0);
      if (ctx._bioSerosa) tl.to(ctx._bioSerosa, { opacity: 0.32, duration: 1.25, ease: "power2.out" }, 0.05);
      if (ctx._bioMouth) tl.to(ctx._bioMouth, { opacity: 0.92, duration: 0.9, ease: "power2.out" }, 0.05);
      tl.to(lumenMat, { opacity: 0.48, duration: 1.25, ease: "power2.out" }, 0.08);
      tl.to(stomachMat, { opacity: 0.92, duration: 1.1, ease: "power2.out" }, 0.18);
      folds.forEach(function (f, i) {
        tl.to(f.material, { opacity: 0.42, duration: 0.55 }, 0.25 + i * 0.06);
      });
      tl.to(bolus.material, { opacity: 1, duration: 0.4 }, 0.12);
      tl.to(bolusGlow.material, { opacity: 0.48, duration: 0.45 }, 0.12);
      tl.to(bolusCore.material, { opacity: 0.85, duration: 0.4 }, 0.15);
      tl.to(motes.material, { opacity: 0.28, duration: 1.1 }, 0.1);
      tl.to(state, { pulse: 1, camLag: 1, duration: 0.9 }, 0);

      // Longer journey along the tract (~13.8s travel; total ~16.5–17s)
      tl.to(
        progress,
        {
          u: 1,
          duration: 13.8,
          ease: "power1.inOut",
          onUpdate() {
            placeAlongPath(progress.u, ctx.camera);
            if (ctx._bioKey && bolus) {
              ctx._bioKey.position.lerp(bolus.position, 0.1);
              ctx._bioKey.position.y += 0.85;
            }
            // Stomach lights up as bolus passes
            if (stomachMat && progress.u > 0.2 && progress.u < 0.42) {
              const peak = 1 - Math.abs(progress.u - 0.3) / 0.12;
              stomachMat.emissiveIntensity = 0.28 + peak * 0.35;
            }
          },
        },
        0.35
      );

      // Soft peristaltic breath mid-journey (calm, not pulse-horror)
      tl.to(state, { pulse: 1.18, duration: 3.2, ease: "sine.inOut" }, 3.5);
      tl.to(state, { pulse: 0.9, duration: 2.8, ease: "sine.inOut" }, 7.0);
      tl.to(state, { pulse: 1.08, duration: 2.5, ease: "sine.inOut" }, 10.2);

      // Arrival splash → settle into page
      const arrive = 13.6;
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.55 },
          { opacity: 0.82, scale: 1.32, duration: 0.48, ease: "power2.out" }
        );
      }, arrive);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.55 }, arrive + 0.55);

      tl.to(gutMat, { opacity: 0.16, duration: 1.2, ease: "power2.inOut" }, arrive);
      if (ctx._bioSerosa) tl.to(ctx._bioSerosa, { opacity: 0.05, duration: 1.2 }, arrive);
      if (ctx._bioMouth) tl.to(ctx._bioMouth, { opacity: 0.08, duration: 1.1 }, arrive);
      tl.to(lumenMat, { opacity: 0.06, duration: 1.2 }, arrive);
      tl.to(stomachMat, { opacity: 0.1, duration: 1.15 }, arrive);
      folds.forEach(function (f) {
        tl.to(f.material, { opacity: 0.06, duration: 1.05 }, arrive + 0.05);
      });
      tl.to(bolus.material, { opacity: 0.1, duration: 1.05 }, arrive + 0.1);
      tl.to(bolusGlow.material, { opacity: 0.03, duration: 1.05 }, arrive + 0.1);
      tl.to(bolusCore.material, { opacity: 0.05, duration: 1.0 }, arrive + 0.1);
      tl.to(motes.material, { opacity: 0.11, duration: 1.05 }, arrive + 0.1);
      tl.to(state, { pulse: 0.3, camLag: 0.12, dim: 1, duration: 1.2 }, arrive);

      tl.to(
        ctx.camera.position,
        {
          x: 1.05,
          y: 1.55,
          z: 11.2,
          duration: 1.45,
          ease: "power2.inOut",
          onUpdate() {
            ctx.camera.lookAt(0.45, 0.25, 16.4);
          },
        },
        arrive + 0.15
      );

      if (ctx.camera.isPerspectiveCamera) {
        tl.to(ctx.camera, { fov: 48, duration: 1.2, onUpdate() { ctx.camera.updateProjectionMatrix(); } }, arrive);
      }

      if (ctx.scene.fog) {
        tl.to(ctx.scene.fog, { near: 12, far: 40, duration: 1.25 }, arrive + 0.05);
      }

      return tl;
    },
    onPersistent(ctx) {
      state.pulse = 0.26;
      state.dim = 1;
      state.camLag = 0;
      progress.u = 1;
      if (gutMat) gutMat.opacity = 0.12;
      if (ctx._bioSerosa) ctx._bioSerosa.opacity = 0.04;
      if (ctx._bioMouth) ctx._bioMouth.opacity = 0.06;
      if (lumenMat) lumenMat.opacity = 0.045;
      if (stomachMat) stomachMat.opacity = 0.07;
      if (bolus && bolus.material) bolus.material.opacity = 0.08;
      if (bolusGlow && bolusGlow.material) bolusGlow.material.opacity = 0.02;
      if (bolusCore && bolusCore.material) bolusCore.material.opacity = 0.04;
      if (motes && motes.material) motes.material.opacity = 0.09;
      folds.forEach(function (f) {
        if (f.material) f.material.opacity = 0.04;
      });
      setPersistentLook(ctx);
    },
    update(ctx, dt, t) {
      if (!gut) return;
      // Soft peristalsis — gentle longitudinal breathe
      const breathe = 1 + Math.sin(t * 0.68) * 0.012 * state.pulse;
      gut.scale.set(breathe, 1 + Math.sin(t * 0.55 + 0.4) * 0.01 * state.pulse, breathe);

      if (bolus && !state.dim) {
        const s = 1 + Math.sin(t * 2.4) * 0.045 * state.pulse;
        bolus.scale.set(1.05 * s, 0.88 * s, 0.95 * s);
        bolus.rotation.x += dt * 0.55;
        bolus.rotation.y += dt * 0.35;
        if (bolusGlow) {
          bolusGlow.scale.setScalar(1.02 + Math.sin(t * 2.0) * 0.07);
          bolusGlow.rotation.y += dt * 0.22;
        }
        if (bolusCore) bolusCore.rotation.y -= dt * 0.4;
      } else if (bolus) {
        bolus.rotation.y += dt * 0.1;
        if (bolusGlow) bolusGlow.rotation.y -= dt * 0.06;
      }

      for (let i = 0; i < folds.length; i++) {
        folds[i].rotation.z += dt * 0.12 * (0.35 + state.pulse * 0.4) * (i % 2 ? 1 : -1);
      }

      if (motes) {
        motes.rotation.y = Math.sin(t * 0.06) * 0.03;
        motes.position.y = Math.sin(t * 0.18) * 0.05;
      }

      if (ctx._bioFill && !state.dim) {
        ctx._bioFill.intensity = 0.38 + Math.sin(t * 0.7) * 0.06 * state.pulse;
      }
    },
    disposeExtra() {
      mucosaMap = null;
    },
  });
}
