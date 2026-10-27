/**
 * Mathematics: platonic solids assemble from lattice rays — not a code vortex.
 * Palette: deep violet field, soft lilac / cool white edges.
 */
import { THREE, gsap } from "./core.js";

export function createMathsExperience(mount) {
  let group = null;
  let lattice = null;
  let solids = [];
  const state = { assemble: 0, spin: 0.4, glow: 0.55 };

  return mount({
    id: "maths",
    clearColor: 0x0c0818,
    fogColor: 0x0c0818,
    fogNear: 10,
    fogFar: 40,
    build(ctx) {
      group = new THREE.Group();
      ctx.scene.add(group);
      ctx.track(group);

      const forms = [
        { geo: new THREE.IcosahedronGeometry(1.4, 0), color: 0xc4b5fd, y: 0.15, x: 0 },
        { geo: new THREE.OctahedronGeometry(1.05, 0), color: 0x4a8fd4, y: -1.25, x: -2.35 },
        { geo: new THREE.TetrahedronGeometry(0.95, 0), color: 0xa78bfa, y: 1.35, x: 2.25 },
        { geo: new THREE.DodecahedronGeometry(0.72, 0), color: 0xe9d5ff, y: -0.2, x: 0.15 },
      ];

      forms.forEach(function (f, i) {
        const wire = new THREE.Mesh(
          f.geo,
          new THREE.MeshBasicMaterial({
            color: f.color,
            wireframe: true,
            transparent: true,
            opacity: 0.62,
            toneMapped: false,
          })
        );
        wire.position.set(f.x, f.y, (i % 2 ? -0.4 : 0.35));
        wire.scale.setScalar(0.08);
        wire.userData.baseScale = 1;
        group.add(wire);
        solids.push(wire);
        ctx.track(wire);
      });

      const lineCount = ctx.mobile ? 90 : 160;
      const positions = new Float32Array(lineCount * 6);
      for (let i = 0; i < lineCount; i++) {
        const a = i * 6;
        const r = 2.2 + Math.random() * 11;
        const th = Math.random() * Math.PI * 2;
        const ph = (Math.random() - 0.5) * Math.PI;
        positions[a] = Math.cos(th) * Math.cos(ph) * r;
        positions[a + 1] = Math.sin(ph) * r;
        positions[a + 2] = Math.sin(th) * Math.cos(ph) * r;
        positions[a + 3] = positions[a] * 0.12;
        positions[a + 4] = positions[a + 1] * 0.12;
        positions[a + 5] = positions[a + 2] * 0.12;
      }
      const lgeo = new THREE.BufferGeometry();
      lgeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      lattice = new THREE.LineSegments(
        lgeo,
        new THREE.LineBasicMaterial({
          color: 0x7c6cf0,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        })
      );
      group.add(lattice);
      ctx.track(lattice);

      ctx.camera.position.set(0, 0.55, 14.5);
      ctx.camera.lookAt(0, 0, 0);
    },
    intro(ctx) {
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      solids.forEach(function (mesh, i) {
        tl.to(
          mesh.scale,
          { x: 1, y: 1, z: 1, duration: 1.05, ease: "back.out(1.55)" },
          i * 0.16
        );
        tl.to(
          mesh.rotation,
          { y: Math.PI * (1.15 + i * 0.28), x: 0.45 + i * 0.1, duration: 2.3 },
          0
        );
      });
      tl.to(state, { assemble: 1, spin: 0.95, glow: 1, duration: 2.1 }, 0.15);
      tl.to(ctx.camera.position, {
        z: 8.2,
        y: 0.35,
        duration: 2.25,
        onUpdate() { ctx.camera.lookAt(0, 0.15, 0); },
      }, 0);
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.45 },
          { opacity: 0.9, scale: 1.28, duration: 0.4, ease: "power2.out" }
        );
      }, 2.3);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.5 }, 2.65);
      tl.to(ctx.camera.position, {
        z: 12.8,
        y: 0.45,
        duration: 0.95,
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 2.65);
      tl.to(state, { spin: 0.22, glow: 0.45, duration: 0.85 }, 2.65);
      return tl;
    },
    onPersistent(ctx) {
      state.assemble = 1;
      state.spin = 0.14;
      state.glow = 0.35;
      solids.forEach(function (m, i) {
        m.material.opacity = i === 0 ? 0.32 : 0.22;
        m.userData.baseScale = 0.82;
        m.scale.setScalar(0.82);
      });
      if (lattice) lattice.material.opacity = 0.12;
      ctx.camera.position.set(0, 0.4, 13.2);
    },
    update(ctx, dt, t) {
      if (!group) return;
      group.rotation.y += dt * state.spin * 0.32;
      solids.forEach(function (mesh, i) {
        mesh.rotation.x += dt * (0.14 + i * 0.04) * state.spin;
        mesh.rotation.y += dt * (0.18 + i * 0.035) * state.spin;
        const base = mesh.userData.baseScale || 1;
        const breathe = 1 + Math.sin(t * 0.85 + i * 1.1) * 0.04 * state.assemble * state.glow;
        mesh.scale.setScalar(base * breathe);
      });
      if (lattice) {
        lattice.rotation.y = -t * 0.07 * Math.max(0.2, state.spin);
        lattice.rotation.x = Math.sin(t * 0.22) * 0.09;
        lattice.material.opacity = 0.12 + state.assemble * 0.16 * (0.55 + 0.45 * Math.sin(t * 0.6));
      }
    },
  });
}
