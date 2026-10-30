/**
 * Biology: literal plant sprouting — seed in soil → tip emerges → small plant.
 * Tasteful cinematic. Instant start; short reduced-motion path.
 * Clear: purple-black #0c0814. Cheap persistent field after unlock.
 */
import { THREE, gsap, budgetCount } from "./core.js";

const CLEAR = 0x0c0814;

function makeSoftDisc(size, stops) {
  const s = size || 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const c = canvas.getContext("2d", { alpha: true });
  const g = c.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
  (stops || [
    [0, "rgba(255,255,255,1)"],
    [0.4, "rgba(255,255,255,0.45)"],
    [1, "rgba(255,255,255,0)"],
  ]).forEach(function (st) {
    g.addColorStop(st[0], st[1]);
  });
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeSoilMap(size) {
  const s = size || 256;
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

  const mid = s * 0.5;
  for (let i = 0; i < s * s; i++) {
    const x = i % s;
    const y = (i / s) | 0;
    const nx = (x - mid) / mid;
    const ny = (y - mid) / mid;
    const r = Math.sqrt(nx * nx + ny * ny);
    const n =
      valueNoise(x * 0.07, y * 0.07) * 0.5 +
      valueNoise(x * 0.22, y * 0.22) * 0.32 +
      valueNoise(x * 0.55, y * 0.55) * 0.18;
    const edge = Math.max(0, 1 - r * 1.05);
    const v = (0.35 + n * 0.55) * (0.55 + edge * 0.45);
    const o = i * 4;
    d[o] = Math.min(255, (28 + v * 58 + n * 18) | 0);
    d[o + 1] = Math.min(255, (18 + v * 36 + n * 10) | 0);
    d[o + 2] = Math.min(255, (14 + v * 28 + edge * 12) | 0);
    d[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeLeafMap(size) {
  const s = size || 256;
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

  const mid = s * 0.5;
  for (let i = 0; i < s * s; i++) {
    const x = i % s;
    const y = (i / s) | 0;
    const nx = (x - mid) / mid;
    const ny = (y - mid) / mid;
    const n =
      valueNoise(x * 0.08, y * 0.08) * 0.45 +
      valueNoise(x * 0.26, y * 0.26) * 0.35 +
      valueNoise(x * 0.65, y * 0.65) * 0.2;
    const midrib = Math.exp(-Math.abs(nx) * 18) * (0.65 + (1 - Math.abs(ny)) * 0.25);
    const vein =
      Math.exp(-Math.abs(nx - ny * 0.45) * 14) * 0.28 +
      Math.exp(-Math.abs(nx + ny * 0.42) * 16) * 0.22;
    const v = 0.38 + n * 0.5 + midrib * 0.36 + vein;
    const o = i * 4;
    d[o] = Math.min(255, (28 + v * 70 + midrib * 40) | 0);
    d[o + 1] = Math.min(255, (78 + v * 130 + midrib * 50) | 0);
    d[o + 2] = Math.min(255, (36 + v * 48 + n * 14) | 0);
    d[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  c.globalCompositeOperation = "screen";
  const sheen = c.createRadialGradient(s * 0.36, s * 0.3, 0, s * 0.4, s * 0.36, s * 0.48);
  sheen.addColorStop(0, "rgba(220, 255, 190, 0.42)");
  sheen.addColorStop(0.45, "rgba(140, 210, 120, 0.12)");
  sheen.addColorStop(1, "rgba(80, 140, 70, 0)");
  c.fillStyle = sheen;
  c.fillRect(0, 0, s, s);
  c.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeLeafAlpha(size) {
  const s = size || 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const c = canvas.getContext("2d", { alpha: true });
  c.clearRect(0, 0, s, s);
  c.fillStyle = "#fff";
  c.beginPath();
  c.moveTo(s * 0.5, s * 0.04);
  c.bezierCurveTo(s * 0.86, s * 0.22, s * 0.92, s * 0.55, s * 0.5, s * 0.96);
  c.bezierCurveTo(s * 0.08, s * 0.55, s * 0.14, s * 0.22, s * 0.5, s * 0.04);
  c.closePath();
  c.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeSoftEnv(renderer) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d", { alpha: false });
  const grd = g.createLinearGradient(0, 0, 0, 32);
  grd.addColorStop(0, "#2a1c38");
  grd.addColorStop(0.4, "#140e1c");
  grd.addColorStop(1, "#0c0814");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = "rgba(90, 160, 110, 0.35)";
  g.beginPath();
  g.arc(18, 24, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(180, 150, 220, 0.22)";
  g.beginPath();
  g.arc(48, 10, 7, 0, Math.PI * 2);
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

function makeLeafMesh(map, alpha, Phys, w, h, segs) {
  const mat = new Phys({
    color: 0x7ec878,
    map: map,
    alphaMap: alpha,
    alphaTest: 0.42,
    transparent: true,
    opacity: 0,
    roughness: 0.48,
    metalness: 0.02,
    emissive: 0x1a4a28,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  if ("sheen" in mat) {
    mat.sheen = 0.4;
    mat.sheenRoughness = 0.5;
    mat.sheenColor = new THREE.Color(0xb8e898);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, segs, segs), mat);
  const pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(y * 1.4) * 0.06 + x * x * 0.05 - Math.abs(x) * 0.02);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  return mesh;
}

export function createBiologyExperience(mount) {
  let plant = null;
  let soil = null;
  let soilMat = null;
  let seed = null;
  let seedMat = null;
  let stem = null;
  let stemMat = null;
  let tip = null;
  let tipMat = null;
  let leaves = [];
  let leafMats = [];
  let leafBaseRot = [];
  let roots = [];
  let rootMats = [];
  let motes = null;
  let groundGlow = null;
  let leafMap = null;
  let leafAlpha = null;
  let soilMap = null;
  let moteMap = null;
  let glowMap = null;

  const growth = { stem: 0, tip: 0, seedSink: 0, leaf: 0, dim: 0, sway: 1 };
  const look = new THREE.Vector3(0, 0.35, 0);

  const STEM_H = 1.45;
  const STEM_Y0 = -0.22;

  function applyStemGrowth() {
    if (!stem) return;
    const s = Math.max(0.001, growth.stem);
    stem.scale.set(0.55 + s * 0.45, s, 0.55 + s * 0.45);
    stem.position.y = STEM_Y0 + (STEM_H * 0.5) * s;
    if (tip) {
      tip.position.y = STEM_Y0 + STEM_H * s + 0.02;
      tip.scale.setScalar(Math.max(0.001, growth.tip) * (0.55 + s * 0.45));
    }
  }

  function applyLeafGrowth() {
    const t = growth.leaf;
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      const base = leafBaseRot[i];
      const delay = i * 0.14;
      const local = THREE.MathUtils.clamp((t - delay) / Math.max(0.01, 1 - delay * 0.85), 0, 1);
      const ease = local * local * (3 - 2 * local);
      const open = ease;
      leaf.scale.setScalar(0.02 + open * 0.98);
      leaf.rotation.x = base.rx + (1 - open) * 1.15;
      leaf.rotation.z = base.rz + (1 - open) * (i % 2 ? 0.35 : -0.35);
      if (leafMats[i]) leafMats[i].opacity = open;
      // Keep leaves attached near the rising stem tip early, then settle
      const attach = STEM_Y0 + STEM_H * Math.min(1, growth.stem) * (0.55 + i * 0.12);
      leaf.position.y = THREE.MathUtils.lerp(attach, base.y, Math.min(1, open * 1.1));
    }
  }

  function setPersistentLook(ctx) {
    ctx.camera.position.set(0.15, 0.95, 4.9);
    look.set(0, 0.2, 0);
    ctx.camera.lookAt(look);
    if (ctx.camera.isPerspectiveCamera) {
      ctx.camera.fov = 42;
      ctx.camera.updateProjectionMatrix();
    }
    if (ctx.scene.fog) {
      ctx.scene.fog.near = 10;
      ctx.scene.fog.far = 34;
    }
  }

  function showGrownQuiet() {
    growth.stem = 1;
    growth.tip = 0.08;
    growth.seedSink = 1;
    growth.leaf = 1;
    growth.dim = 1;
    growth.sway = 0.3;
    applyStemGrowth();
    applyLeafGrowth();
    if (seedMat) seedMat.opacity = 0;
    if (tipMat) tipMat.opacity = 0;
    if (stemMat) {
      stemMat.opacity = 0.28;
      stemMat.emissiveIntensity = 0.16;
    }
    leafMats.forEach(function (m) {
      if (!m) return;
      m.opacity = 0.32;
      m.emissiveIntensity = 0.22;
    });
    if (soilMat) soilMat.opacity = 0.72;
    rootMats.forEach(function (m) {
      if (m) m.opacity = 0.1;
    });
    if (motes && motes.material) motes.material.opacity = 0.08;
    if (groundGlow && groundGlow.material) groundGlow.material.opacity = 0.06;
  }

  return mount({
    id: "biology",
    clearColor: CLEAR,
    fogColor: CLEAR,
    fogNear: 5,
    fogFar: 18,
    failSafeMs: 12000,
    build(ctx) {
      leaves = [];
      leafMats = [];
      leafBaseRot = [];
      roots = [];
      rootMats = [];

      plant = new THREE.Group();
      ctx.scene.add(plant);
      ctx.track(plant);

      const mapSize = ctx.weak ? 128 : 256;
      leafMap = makeLeafMap(mapSize);
      leafAlpha = makeLeafAlpha(mapSize);
      soilMap = makeSoilMap(mapSize);
      moteMap = makeSoftDisc(64, [
        [0, "rgba(170,230,150,1)"],
        [0.35, "rgba(120,190,110,0.4)"],
        [1, "rgba(60,120,70,0)"],
      ]);
      glowMap = makeSoftDisc(96, [
        [0, "rgba(160,220,140,1)"],
        [0.35, "rgba(100,170,110,0.4)"],
        [1, "rgba(40,90,60,0)"],
      ]);
      ctx.track(leafMap);
      ctx.track(leafAlpha);
      ctx.track(soilMap);
      ctx.track(moteMap);
      ctx.track(glowMap);

      if (!ctx.weak) {
        const env = makeSoftEnv(ctx.renderer);
        ctx.scene.environment = env;
        ctx.scene.environmentIntensity = 0.4;
        ctx.track(env);
      }

      const Phys = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
      const segs = ctx.mobile ? 8 : 12;

      // Soil mound
      soilMat = new THREE.MeshStandardMaterial({
        color: 0x4a3428,
        map: soilMap,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 1,
      });
      soil = new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.48), soilMat);
      soil.position.set(0, -1.05, 0);
      soil.scale.set(1.15, 0.55, 1.05);
      plant.add(soil);
      ctx.track(soil);

      const soilRim = new THREE.Mesh(
        new THREE.CircleGeometry(1.7, 40),
        new THREE.MeshStandardMaterial({
          color: 0x2a1c18,
          map: soilMap,
          roughness: 1,
          metalness: 0,
          transparent: true,
          opacity: 0.9,
        })
      );
      soilRim.rotation.x = -Math.PI / 2;
      soilRim.position.y = -1.02;
      plant.add(soilRim);
      ctx.track(soilRim);
      ctx._bioSoilRim = soilRim;

      // Seed
      seedMat = new THREE.MeshStandardMaterial({
        color: 0xc4a06a,
        roughness: 0.68,
        metalness: 0.04,
        emissive: 0x4a3010,
        emissiveIntensity: 0.28,
        transparent: true,
        opacity: 1,
      });
      seed = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), seedMat);
      seed.scale.set(1.25, 0.85, 1.05);
      // Sit on mound peak (~y -0.2); later sinks slightly into soil
      seed.position.set(0.02, -0.12, 0.08);
      seed.rotation.z = 0.45;
      plant.add(seed);
      ctx.track(seed);

      // Fine roots (subtle, under soil surface)
      const rootSpecs = [
        { x: 0.1, z: 0.14, ry: 0.4, len: 0.5 },
        { x: -0.14, z: -0.08, ry: -0.7, len: 0.44 },
        { x: 0.06, z: -0.16, ry: 1.2, len: 0.4 },
      ];
      const rootN = ctx.weak ? 2 : rootSpecs.length;
      for (let i = 0; i < rootN; i++) {
        const sp = rootSpecs[i];
        const mat = new THREE.MeshStandardMaterial({
          color: 0x6a5040,
          roughness: 0.9,
          transparent: true,
          opacity: 0,
        });
        const root = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.028, sp.len, 6),
          mat
        );
        root.position.set(sp.x, -0.35 - sp.len * 0.2, sp.z);
        root.rotation.z = 0.95 + i * 0.12;
        root.rotation.y = sp.ry;
        root.scale.set(1, 0.01, 1);
        plant.add(root);
        ctx.track(root);
        roots.push(root);
        rootMats.push(mat);
      }

      // Stem — grows via scale.y from soil
      stemMat = new THREE.MeshStandardMaterial({
        color: 0x3d6a3a,
        roughness: 0.78,
        metalness: 0,
        emissive: 0x0e2412,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0,
      });
      stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.048, STEM_H, ctx.mobile ? 8 : 14),
        stemMat
      );
      // Stem emerges from just under the mound surface
      stem.position.set(0, STEM_Y0, 0);
      stem.scale.set(0.55, 0.001, 0.55);
      plant.add(stem);
      ctx.track(stem);

      // Cotyledon / sprout tip (visible first)
      tipMat = new THREE.MeshStandardMaterial({
        color: 0x9ad878,
        roughness: 0.45,
        metalness: 0,
        emissive: 0x3a8040,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0,
      });
      tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), tipMat);
      tip.scale.setScalar(0.001);
      tip.position.set(0, STEM_Y0, 0);
      plant.add(tip);
      ctx.track(tip);

      // Leaves of a small plant (y relative to soil peak ~-0.2)
      const leafSpecs = [
        { x: 0.28, y: 0.72, z: 0.08, rx: -0.55, ry: 0.7, rz: 0.25, w: 0.95, h: 1.25 },
        { x: -0.32, y: 0.58, z: -0.1, rx: -0.4, ry: -0.85, rz: -0.3, w: 0.88, h: 1.15 },
        { x: 0.12, y: 1.0, z: -0.05, rx: -0.25, ry: 0.2, rz: 0.12, w: 0.72, h: 0.95 },
        { x: -0.1, y: 0.38, z: 0.18, rx: -0.85, ry: -0.25, rz: -0.15, w: 0.78, h: 1.05 },
      ];
      const count = ctx.weak ? 3 : leafSpecs.length;
      for (let i = 0; i < count; i++) {
        const sp = leafSpecs[i];
        const leaf = makeLeafMesh(leafMap, leafAlpha, Phys, sp.w, sp.h, segs);
        leaf.position.set(sp.x, sp.y, sp.z);
        leaf.rotation.set(sp.rx, sp.ry, sp.rz);
        leaf.scale.setScalar(0.02);
        plant.add(leaf);
        ctx.track(leaf);
        leaves.push(leaf);
        leafMats.push(leaf.material);
        leafBaseRot.push({ rx: sp.rx, ry: sp.ry, rz: sp.rz, y: sp.y });
      }

      groundGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshBasicMaterial({
          map: glowMap,
          color: 0x6ab070,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      groundGlow.rotation.x = -Math.PI / 2;
      groundGlow.position.y = -0.98;
      ctx.scene.add(groundGlow);
      ctx.track(groundGlow);

      const n = budgetCount(48, 28, 16);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 4.5;
        pos[i * 3 + 1] = Math.random() * 2.8 - 0.4;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
      }
      motes = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          map: moteMap,
          color: 0xb8e8a0,
          size: ctx.mobile ? 0.08 : 0.1,
          transparent: true,
          opacity: 0.06,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      ctx.scene.add(motes);
      ctx.track(motes);

      const key = new THREE.DirectionalLight(0xffe8d8, 1.55);
      key.position.set(2.8, 4.2, 2.2);
      ctx.scene.add(key);
      ctx.track(key);

      const fill = new THREE.PointLight(0x6a7ab0, 0.35, 22, 2);
      fill.position.set(-3.2, 1.2, 3.2);
      ctx.scene.add(fill);
      ctx.track(fill);

      const plantGlow = new THREE.PointLight(0x68c878, 0.55, 7, 1.8);
      plantGlow.position.set(0.15, 0.6, 0.55);
      ctx.scene.add(plantGlow);
      ctx.track(plantGlow);

      const hemi = new THREE.HemisphereLight(0xe8e0f0, 0x100812, 0.55);
      ctx.scene.add(hemi);
      ctx.track(hemi);

      ctx._bioKey = key;
      ctx._bioFill = fill;
      ctx._bioPlantGlow = plantGlow;

      // Close on the seed — instant first frame
      ctx.camera.position.set(0.65, 0.35, 2.05);
      look.set(0.02, -0.12, 0);
      ctx.camera.lookAt(look);
      if (ctx.camera.isPerspectiveCamera) {
        ctx.camera.fov = 46;
        ctx.camera.updateProjectionMatrix();
      }
    },
    intro(ctx) {
      if (ctx.reduced) {
        const tl = gsap.timeline();
        showGrownQuiet();
        setPersistentLook(ctx);
        if (ctx._bioKey) ctx._bioKey.intensity = 0.55;
        if (ctx._bioPlantGlow) ctx._bioPlantGlow.intensity = 0.2;
        tl.to({}, { duration: 0.28 });
        return tl;
      }

      const tl = gsap.timeline();

      // Soil + seed already visible on first frame — atmosphere fades in
      tl.to(groundGlow.material, { opacity: 0.2, duration: 0.65, ease: "power2.out" }, 0);
      tl.to(motes.material, { opacity: 0.2, duration: 0.75 }, 0.02);

      // Seed rests, then settles slightly into soil
      tl.to(
        seed.position,
        { y: -0.32, duration: 1.15, ease: "power2.inOut" },
        0.55
      );
      tl.to(
        seed.rotation,
        { z: 0.08, x: 0.28, duration: 1.15, ease: "power2.inOut" },
        0.55
      );
      tl.to(growth, { seedSink: 1, duration: 1.15, ease: "power2.inOut" }, 0.55);
      tl.to(seed.scale, { x: 1.1, y: 0.55, z: 0.95, duration: 0.95, ease: "power2.in" }, 0.75);

      // Roots push out
      for (let i = 0; i < roots.length; i++) {
        tl.to(rootMats[i], { opacity: 0.55, duration: 0.7, ease: "power2.out" }, 1.05 + i * 0.08);
        tl.to(roots[i].scale, { y: 1, duration: 0.85, ease: "power2.out" }, 1.05 + i * 0.08);
      }

      // Green tip breaks soil
      tl.to(tipMat, { opacity: 1, duration: 0.35, ease: "power2.out" }, 1.55);
      tl.to(growth, { tip: 1, duration: 0.55, ease: "back.out(1.6)", onUpdate: applyStemGrowth }, 1.55);
      tl.to(stemMat, { opacity: 1, duration: 0.4 }, 1.65);

      // Stem rises
      tl.to(
        growth,
        {
          stem: 1,
          duration: 2.4,
          ease: "power2.out",
          onUpdate: applyStemGrowth,
        },
        1.75
      );
      tl.to(tipMat, { opacity: 0.2, duration: 1.2, ease: "power1.out" }, 2.7);
      tl.to(growth, { tip: 0.2, duration: 1.0, onUpdate: applyStemGrowth }, 2.9);

      // Seed fades as plant takes focus
      tl.to(seedMat, { opacity: 0, duration: 0.9, ease: "power2.in" }, 2.4);

      // Leaves unfurl into a small plant
      tl.to(
        growth,
        {
          leaf: 1,
          duration: 2.2,
          ease: "power2.out",
          onUpdate: applyLeafGrowth,
        },
        2.7
      );
      leafMats.forEach(function (m, i) {
        tl.to(m, { emissiveIntensity: 0.55, duration: 1.2, ease: "sine.out" }, 3.0 + i * 0.08);
      });
      if (ctx._bioPlantGlow) {
        tl.to(ctx._bioPlantGlow, { intensity: 1.05, duration: 1.6, ease: "sine.out" }, 2.8);
      }

      // Camera: seed close-up → rise with sprout → gentle pull-back
      tl.to(
        ctx.camera.position,
        {
          x: 0.4,
          y: 0.55,
          z: 2.6,
          duration: 2.2,
          ease: "power1.inOut",
          onUpdate() {
            look.set(0.02, -0.05 + growth.stem * 0.55, 0);
            ctx.camera.lookAt(look);
          },
        },
        0.15
      );
      tl.to(
        ctx.camera.position,
        {
          x: 0.35,
          y: 0.95,
          z: 3.6,
          duration: 2.6,
          ease: "power1.inOut",
          onUpdate() {
            look.set(0.02, 0.2 + growth.stem * 0.35, 0);
            ctx.camera.lookAt(look);
          },
        },
        2.2
      );

      const arrive = 5.7;
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.55 },
          { opacity: 0.62, scale: 1.22, duration: 0.38, ease: "power2.out" }
        );
      }, arrive);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.45 }, arrive + 0.42);

      // Settle to quiet persistent field (plant still readable)
      leafMats.forEach(function (m) {
        tl.to(
          m,
          { opacity: 0.32, emissiveIntensity: 0.22, duration: 1.1, ease: "power2.inOut" },
          arrive
        );
      });
      tl.to(stemMat, { opacity: 0.28, emissiveIntensity: 0.16, duration: 1.05 }, arrive);
      tl.to(tipMat, { opacity: 0, duration: 0.8 }, arrive);
      tl.to(soilMat, { opacity: 0.72, duration: 1.05 }, arrive);
      if (ctx._bioSoilRim && ctx._bioSoilRim.material) {
        tl.to(ctx._bioSoilRim.material, { opacity: 0.55, duration: 1.05 }, arrive);
      }
      rootMats.forEach(function (m) {
        tl.to(m, { opacity: 0.1, duration: 1.0 }, arrive);
      });
      tl.to(motes.material, { opacity: 0.08, duration: 1.0 }, arrive + 0.05);
      tl.to(groundGlow.material, { opacity: 0.06, duration: 1.0 }, arrive);
      tl.to(growth, { dim: 1, sway: 0.3, tip: 0.08, duration: 1.1, onUpdate: applyStemGrowth }, arrive);
      if (ctx._bioPlantGlow) {
        tl.to(ctx._bioPlantGlow, { intensity: 0.2, duration: 1.05 }, arrive);
      }
      if (ctx._bioKey) {
        tl.to(ctx._bioKey, { intensity: 0.55, duration: 1.05 }, arrive);
      }

      tl.to(
        ctx.camera.position,
        {
          x: 0.15,
          y: 0.95,
          z: 4.9,
          duration: 1.35,
          ease: "power2.inOut",
          onUpdate() {
            look.set(0, 0.2, 0);
            ctx.camera.lookAt(look);
          },
        },
        arrive + 0.08
      );

      if (ctx.camera.isPerspectiveCamera) {
        tl.to(
          ctx.camera,
          {
            fov: 42,
            duration: 1.2,
            onUpdate() {
              ctx.camera.updateProjectionMatrix();
            },
          },
          arrive
        );
      }

      if (ctx.scene.fog) {
        tl.to(ctx.scene.fog, { near: 10, far: 34, duration: 1.15 }, arrive + 0.05);
      }

      return tl;
    },
    onPersistent(ctx) {
      showGrownQuiet();
      if (ctx._bioKey) ctx._bioKey.intensity = 0.5;
      if (ctx._bioFill) ctx._bioFill.intensity = 0.22;
      if (ctx._bioPlantGlow) ctx._bioPlantGlow.intensity = 0.18;
      if (ctx._bioSoilRim && ctx._bioSoilRim.material) {
        ctx._bioSoilRim.material.opacity = 0.55;
      }
      setPersistentLook(ctx);
    },
    update(ctx, dt, t) {
      if (!plant) return;

      const sway = growth.sway * (growth.dim ? 0.4 : 1);
      plant.rotation.y = Math.sin(t * 0.2) * 0.028 * sway;
      plant.rotation.z = Math.sin(t * 0.16 + 0.4) * 0.012 * sway;

      if (stem && growth.stem > 0.05 && !growth.dim) {
        stem.rotation.z = Math.sin(t * 0.7) * 0.02 * growth.stem;
      }

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        const phase = i * 0.75;
        leaf.rotation.z += Math.sin(t * 0.6 + phase) * 0.00028 * sway;
        if (!growth.dim && leafMats[i] && growth.leaf > 0.2) {
          leafMats[i].emissiveIntensity =
            0.32 + Math.sin(t * 0.95 + phase) * 0.08;
        }
      }

      if (motes) {
        motes.rotation.y = t * 0.028;
        motes.position.y = Math.sin(t * 0.18) * 0.05;
      }

      if (groundGlow && !growth.dim) {
        groundGlow.material.opacity = 0.16 + Math.sin(t * 0.7) * 0.04;
      }

      if (ctx._bioPlantGlow && !growth.dim) {
        ctx._bioPlantGlow.intensity = 0.45 + Math.sin(t * 0.8) * 0.18 * growth.leaf;
      }
    },
    disposeExtra() {
      leafMap = null;
      leafAlpha = null;
      soilMap = null;
      moteMap = null;
      glowMap = null;
      leaves = [];
      leafMats = [];
      leafBaseRot = [];
      roots = [];
      rootMats = [];
    },
  });
}
