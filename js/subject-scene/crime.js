/**
 * Crime: magnifying glass expands into the viewport, then settles into a cheap
 * evidence-dust field behind page content.
 * Palette: deep ink / maroon, amber lens glow, cool forensic cyan accents.
 */
import { THREE, gsap, budgetCount } from "./core.js";

function makeMagnifier(THREERef, mobile) {
  const root = new THREERef.Group();

  // Handle
  const handle = new THREERef.Mesh(
    new THREERef.CylinderGeometry(0.11, 0.14, 2.35, mobile ? 8 : 12),
    new THREERef.MeshStandardMaterial({
      color: 0x3f2a22,
      emissive: 0x1a0e0a,
      emissiveIntensity: 0.2,
      roughness: 0.78,
      metalness: 0.15,
    })
  );
  handle.position.set(1.55, -1.85, 0);
  handle.rotation.z = Math.PI / 4.2;
  root.add(handle);

  const ferrule = new THREERef.Mesh(
    new THREERef.TorusGeometry(0.22, 0.045, 8, mobile ? 16 : 24),
    new THREERef.MeshStandardMaterial({
      color: 0xb45309,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.55,
    })
  );
  ferrule.position.set(0.78, -0.92, 0);
  ferrule.rotation.x = Math.PI / 2;
  ferrule.rotation.z = Math.PI / 4.2;
  root.add(ferrule);

  // Rim
  const rim = new THREERef.Mesh(
    new THREERef.TorusGeometry(1.05, 0.085, 10, mobile ? 28 : 40),
    new THREERef.MeshStandardMaterial({
      color: 0x78716c,
      emissive: 0x292524,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.7,
    })
  );
  root.add(rim);

  // Glass disc — additive so it reads as a lens, not a solid plate
  const glass = new THREERef.Mesh(
    new THREERef.CircleGeometry(0.98, mobile ? 28 : 40),
    new THREERef.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.22,
      blending: THREERef.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREERef.DoubleSide,
    })
  );
  glass.position.z = 0.02;
  root.add(glass);

  const glassGlow = new THREERef.Mesh(
    new THREERef.CircleGeometry(0.72, mobile ? 20 : 28),
    new THREERef.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      blending: THREERef.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREERef.DoubleSide,
    })
  );
  glassGlow.position.z = 0.04;
  root.add(glassGlow);

  // Inner focus ring
  const focus = new THREERef.Mesh(
    new THREERef.RingGeometry(0.42, 0.48, mobile ? 24 : 36),
    new THREERef.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.35,
      blending: THREERef.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREERef.DoubleSide,
    })
  );
  focus.position.z = 0.05;
  root.add(focus);

  return { root, glass, glassGlow, focus, rim, handle };
}

