/**
 * Biology: digestive journey — schematic GI tract, food bolus travels into the page.
 * Longer cinematic intro (~11s); calm cheap organic field after.
 * Palette: deep forest teal, soft mint, warm chlorophyll green.
 */
import { THREE, gsap } from "./core.js";

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
  const progress = { u: 0 };
  const state = { pulse: 0.45, dim: 0, camLag: 0 };

  const tmpPos = new THREE.Vector3();
  const tmpTan = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const tmpCam = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);

  function placeAlongPath(u, camFollow) {
    if (!curve || !bolus) return;
    const t = THREE.MathUtils.clamp(u, 0, 1);
    curve.getPointAt(t, tmpPos);
    curve.getTangentAt(t, tmpTan).normalize();
    bolus.position.copy(tmpPos);
    if (bolusGlow) bolusGlow.position.copy(tmpPos);

    const ahead = Math.min(t + 0.04, 1);
    curve.getPointAt(ahead, tmpLook);
    lookTarget.copy(tmpLook);

    if (camFollow) {
      const side = new THREE.Vector3()
        .crossVectors(tmpTan, tmpUp)
        .normalize()
        .multiplyScalar(1.15);
      tmpCam
        .copy(tmpPos)
        .addScaledVector(tmpTan, -2.85)
        .add(side)
        .y += 0.55 + Math.sin(t * Math.PI * 2) * 0.12;
      camFollow.position.lerp(tmpCam, 0.22 + state.camLag * 0.35);
      camFollow.lookAt(lookTarget);
    }
  }

  return mount({
    id: "biology",
    clearColor: 0x081210,
    fogColor: 0x081210,
    fogNear: 6,
    fogFar: 28,
    build(ctx) {
      curve = buildGutCurve();
      lookTarget = new THREE.Vector3();

      const tubular = ctx.mobile ? 72 : 110;
      const radial = ctx.mobile ? 5 : 7;

      gut = new THREE.Group();
      ctx.scene.add(gut);
      ctx.track(gut);

      gutMat = new THREE.MeshStandardMaterial({
        color: 0x2a6b58,
        emissive: 0x0a3d32,
        emissiveIntensity: 0.35,
        roughness: 0.72,
        metalness: 0.05,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const wall = new THREE.Mesh(
        new THREE.TubeGeometry(curve, tubular, 0.42, radial, false),
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
        new THREE.TubeGeometry(curve, tubular, 0.28, Math.max(4, radial - 1), false),
        lumenMat
      );
      gut.add(lumen);
      ctx.track(lumen);

      // Soft schematic rings along the path (cheap markers, not anatomy)
      const ringCount = ctx.mobile ? 5 : 8;
      for (let i = 0; i < ringCount; i++) {
        const u = (i + 0.5) / ringCount;
        curve.getPointAt(u, tmpPos);
        curve.getTangentAt(u, tmpTan).normalize();
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.52, 0.018, 6, 20),
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
      }

      bolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xd9f99d,
          emissive: 0x65a30d,
          emissiveIntensity: 0.55,
          roughness: 0.4,
          metalness: 0.05,
          transparent: true,
          opacity: 0,
        })
      );
      ctx.scene.add(bolus);
      ctx.track(bolus);

      bolusGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 10, 8),
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

      const n = ctx.mobile ? 90 : 160;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const along = Math.random();
        curve.getPointAt(along, tmpPos);
        pos[i * 3] = tmpPos.x + (Math.random() - 0.5) * 5.5;
        pos[i * 3 + 1] = tmpPos.y + (Math.random() - 0.5) * 4.2;
        pos[i * 3 + 2] = tmpPos.z + (Math.random() - 0.5) * 3.5;
      }
      motes = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          color: 0x6ee7b7,
          size: 0.06,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      ctx.scene.add(motes);
      ctx.track(motes);

      const key = new THREE.PointLight(0x6ee7b7, 1.1, 28);
      key.position.set(-2, 4, 2);
      ctx.scene.add(key);
      ctx.track(key);
      const fill = new THREE.PointLight(0xa7f3d0, 0.45, 36);
      fill.position.set(4, -1, 10);
      ctx.scene.add(fill);
      ctx.track(fill);
      const amb = new THREE.AmbientLight(0x14352c, 0.55);
      ctx.scene.add(amb);
      ctx.track(amb);

      progress.u = 0;
      placeAlongPath(0, null);
      ctx.camera.position.set(-8.2, 4.2, -5.5);
      ctx.camera.lookAt(-5.5, 2.5, -1.5);
      ctx._bioKey = key;
      ctx._bioFill = fill;
    },
    intro(ctx) {
      const tl = gsap.timeline();
      const rings = [];
      gut.traverse(function (o) {
        if (o.userData && o.userData.isRing) rings.push(o);
      });

      // Reveal tract
      tl.to(gutMat, { opacity: 0.72, duration: 1.1, ease: "power2.out" }, 0);
      tl.to(lumenMat, { opacity: 0.16, duration: 1.2, ease: "power2.out" }, 0.15);
      rings.forEach(function (r, i) {
        tl.to(r.material, { opacity: 0.42, duration: 0.55 }, 0.35 + i * 0.08);
      });
      tl.to(bolus.material, { opacity: 0.95, duration: 0.55 }, 0.55);
      tl.to(bolusGlow.material, { opacity: 0.28, duration: 0.55 }, 0.55);
      tl.to(motes.material, { opacity: 0.38, duration: 1.0 }, 0.2);
      tl.to(state, { pulse: 1, camLag: 1, duration: 1.0 }, 0);

      // Journey along the tract (~9s travel inside ~11s total)
      tl.to(
        progress,
        {
          u: 1,
          duration: 9.2,
          ease: "power1.inOut",
          onUpdate() {
            placeAlongPath(progress.u, ctx.camera);
            if (ctx._bioKey) {
              ctx._bioKey.position.lerp(bolus.position, 0.08);
              ctx._bioKey.position.y += 1.2;
            }
          },
        },
        0.9
      );

      // Soft mid-journey pulse
      tl.to(state, { pulse: 1.25, duration: 2.4, ease: "sine.inOut" }, 3.2);
      tl.to(state, { pulse: 0.9, duration: 2.2, ease: "sine.inOut" }, 5.6);

      // Arrival splash → settle into page
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.55 },
          { opacity: 0.9, scale: 1.32, duration: 0.45, ease: "power2.out" }
        );
      }, 9.6);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.55 }, 10.15);

      tl.to(gutMat, { opacity: 0.18, duration: 1.1, ease: "power2.inOut" }, 9.7);
      tl.to(lumenMat, { opacity: 0.05, duration: 1.1 }, 9.7);
      rings.forEach(function (r) {
        tl.to(r.material, { opacity: 0.08, duration: 1.0 }, 9.75);
      });
      tl.to(bolus.material, { opacity: 0.15, duration: 1.0 }, 9.8);
      tl.to(bolusGlow.material, { opacity: 0.04, duration: 1.0 }, 9.8);
      tl.to(motes.material, { opacity: 0.16, duration: 1.0 }, 9.8);
      tl.to(state, { pulse: 0.35, camLag: 0.2, dim: 1, duration: 1.15 }, 9.7);

      tl.to(
        ctx.camera.position,
        {
          x: 1.2,
          y: 1.8,
          z: 8.5,
          duration: 1.35,
          ease: "power2.inOut",
          onUpdate() {
            ctx.camera.lookAt(0.4, 0.2, 12.5);
          },
        },
        9.85
      );

      if (ctx.scene.fog) {
        tl.to(ctx.scene.fog, { near: 10, far: 36, duration: 1.2 }, 9.8);
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
      if (motes && motes.material) motes.material.opacity = 0.12;
      gut.traverse(function (o) {
        if (o.userData && o.userData.isRing && o.material) {
          o.material.opacity = 0.05;
        }
      });
      placeAlongPath(1, null);
      ctx.camera.position.set(1.2, 1.8, 8.5);
      ctx.camera.lookAt(0.4, 0.2, 12.5);
      if (ctx.scene.fog) {
        ctx.scene.fog.near = 12;
        ctx.scene.fog.far = 40;
      }
    },
    update(ctx, dt, t) {
      if (!gut) return;
      const breathe = 1 + Math.sin(t * 0.85) * 0.012 * state.pulse;
      gut.scale.setScalar(breathe);

      if (bolus && !state.dim) {
        const s = 1 + Math.sin(t * 3.2) * 0.06 * state.pulse;
        bolus.scale.setScalar(s);
        if (bolusGlow) {
          bolusGlow.scale.setScalar(1.05 + Math.sin(t * 2.4) * 0.08);
          bolusGlow.rotation.y += dt * 0.4;
        }
      } else if (bolus) {
        bolus.rotation.y += dt * 0.15;
        if (bolusGlow) bolusGlow.rotation.y -= dt * 0.1;
      }

      gut.traverse(function (o) {
        if (o.userData && o.userData.isRing) {
          o.rotation.z += dt * 0.25 * (0.4 + state.pulse * 0.6);
        }
      });

      if (motes) {
        motes.rotation.y = Math.sin(t * 0.08) * 0.04;
        motes.position.y = Math.sin(t * 0.22) * 0.08;
      }
    },
  });
}
