/**
 * Physics: standing waves + force vectors + energy sparks — not a code vortex.
 * Palette: deep navy, ice blue, soft white crests.
 */
import { THREE, gsap } from "./core.js";

export function createPhysicsExperience(mount) {
  let waves = [];
  let vectors = [];
  let sparks = null;
  const state = { energy: 0, amp: 1.4, freq: 1.2 };

  return mount({
    id: "physics",
    clearColor: 0x050a14,
    fogColor: 0x050a14,
    fogNear: 8,
    fogFar: 38,
    build(ctx) {
      const waveCount = ctx.mobile ? 4 : 6;
      for (let w = 0; w < waveCount; w++) {
        const segs = ctx.mobile ? 72 : 128;
        const positions = new Float32Array((segs + 1) * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: w % 2 ? 0x7dd3fc : 0x4a8fd4,
            transparent: true,
            opacity: 0.58 - w * 0.055,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          })
        );
        line.position.y = (w - (waveCount - 1) / 2) * 0.78;
        line.userData = { segs, phase: w * 0.65, speed: 1 + w * 0.14 };
        ctx.scene.add(line);
        waves.push(line);
        ctx.track(line);
      }

      for (let i = 0; i < 8; i++) {
        const dir = new THREE.Vector3(
          Math.sin(i * 0.9),
          Math.cos(i * 1.1) * 0.45,
          Math.cos(i * 0.9)
        ).normalize();
        const origin = dir.clone().multiplyScalar(-6.2);
        const arrow = new THREE.ArrowHelper(
          dir,
          origin,
          3.4,
          i % 2 ? 0xa5f3fc : 0x38bdf8,
          0.48,
          0.28
        );
        arrow.cone.material.transparent = true;
        arrow.cone.material.opacity = 0.58;
        arrow.cone.material.toneMapped = false;
        arrow.line.material.transparent = true;
        arrow.line.material.opacity = 0.48;
        arrow.line.material.toneMapped = false;
        ctx.scene.add(arrow);
        vectors.push(arrow);
        ctx.track(arrow);
      }

      const sparkN = ctx.mobile ? 220 : 480;
      const spos = new Float32Array(sparkN * 3);
      for (let i = 0; i < sparkN; i++) {
        spos[i * 3] = (Math.random() - 0.5) * 18;
        spos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        spos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }
      const sgeo = new THREE.BufferGeometry();
      sgeo.setAttribute("position", new THREE.BufferAttribute(spos, 3));
      sparks = new THREE.Points(
        sgeo,
        new THREE.PointsMaterial({
          color: 0xe0f2fe,
          size: 0.075,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ctx.scene.add(sparks);
      ctx.track(sparks);

      ctx.camera.position.set(0, 0.3, 13.2);
      ctx.camera.lookAt(0, 0, 0);
      ctx._phys = { sparkN, spos };
    },
    intro(ctx) {
      const tl = gsap.timeline();
      tl.to(state, { energy: 1, amp: 2.35, freq: 2.2, duration: 2.05, ease: "power2.in" }, 0);
      tl.to(ctx.camera.position, {
        z: 7.2,
        x: 1.35,
        y: 0.55,
        duration: 2.2,
        ease: "power3.inOut",
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 0);
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.4 },
          { opacity: 1, scale: 1.45, duration: 0.4, ease: "power2.out" }
        );
      }, 2.15);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.5 }, 2.5);
      tl.to(state, { amp: 0.65, freq: 0.85, energy: 0.32, duration: 0.95 }, 2.45);
      tl.to(ctx.camera.position, {
        z: 12.2,
        x: 0,
        y: 0.35,
        duration: 1,
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 2.45);
      return tl;
    },
    onPersistent(ctx) {
      state.amp = 0.5;
      state.freq = 0.72;
      state.energy = 0.22;
      vectors.forEach(function (a) {
        a.cone.material.opacity = 0.16;
        a.line.material.opacity = 0.12;
      });
      if (sparks) sparks.material.opacity = 0.22;
      waves.forEach(function (w) {
        w.material.opacity = Math.max(0.12, w.material.opacity * 0.5);
      });
      ctx.camera.position.set(0, 0.3, 12.8);
    },
    update(ctx, dt, t) {
      waves.forEach(function (wave) {
        const { segs, phase, speed } = wave.userData;
        const pos = wave.geometry.attributes.position.array;
        for (let i = 0; i <= segs; i++) {
          const x = (i / segs) * 18 - 9;
          const y =
            Math.sin(x * state.freq + t * speed * 1.65 + phase) * state.amp * 0.55 +
            Math.sin(x * 0.42 + t * 0.75 + phase) * state.amp * 0.22;
          pos[i * 3] = x;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = Math.cos(x * 0.22 + t * 0.32 + phase) * 0.85 * state.energy;
        }
        wave.geometry.attributes.position.needsUpdate = true;
      });

      vectors.forEach(function (arrow, i) {
        arrow.rotation.y += dt * (0.18 + state.energy * 0.55) * (i % 2 ? 1 : -1);
        const pulse = 2.5 + Math.sin(t * 2.1 + i) * 0.55 * state.energy;
        arrow.setLength(pulse, 0.38, 0.24);
      });

      if (sparks && ctx._phys) {
        const arr = sparks.geometry.attributes.position.array;
        for (let i = 0; i < ctx._phys.sparkN; i++) {
          arr[i * 3 + 1] += Math.sin(t * 1.2 + i) * 0.012 * (0.35 + state.energy);
          arr[i * 3] += Math.cos(t * 0.55 + i) * 0.009;
          if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -6;
        }
        sparks.geometry.attributes.position.needsUpdate = true;
      }
    },
  });
}