export function createCrimeExperience(mount) {
  let mag = null;
  let dust = null;
  let markers = [];
  const state = { expand: 0, dim: 0, spin: 0.35 };

  return mount({
    id: "crime",
    clearColor: 0x100810,
    fogColor: 0x100810,
    fogNear: 7,
    fogFar: 32,
    build(ctx) {
      mag = makeMagnifier(THREE, ctx.mobile);
      mag.root.scale.setScalar(0.55);
      mag.root.position.set(0.15, 0.35, 0);
      mag.root.rotation.z = -0.18;
      ctx.scene.add(mag.root);
      ctx.track(mag.root);

      // Cheap evidence markers (small discs / ticks) — not a particle storm
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

      const key = new THREE.PointLight(0xfbbf24, 1.15, 26);
      key.position.set(1.2, 2.4, 4);
      ctx.scene.add(key);
      ctx.track(key);
      const fill = new THREE.PointLight(0x67e8f9, 0.35, 30);
      fill.position.set(-3.5, -1.2, 2);
      ctx.scene.add(fill);
      ctx.track(fill);
      const amb = new THREE.AmbientLight(0x2a1520, 0.55);
      ctx.scene.add(amb);
      ctx.track(amb);

      ctx.camera.position.set(0, 0.15, 7.2);
      ctx.camera.lookAt(0, 0.1, 0);
      ctx._crimeKey = key;
    },
    intro(ctx) {
      const tl = gsap.timeline();

      // Settle into frame, then expand the glass until it fills the view
      tl.to(state, { expand: 0.35, spin: 0.55, duration: 0.7, ease: "power2.out" }, 0);
      tl.to(
        mag.root.rotation,
        { z: 0.08, duration: 1.1, ease: "power2.inOut" },
        0
      );
      tl.to(
        mag.root.position,
        { x: 0, y: 0.1, duration: 1.0, ease: "power2.inOut" },
        0.05
      );
      markers.forEach(function (m, i) {
        tl.to(m.material, { opacity: 0.45, duration: 0.45 }, 0.35 + i * 0.05);
      });
      tl.to(dust.material, { opacity: 0.32, duration: 0.8 }, 0.2);

      // Magnifier expands into the screen
      tl.to(
        mag.root.scale,
        { x: 4.6, y: 4.6, z: 4.6, duration: 1.55, ease: "power3.in" },
        0.95
      );
      tl.to(state, { expand: 1, duration: 1.55, ease: "power3.in" }, 0.95);
      tl.to(
        mag.glass.material,
        { opacity: 0.55, duration: 1.2, ease: "power2.in" },
        1.0
      );
      tl.to(
        mag.glassGlow.material,
        { opacity: 0.42, duration: 1.2, ease: "power2.in" },
        1.0
      );
      tl.to(
        mag.focus.material,
        { opacity: 0.08, duration: 1.0 },
        1.15
      );
      tl.to(
        ctx.camera.position,
        {
          z: 3.4,
          x: 0.05,
          y: 0.05,
          duration: 1.55,
          ease: "power3.in",
          onUpdate() {
            ctx.camera.lookAt(0, 0.05, 0);
          },
        },
        0.95
      );

      // Lens-fill splash → reveal page
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.35 },
          { opacity: 1, scale: 1.55, duration: 0.42, ease: "power2.out" }
        );
      }, 2.35);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.5 }, 2.7);

      // Dim into calm persistent field
      tl.to(state, { expand: 0.2, dim: 1, spin: 0.12, duration: 1.0 }, 2.55);
      tl.to(
        mag.root.scale,
        { x: 1.15, y: 1.15, z: 1.15, duration: 1.05, ease: "power2.inOut" },
        2.55
      );
      tl.to(mag.root.position, { x: 2.6, y: -1.4, z: -1.2, duration: 1.05 }, 2.55);
      tl.to(mag.root.rotation, { z: -0.55, duration: 1.05 }, 2.55);
      tl.to(mag.glass.material, { opacity: 0.1, duration: 0.9 }, 2.6);
      tl.to(mag.glassGlow.material, { opacity: 0.06, duration: 0.9 }, 2.6);
      tl.to(mag.focus.material, { opacity: 0.12, duration: 0.9 }, 2.6);
      markers.forEach(function (m) {
        tl.to(m.material, { opacity: 0.1, duration: 0.85 }, 2.65);
      });
      tl.to(dust.material, { opacity: 0.14, duration: 0.9 }, 2.65);
      tl.to(
        ctx.camera.position,
        {
          z: 11.5,
          x: 0,
          y: 0.25,
          duration: 1.1,
          ease: "power2.inOut",
          onUpdate() {
            ctx.camera.lookAt(0, 0, 0);
          },
        },
        2.55
      );
      if (ctx.scene.fog) {
        tl.to(ctx.scene.fog, { near: 11, far: 40, duration: 1.0 }, 2.6);
      }

      return tl;
    },
    onPersistent(ctx) {
      state.expand = 0.15;
      state.dim = 1;
      state.spin = 0.08;
      if (mag) {
        mag.root.scale.setScalar(1.05);
        mag.root.position.set(2.8, -1.55, -1.4);
        mag.root.rotation.z = -0.6;
        mag.glass.material.opacity = 0.07;
        mag.glassGlow.material.opacity = 0.04;
        mag.focus.material.opacity = 0.08;
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
    },
    update(ctx, dt, t) {
      if (!mag) return;
      mag.root.rotation.y = Math.sin(t * 0.22) * 0.04 * state.spin;
      mag.focus.rotation.z += dt * (0.35 + state.expand * 0.8);
      if (mag.glassGlow) {
        mag.glassGlow.scale.setScalar(1 + Math.sin(t * 1.6) * 0.03 * (1 - state.dim * 0.7));
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
