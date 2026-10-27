/**
 * Biology: cellular bloom — membrane, nucleus, drifting ribbons & vesicles.
 * Palette: deep forest teal, soft mint, warm chlorophyll green.
 */
import { THREE, gsap } from "./core.js";

export function createBiologyExperience(mount) {
  let cell = null;
  let membrane = null;
  let organelles = [];
  const state = { pulse: 0.5, open: 0 };

  return mount({
    id: "biology",
    clearColor: 0x081210,
    fogColor: 0x081210,
    fogNear: 8,
    fogFar: 34,
    build(ctx) {
      cell = new THREE.Group();
      ctx.scene.add(cell);
      ctx.track(cell);

      const nucleus = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 32, 24),
        new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x064e3b,
          emissiveIntensity: 0.5,
          roughness: 0.45,
          metalness: 0.1,
          transparent: true,
          opacity: 0.92,
        })
      );
      nucleus.scale.setScalar(0.15);
      cell.add(nucleus);
      ctx.track(nucleus);
      organelles.push(nucleus);

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 20, 16),
        new THREE.MeshStandardMaterial({
          color: 0xa7f3d0,
          emissive: 0x10b981,
          emissiveIntensity: 0.65,
          roughness: 0.3,
        })
      );
      cell.add(core);
      ctx.track(core);
      organelles.push(core);

      membrane = new THREE.Mesh(
        new THREE.SphereGeometry(2.65, 36, 28),
        new THREE.MeshBasicMaterial({
          color: 0x6ee7b7,
          wireframe: true,
          transparent: true,
          opacity: 0.3,
          toneMapped: false,
        })
      );
      membrane.scale.setScalar(0.12);
      cell.add(membrane);
      ctx.track(membrane);

      const ribbonCount = ctx.mobile ? 4 : 7;
      for (let i = 0; i < ribbonCount; i++) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-3.1, Math.sin(i) * 1.25, i * 0.18),
          new THREE.Vector3(-1.1, Math.cos(i) * 1.55, -0.85),
          new THREE.Vector3(1.25, Math.sin(i + 1) * 1.45, 0.95),
          new THREE.Vector3(3.3, Math.cos(i * 0.7) * 0.85, -0.28),
        ]);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 48, 0.048, 6, false),
          new THREE.MeshStandardMaterial({
            color: i % 2 ? 0x34d399 : 0x2dd4bf,
            emissive: 0x065f46,
            emissiveIntensity: 0.38,
            transparent: true,
            opacity: 0,
          })
        );
        tube.rotation.y = (i / ribbonCount) * Math.PI * 2;
        tube.userData.speed = 0.18 + i * 0.045;
        cell.add(tube);
        organelles.push(tube);
        ctx.track(tube);
      }

      const n = ctx.mobile ? 240 : 420;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = 3 + Math.random() * 8;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
        pos[i * 3 + 2] = r * Math.cos(ph);
      }
      const vesicles = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          color: 0x6ee7b7,
          size: 0.085,
          transparent: true,
          opacity: 0.58,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ctx.scene.add(vesicles);
      ctx.track(vesicles);
      ctx._bioVesicles = vesicles;

      const key = new THREE.PointLight(0x6ee7b7, 1.35, 40);
      key.position.set(3, 4, 5);
      ctx.scene.add(key);
      ctx.track(key);
      const amb = new THREE.AmbientLight(0x14352c, 0.6);
      ctx.scene.add(amb);
      ctx.track(amb);

      ctx.camera.position.set(0, 0.4, 13.2);
      ctx.camera.lookAt(0, 0, 0);
    },
    intro(ctx) {
      const tl = gsap.timeline();
      tl.to(membrane.scale, { x: 1, y: 1, z: 1, duration: 1.55, ease: "elastic.out(1, 0.55)" }, 0);
      tl.to(organelles[0].scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "back.out(1.4)" }, 0.15);
      organelles.forEach(function (o) {
        if (o.userData && o.userData.speed && o.material) {
          tl.to(o.material, { opacity: 0.78, duration: 0.7 }, 0.45);
        }
      });
      tl.to(state, { open: 1, pulse: 1.25, duration: 2.05 }, 0);
      tl.to(ctx.camera.position, {
        z: 7.2,
        y: 0.55,
        duration: 2.15,
        ease: "power2.inOut",
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 0);
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.5 },
          { opacity: 0.88, scale: 1.35, duration: 0.4, ease: "power2.out" }
        );
      }, 2.15);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.5 }, 2.5);
      tl.to(ctx.camera.position, {
        z: 11.9,
        duration: 0.95,
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 2.5);
      tl.to(state, { pulse: 0.5, duration: 0.85 }, 2.5);
      return tl;
    },
    onPersistent() {
      state.pulse = 0.38;
      state.open = 1;
      if (membrane) membrane.material.opacity = 0.12;
      organelles.forEach(function (o) {
        if (o.material && o.material.opacity != null) {
          o.material.opacity = Math.min(o.material.opacity, 0.48);
        }
      });
    },
    update(ctx, dt, t) {
      if (!cell) return;
      cell.rotation.y += dt * 0.11;
      const s = 1 + Math.sin(t * 1.35) * 0.045 * state.pulse;
      if (organelles[0]) organelles[0].scale.setScalar(s);
      if (membrane) {
        membrane.rotation.y -= dt * 0.075;
        membrane.rotation.z = Math.sin(t * 0.48) * 0.09;
        const mPulse = 1 + Math.sin(t * 1.1) * 0.02 * state.pulse;
        membrane.scale.setScalar(mPulse);
      }
      organelles.forEach(function (o) {
        if (o.userData && o.userData.speed) {
          o.rotation.y += dt * o.userData.speed * (0.45 + state.pulse * 0.55);
        }
      });
      if (ctx._bioVesicles) {
        ctx._bioVesicles.rotation.y = t * 0.038;
        ctx._bioVesicles.rotation.x = Math.sin(t * 0.2) * 0.1;
        ctx._bioVesicles.material.opacity = 0.22 + state.open * 0.18;
      }
    },
  });
}
