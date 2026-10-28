/**
 * Biology: digestive journey — schematic GI tract, soft food bolus travels into the page.
 * Longer cinematic intro (~11–12s); calm cheap organic field after.
 * Not anatomical/horror — soft mint–teal schematic, warm seed-like bolus.
 * Palette: deep forest teal, soft mint, warm chlorophyll green.
 */
import { THREE, gsap, budgetCount } from "./core.js";

/** Side-view GI schematic: esophagus → stomach → coils → deeper into +Z. */
function buildGutCurve() {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-6.4, 3.4, -2.2),
      new THREE.Vector3(-5.6, 2.2, -1.4),
      new THREE.Vector3(-4.4, 0.55, -0.35),
      new THREE.Vector3(-2.9, -0.85, 0.55),
      new THREE.Vector3(-1.1, -1.55, 1.35),
      new THREE.Vector3(0.55, -0.35, 2.45),
      new THREE.Vector3(1.85, 1.05, 3.55),
      new THREE.Vector3(0.65, 1.85, 4.85),
      new THREE.Vector3(-1.35, 0.75, 6.1),
      new THREE.Vector3(-0.25, -1.15, 7.4),
      new THREE.Vector3(1.65, -0.55, 8.9),
      new THREE.Vector3(2.4, 0.85, 10.6),
      new THREE.Vector3(1.1, 1.45, 12.4),
      new THREE.Vector3(-0.4, 0.35, 14.2),
    ],
    false,
    "catmullrom",
    0.42
  );
}

