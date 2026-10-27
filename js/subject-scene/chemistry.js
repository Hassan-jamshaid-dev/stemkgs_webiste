/**
 * Chemistry: molecular assembly — atoms, bonds, orbital rings.
 * Palette: charcoal-teal field, soft green / amber accents.
 */
import { THREE, gsap } from "./core.js";

function makeMolecule(THREERef) {
  const root = new THREERef.Group();
  const atomMats = [
    new THREERef.MeshStandardMaterial({
      color: 0x86efac, emissive: 0x14532d, emissiveIntensity: 0.4, roughness: 0.35,
    }),
    new THREERef.MeshStandardMaterial({
      color: 0xfbbf24, emissive: 0x78350f, emissiveIntensity: 0.28, roughness: 0.35,
    }),
    new THREERef.MeshStandardMaterial({
      color: 0x67e8f9, emissive: 0x164e63, emissiveIntensity: 0.32, roughness: 0.4,
    }),
    new THREERef.MeshStandardMaterial({
      color: 0xf9a8d4, emissive: 0x831843, emissiveIntensity: 0.22, roughness: 0.4,
    }),
  ];

  const nodes = [
    [0, 0, 0, 0, 0.55],
    [1.65, 0.62, 0.42, 1, 0.38],
    [-1.5, 0.78, -0.35, 2, 0.4],
    [0.38, -1.52, 0.55, 3, 0.34],
    [-0.55, -0.92, -1.38, 1, 0.32],
    [1.12, -0.35, -1.22, 2, 0.3],
  ];

  const atomMeshes = [];
  nodes.forEach(function (n) {
    const mesh = new THREERef.Mesh(
      new THREERef.SphereGeometry(n[4], 24, 16),
      atomMats[n[3]]
    );
    mesh.position.set(n[0], n[1], n[2]);
    mesh.scale.setScalar(0.01);
    root.add(mesh);
    atomMeshes.push(mesh);
  });

  const bonds = [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [4, 5], [2, 4],
  ];
  const bondMeshes = [];
  bonds.forEach(function (pair) {
    const a = new THREERef.Vector3().fromArray(nodes[pair[0]]);
    const b = new THREERef.Vector3().fromArray(nodes[pair[1]]);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const cyl = new THREERef.Mesh(
      new THREERef.CylinderGeometry(0.055, 0.055, len, 8),
      new THREERef.MeshStandardMaterial({
        color: 0xcbd5e1,
        emissive: 0x334155,
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0,
      })
    );
    cyl.position.copy(mid);
    cyl.quaternion.setFromUnitVectors(
      new THREERef.Vector3(0, 1, 0),
      b.clone().sub(a).normalize()
    );
    root.add(cyl);
    bondMeshes.push(cyl);
  });

  const orbit = new THREERef.Mesh(
    new THREERef.TorusGeometry(2.85, 0.022, 8, 80),
    new THREERef.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.38,
      blending: THREERef.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  orbit.rotation.x = Math.PI / 2.6;
  root.add(orbit);

  const orbit2 = orbit.clone();
  orbit2.rotation.x = Math.PI / 1.7;
  orbit2.rotation.y = 0.6;
  orbit2.material = orbit.material.clone();
  orbit2.material.color.set(0xfbbf24);
  orbit2.material.opacity = 0.28;
  root.add(orbit2);

  return { root, atomMeshes, bondMeshes, orbits: [orbit, orbit2] };
}

export function createChemistryExperience(mount) {
  let mol = null;
  const state = { bloom: 0, spin: 0.55 };

  return mount({
    id: "chemistry",
    clearColor: 0x0a1010,
    fogColor: 0x0a1010,
    fogNear: 9,
    fogFar: 36,
    build(ctx) {
      mol = makeMolecule(THREE);
      mol.root.scale.setScalar(0.85);
      ctx.scene.add(mol.root);
      ctx.track(mol.root);
      mol.atomMeshes.forEach(function (m) { ctx.track(m); });
      mol.bondMeshes.forEach(function (m) { ctx.track(m); });
      mol.orbits.forEach(function (m) { ctx.track(m); });

      const light = new THREE.PointLight(0x86efac, 1.45, 40);
      light.position.set(4, 5, 6);
      ctx.scene.add(light);
      ctx.track(light);
      const fill = new THREE.PointLight(0xfbbf24, 0.75, 40);
      fill.position.set(-5, -2, 4);
      ctx.scene.add(fill);
      ctx.track(fill);
      const amb = new THREE.AmbientLight(0x1a2e28, 0.55);
      ctx.scene.add(amb);
      ctx.track(amb);

      const n = ctx.mobile ? 180 : 380;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }
      const ions = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          color: 0xa7f3d0,
          size: 0.07,
          transparent: true,
          opacity: 0.52,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      ctx.scene.add(ions);
      ctx.track(ions);
      ctx._chemIons = ions;

      ctx.camera.position.set(0, 0.5, 12.5);
      ctx.camera.lookAt(0, 0, 0);
    },
    intro(ctx) {
      const tl = gsap.timeline();
      mol.atomMeshes.forEach(function (atom, i) {
        tl.to(
          atom.scale,
          { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.6)" },
          i * 0.12
        );
      });
      mol.bondMeshes.forEach(function (bond, i) {
        tl.to(bond.material, { opacity: 0.85, duration: 0.45 }, 0.55 + i * 0.06);
      });
      tl.to(state, { bloom: 1, spin: 1.15, duration: 2.0 }, 0);
      tl.to(ctx.camera.position, {
        z: 7.0,
        y: 0.85,
        duration: 2.15,
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 0);
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.45 },
          { opacity: 0.92, scale: 1.3, duration: 0.4, ease: "power2.out" }
        );
      }, 2.15);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.5 }, 2.5);
      tl.to(mol.root.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 0.85 }, 2.5);
      tl.to(ctx.camera.position, {
        z: 11.6,
        y: 0.4,
        duration: 0.95,
        onUpdate() { ctx.camera.lookAt(0, 0, 0); },
      }, 2.5);
      tl.to(state, { spin: 0.22, duration: 0.85 }, 2.5);
      return tl;
    },
    onPersistent() {
      state.spin = 0.16;
      state.bloom = 0.35;
      if (mol) {
        mol.root.scale.setScalar(0.78);
        mol.orbits.forEach(function (o) {
          o.material.opacity = Math.min(o.material.opacity, 0.18);
        });
        mol.bondMeshes.forEach(function (b) {
          b.material.opacity = 0.45;
        });
      }
    },
    update(ctx, dt, t) {
      if (!mol) return;
      mol.root.rotation.y += dt * state.spin * 0.42;
      mol.root.rotation.x = Math.sin(t * 0.32) * 0.11;
      mol.orbits.forEach(function (o, i) {
        o.rotation.z += dt * (0.38 + i * 0.18) * Math.max(0.15, state.spin);
      });
      mol.atomMeshes.forEach(function (atom, i) {
        const s = 1 + Math.sin(t * 2.1 + i) * 0.045 * state.bloom;
        atom.scale.setScalar(s);
      });
      if (ctx._chemIons) {
        ctx._chemIons.rotation.y = t * 0.045;
        ctx._chemIons.material.opacity = 0.22 + state.bloom * 0.2;
      }
    },
  });
}