export function createBiologyExperience(mount) {
  let gut = null;
  let gutMat = null;
  let lumenMat = null;
  let bolus = null;
  let bolusGlow = null;
  let motes = null;
  let curve = null;
  let lookTarget = null;
  let rings = [];
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

    const ahead = Math.min(t + 0.045, 1);
    curve.getPointAt(ahead, tmpLook);
    lookTarget.copy(tmpLook);

    if (camFollow) {
      tmpSide.crossVectors(tmpTan, tmpUp).normalize().multiplyScalar(1.05);
      tmpCam
        .copy(tmpPos)
        .addScaledVector(tmpTan, -2.65)
        .add(tmpSide);
      tmpCam.y += 0.48 + Math.sin(t * Math.PI * 2) * 0.1;
      const blend = 0.18 + state.camLag * 0.32;
      camFollow.position.lerp(tmpCam, blend);
      camFollow.lookAt(lookTarget);
    }
  }

  function setPersistentLook(ctx) {
    placeAlongPath(1, null);
    ctx.camera.position.set(1.15, 1.75, 8.4);
    ctx.camera.lookAt(0.35, 0.15, 12.2);
    if (ctx.scene.fog) {
      ctx.scene.fog.near = 12;
      ctx.scene.fog.far = 40;
    }
  }

  return mount({
    id: "biology",
    clearColor: 0x0c0814,
    fogColor: 0x0c0814,
    fogNear: 6,
    fogFar: 28,
    /** Longer than default boot fail-safe so the ~12s journey can finish. */
    failSafeMs: 16000,
    build(ctx) {
      curve = buildGutCurve();
      lookTarget = new THREE.Vector3();
      rings = [];

      const tubular = budgetCount(96, 64, 40);
      const radial = budgetCount(7, 5, 4);

      gut = new THREE.Group();
      ctx.scene.add(gut);
      ctx.track(gut);

      // Basic wall material — cheap, soft schematic (no PBR guts)
      gutMat = new THREE.MeshBasicMaterial({
        color: 0x2f7a64,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const wall = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubular, 0.4, radial, false),
        gutMat
      );
      gut.add(wall);
      ctx.track(wall);

      lumenMat = new THREE.MeshBasicMaterial({
        color: 0x6ee7b7,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.BackSide,
      });
      const lumen = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubular, 0.26, Math.max(4, radial - 1), false),
        lumenMat
      );
      gut.add(lumen);
      ctx.track(lumen);

      // Soft schematic rings along the path (markers, not anatomy)
      const ringCount = budgetCount(7, 5, 3);
      for (let i = 0; i < ringCount; i++) {
        const u = (i + 0.5) / ringCount;
        curve.getPointAt(u, tmpPos);
        curve.getTangentAt(u, tmpTan).normalize();
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.016, 5, 18),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? 0x34d399 : 0x5eead4,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        );
        ring.position.copy(tmpPos);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmpTan);
        ring.userData.isRing = true;
        gut.add(ring);
        ctx.track(ring);
        rings.push(ring);
      }

      // Warm seed / berry bolus — soft food cue, never red/gore
      bolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, ctx.mobile ? 10 : 12, ctx.mobile ? 8 : 10),
        new THREE.MeshBasicMaterial({
          color: 0xe8f5a8,
          transparent: true,
          opacity: 0,
          toneMapped: false,
        })
      );
      ctx.scene.add(bolus);
      ctx.track(bolus);

      bolusGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 8, 6),
        new THREE.MeshBasicMaterial({
          color: 0xa3e635,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ctx.scene.add(bolusGlow);
      ctx.track(bolusGlow);

      const n = budgetCount(140, 80, 48);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const along = Math.random();
        curve.getPointAt(along, tmpPos);
        pos[i * 3] = tmpPos.x + (Math.random() - 0.5) * 5.2;
        pos[i * 3 + 1] = tmpPos.y + (Math.random() - 0.5) * 3.8;
        pos[i * 3 + 2] = tmpPos.z + (Math.random() - 0.5) * 3.2;
      }
      motes = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          color: 0x6ee7b7,
          size: 0.055,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      ctx.scene.add(motes);
      ctx.track(motes);

      // Single soft key + ambient — keep light count low
      const key = new THREE.PointLight(0x6ee7b7, 0.85, 26);
      key.position.set(-2, 4, 2);
      ctx.scene.add(key);
      ctx.track(key);
      const amb = new THREE.AmbientLight(0x14352c, 0.7);
      ctx.scene.add(amb);
      ctx.track(amb);

      progress.u = 0;
      placeAlongPath(0, null);
      ctx.camera.position.set(-8.2, 4.2, -5.5);
      ctx.camera.lookAt(-5.5, 2.5, -1.5);
      ctx._bioKey = key;
    },
    intro(ctx) {
      // Reduced-motion: brief settle into cheap persistent field (~1.2s)
      if (ctx.reduced) {
        const tl = gsap.timeline();
        if (gutMat) gutMat.opacity = 0.12;
        if (lumenMat) lumenMat.opacity = 0.04;
        if (motes && motes.material) motes.material.opacity = 0.12;
        if (bolus && bolus.material) bolus.material.opacity = 0.1;
        if (bolusGlow && bolusGlow.material) bolusGlow.material.opacity = 0.03;
        rings.forEach(function (r) {
          if (r.material) r.material.opacity = 0.06;
        });
        progress.u = 1;
        state.dim = 1;
        state.pulse = 0.28;
        setPersistentLook(ctx);
        tl.to({}, { duration: 1.15 });
        return tl;
      }

      const tl = gsap.timeline();

      // Reveal tract (~1.2s)
      tl.to(gutMat, { opacity: 0.62, duration: 1.15, ease: "power2.out" }, 0);
      tl.to(lumenMat, { opacity: 0.14, duration: 1.25, ease: "power2.out" }, 0.12);
      rings.forEach(function (r, i) {
        tl.to(r.material, { opacity: 0.38, duration: 0.5 }, 0.3 + i * 0.07);
      });
      tl.to(bolus.material, { opacity: 0.95, duration: 0.5 }, 0.5);
      tl.to(bolusGlow.material, { opacity: 0.26, duration: 0.5 }, 0.5);
      tl.to(motes.material, { opacity: 0.34, duration: 1.0 }, 0.15);
      tl.to(state, { pulse: 1, camLag: 1, duration: 1.0 }, 0);

      // Journey along the tract (~9.4s travel; total ~11.5–12s)
      tl.to(
        progress,
        {
          u: 1,
          duration: 9.4,
          ease: "power1.inOut",
          onUpdate() {
            placeAlongPath(progress.u, ctx.camera);
            if (ctx._bioKey && bolus) {
              ctx._bioKey.position.lerp(bolus.position, 0.07);
              ctx._bioKey.position.y += 1.15;
            }
          },
        },
        0.85
      );

      // Soft mid-journey breath (calm, not pulse-horror)
      tl.to(state, { pulse: 1.15, duration: 2.5, ease: "sine.inOut" }, 3.0);
      tl.to(state, { pulse: 0.88, duration: 2.3, ease: "sine.inOut" }, 5.5);

      // Arrival splash → settle into page
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.58 },
          { opacity: 0.85, scale: 1.28, duration: 0.42, ease: "power2.out" }
        );
      }, 9.85);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.5 }, 10.35);

      tl.to(gutMat, { opacity: 0.14, duration: 1.05, ease: "power2.inOut" }, 9.9);
      tl.to(lumenMat, { opacity: 0.04, duration: 1.05 }, 9.9);
      rings.forEach(function (r) {
        tl.to(r.material, { opacity: 0.06, duration: 0.95 }, 9.95);
      });
      tl.to(bolus.material, { opacity: 0.1, duration: 0.95 }, 10.0);
      tl.to(bolusGlow.material, { opacity: 0.03, duration: 0.95 }, 10.0);
      tl.to(motes.material, { opacity: 0.14, duration: 0.95 }, 10.0);
      tl.to(state, { pulse: 0.32, camLag: 0.15, dim: 1, duration: 1.1 }, 9.9);

      tl.to(
        ctx.camera.position,
        {
          x: 1.15,
          y: 1.75,
          z: 8.4,
          duration: 1.3,
          ease: "power2.inOut",
          onUpdate() {
            ctx.camera.lookAt(0.35, 0.15, 12.2);
          },
        },
        10.05
      );

      if (ctx.scene.fog) {
        tl.to(ctx.scene.fog, { near: 10, far: 36, duration: 1.15 }, 10.0);
      }

      return tl;
    },
    onPersistent(ctx) {
      state.pulse = 0.28;
      state.dim = 1;
      state.camLag = 0;
      progress.u = 1;
      if (gutMat) gutMat.opacity = 0.1;
      if (lumenMat) lumenMat.opacity = 0.03;
      if (bolus && bolus.material) bolus.material.opacity = 0.08;
      if (bolusGlow && bolusGlow.material) bolusGlow.material.opacity = 0.02;
      if (motes && motes.material) motes.material.opacity = 0.11;
      rings.forEach(function (r) {
        if (r.material) r.material.opacity = 0.045;
      });
      setPersistentLook(ctx);
    },
    update(ctx, dt, t) {
      if (!gut) return;
      const breathe = 1 + Math.sin(t * 0.75) * 0.01 * state.pulse;
      gut.scale.setScalar(breathe);

      if (bolus && !state.dim) {
        const s = 1 + Math.sin(t * 2.6) * 0.05 * state.pulse;
        bolus.scale.setScalar(s);
        if (bolusGlow) {
          bolusGlow.scale.setScalar(1.04 + Math.sin(t * 2.1) * 0.06);
          bolusGlow.rotation.y += dt * 0.28;
        }
      } else if (bolus) {
        bolus.rotation.y += dt * 0.12;
        if (bolusGlow) bolusGlow.rotation.y -= dt * 0.08;
      }

      for (let i = 0; i < rings.length; i++) {
        rings[i].rotation.z += dt * 0.2 * (0.4 + state.pulse * 0.5);
      }

      if (motes) {
        motes.rotation.y = Math.sin(t * 0.07) * 0.035;
        motes.position.y = Math.sin(t * 0.2) * 0.06;
      }
    },
  });
}
