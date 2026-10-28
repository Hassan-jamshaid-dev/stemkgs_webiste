/**
 * Biology: plant photosynthesizing — leaf, sunlight beams, chlorophyll glow.
 * Tasteful cinematic (not intestine). Instant start; short reduced-motion path.
 * Clear: purple-black #0c0814. Cheap persistent field after unlock.
 */
import { THREE, gsap, budgetCount } from "./core.js";

const CLEAR = 0x0c0814;

/** Soft chlorophyll leaf albedo (opaque RGB). */
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
    const midrib = Math.exp(-Math.abs(nx) * 20) * (0.7 + (1 - Math.abs(ny)) * 0.2);
    const vein =
      Math.exp(-Math.abs(nx - ny * 0.4) * 15) * 0.3 +
      Math.exp(-Math.abs(nx + ny * 0.45) * 17) * 0.24 +
      Math.exp(-Math.abs(nx - ny * 0.9) * 19) * 0.14;
    const v = 0.4 + n * 0.48 + midrib * 0.38 + vein;
    const o = i * 4;
    d[o] = Math.min(255, (32 + v * 75 + midrib * 50) | 0);
    d[o + 1] = Math.min(255, (85 + v * 125 + midrib * 55) | 0);
    d[o + 2] = Math.min(255, (40 + v * 50 + n * 18) | 0);
    d[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  c.globalCompositeOperation = "screen";
  const sheen = c.createRadialGradient(s * 0.36, s * 0.3, 0, s * 0.4, s * 0.36, s * 0.48);
  sheen.addColorStop(0, "rgba(230, 255, 200, 0.5)");
  sheen.addColorStop(0.4, "rgba(160, 220, 140, 0.15)");
  sheen.addColorStop(1, "rgba(100, 160, 80, 0)");
  c.fillStyle = sheen;
  c.fillRect(0, 0, s, s);
  c.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Leaf silhouette alpha for plane cutout. */
function makeLeafAlpha(size) {
  const s = size || 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const c = canvas.getContext("2d", { alpha: true });
  c.clearRect(0, 0, s, s);
  // Hard-ish body so alphaTest keeps leaf solid (not glassy)
  c.fillStyle = "#fff";
  c.beginPath();
  c.moveTo(s * 0.5, s * 0.04);
  c.bezierCurveTo(s * 0.88, s * 0.24, s * 0.94, s * 0.58, s * 0.5, s * 0.96);
  c.bezierCurveTo(s * 0.06, s * 0.58, s * 0.12, s * 0.24, s * 0.5, s * 0.04);
  c.closePath();
  c.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeSoftDisc(size, stops) {
  const s = size || 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const c = canvas.getContext("2d", { alpha: true });
  const g = c.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
  (stops || [
    [0, "rgba(255,255,255,1)"],
    [0.35, "rgba(255,255,255,0.5)"],
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

/** Radial falloff for open cones — soft volumetric shafts. */
function makeConeMap(size) {
  const s = size || 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const c = canvas.getContext("2d", { alpha: true });
  // U wraps around cone; V along length
  for (let y = 0; y < s; y++) {
    const along = 1 - y / (s - 1);
    for (let x = 0; x < s; x++) {
      const u = x / (s - 1);
      const radial = 1 - Math.abs(u - 0.5) * 2;
      const a = Math.pow(Math.max(0, radial), 1.6) * Math.pow(along, 0.55);
      const v = (a * 255) | 0;
      c.fillStyle = "rgba(255,245,210," + a.toFixed(3) + ")";
      c.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeSoftEnv(renderer) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d", { alpha: false });
  const grd = g.createLinearGradient(0, 0, 0, 32);
  grd.addColorStop(0, "#3a2848");
  grd.addColorStop(0.35, "#1a1220");
  grd.addColorStop(1, "#0c0814");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = "rgba(255, 220, 140, 0.9)";
  g.beginPath();
  g.arc(52, 7, 10, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(90, 170, 110, 0.42)";
  g.beginPath();
  g.arc(16, 22, 8, 0, Math.PI * 2);
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
    color: 0x8ed484,
    map: map,
    alphaMap: alpha,
    alphaTest: 0.42,
    transparent: true,
    opacity: 0,
    roughness: 0.46,
    metalness: 0.02,
    emissive: 0x226638,
    emissiveIntensity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  if ("sheen" in mat) {
    mat.sheen = 0.5;
    mat.sheenRoughness = 0.45;
    mat.sheenColor = new THREE.Color(0xc8f0a8);
  }
  if ("clearcoat" in mat) {
    mat.clearcoat = 0.25;
    mat.clearcoatRoughness = 0.42;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, segs, segs), mat);
  const pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(y * 1.5) * 0.08 + x * x * 0.06 - Math.abs(x) * 0.025);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  return mesh;
}

export function createBiologyExperience(mount) {
  let plant = null;
  let leaves = [];
  let leafMats = [];
  let stem = null;
  let stemMat = null;
  let sunCore = null;
  let sunHalo = null;
  let sunBloom = null;
  let beams = [];
  let beamMats = [];
  let shaftPlanes = [];
  let shaftMats = [];
  let motes = null;
  let sparkles = null;
  let leafMap = null;
  let leafAlpha = null;
  let moteMap = null;
  let glowMap = null;
  let coneMap = null;
  const beamDirs = [];

  const state = { pulse: 0.4, dim: 0, photo: 0, camLag: 0 };
  const look = new THREE.Vector3(0.15, 0.55, 0);
  const tmpCamDir = new THREE.Vector3();
  const tmpSide = new THREE.Vector3();
  const tmpFacing = new THREE.Vector3();
  const tmpBeamDir = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpBasis = new THREE.Matrix4();

  function setPersistentLook(ctx) {
    ctx.camera.position.set(0.35, 1.15, 6.4);
    look.set(0.05, 0.45, 0);
    ctx.camera.lookAt(look);
    if (ctx.camera.isPerspectiveCamera) {
      ctx.camera.fov = 42;
      ctx.camera.updateProjectionMatrix();
    }
    if (ctx.scene.fog) {
      ctx.scene.fog.near = 10;
      ctx.scene.fog.far = 36;
    }
  }

  function billboardSun(ctx) {
    if (sunCore) sunCore.quaternion.copy(ctx.camera.quaternion);
    if (sunHalo) sunHalo.quaternion.copy(ctx.camera.quaternion);
    if (sunBloom) sunBloom.quaternion.copy(ctx.camera.quaternion);
  }

  /** Keep soft shaft planes facing the camera around their beam axis. */
  function orientShafts(ctx) {
    ctx.camera.getWorldDirection(tmpCamDir);
    for (let i = 0; i < shaftPlanes.length; i++) {
      const plane = shaftPlanes[i];
      const dir = beamDirs[i];
      if (!plane || !dir) continue;
      tmpBeamDir.copy(dir).normalize();
      tmpSide.crossVectors(tmpBeamDir, tmpCamDir).normalize();
      if (tmpSide.lengthSq() < 1e-4) tmpSide.crossVectors(tmpBeamDir, tmpUp).normalize();
      tmpFacing.crossVectors(tmpBeamDir, tmpSide).normalize();
      tmpBasis.makeBasis(tmpSide, tmpBeamDir, tmpFacing);
      plane.quaternion.setFromRotationMatrix(tmpBasis);
    }
  }

  return mount({
    id: "biology",
    clearColor: CLEAR,
    fogColor: CLEAR,
    fogNear: 4,
    fogFar: 22,
    failSafeMs: 14000,
    build(ctx) {
      leaves = [];
      leafMats = [];
      beams = [];
      beamMats = [];
      shaftPlanes = [];
      shaftMats = [];
      beamDirs.length = 0;

      plant = new THREE.Group();
      ctx.scene.add(plant);
      ctx.track(plant);

      const mapSize = ctx.weak ? 128 : 256;
      leafMap = makeLeafMap(mapSize);
      leafAlpha = makeLeafAlpha(mapSize);
      moteMap = makeSoftDisc(64, [
        [0, "rgba(210,255,180,1)"],
        [0.35, "rgba(150,230,130,0.45)"],
        [1, "rgba(80,160,90,0)"],
      ]);
      glowMap = makeSoftDisc(96, [
        [0, "rgba(255,250,230,1)"],
        [0.3, "rgba(255,225,150,0.55)"],
        [1, "rgba(255,180,80,0)"],
      ]);
      coneMap = makeConeMap(64);
      ctx.track(leafMap);
      ctx.track(leafAlpha);
      ctx.track(moteMap);
      ctx.track(glowMap);
      ctx.track(coneMap);

      if (!ctx.weak) {
        const env = makeSoftEnv(ctx.renderer);
        ctx.scene.environment = env;
        ctx.scene.environmentIntensity = 0.55;
        ctx.track(env);
      }

      const Phys = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
      const segs = ctx.mobile ? 8 : 14;

      stemMat = new THREE.MeshStandardMaterial({
        color: 0x3a6838,
        roughness: 0.8,
        metalness: 0,
        emissive: 0x0e2412,
        emissiveIntensity: 0.28,
        transparent: true,
        opacity: 0,
      });
      stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.07, 2.5, ctx.mobile ? 8 : 14),
        stemMat
      );
      stem.position.set(0, -0.22, 0);
      plant.add(stem);
      ctx.track(stem);

      const leafSpecs = [
        { x: 0.4, y: 0.9, z: 0.12, rx: -0.5, ry: 0.6, rz: 0.3, w: 1.7, h: 2.3, s: 1 },
        { x: -0.48, y: 0.58, z: -0.14, rx: -0.36, ry: -0.74, rz: -0.4, w: 1.48, h: 2.05, s: 0.95 },
        { x: 0.2, y: 0.1, z: 0.26, rx: -0.9, ry: 0.3, rz: 0.1, w: 1.32, h: 1.8, s: 0.88 },
        { x: -0.16, y: 1.25, z: -0.02, rx: -0.2, ry: -0.15, rz: -0.16, w: 1.2, h: 1.65, s: 0.82 },
      ];
      const count = ctx.weak ? 3 : leafSpecs.length;
      for (let i = 0; i < count; i++) {
        const sp = leafSpecs[i];
        const leaf = makeLeafMesh(leafMap, leafAlpha, Phys, sp.w, sp.h, segs);
        leaf.position.set(sp.x, sp.y, sp.z);
        leaf.rotation.set(sp.rx, sp.ry, sp.rz);
        leaf.scale.setScalar(sp.s);
        plant.add(leaf);
        ctx.track(leaf);
        leaves.push(leaf);
        leafMats.push(leaf.material);
      }

      const sunPos = new THREE.Vector3(3.9, 3.6, -1.4);

      sunCore = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 1.05),
        new THREE.MeshBasicMaterial({
          map: glowMap,
          color: 0xfff6d8,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      sunCore.position.copy(sunPos);
      ctx.scene.add(sunCore);
      ctx.track(sunCore);

      sunHalo = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.6),
        new THREE.MeshBasicMaterial({
          map: glowMap,
          color: 0xffd070,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      sunHalo.position.copy(sunPos);
      ctx.scene.add(sunHalo);
      ctx.track(sunHalo);

      sunBloom = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 5.2),
        new THREE.MeshBasicMaterial({
          map: glowMap,
          color: 0xffb848,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      sunBloom.position.copy(sunPos);
      ctx.scene.add(sunBloom);
      ctx.track(sunBloom);

      const plantFocus = new THREE.Vector3(0.15, 0.75, 0.05);

      // Volumetric soft cones (readable from any angle)
      const coneCount = budgetCount(4, 3, 2);
      for (let i = 0; i < coneCount; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: coneMap,
          color: i % 2 ? 0xffe6a0 : 0xfff3cc,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const len = 5.4 + i * 0.35;
        const cone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.55 + i * 0.12, len, 16, 1, true),
          mat
        );
        const target = plantFocus.clone().add(
          new THREE.Vector3(
            (i - (coneCount - 1) * 0.5) * 0.38,
            (i % 3 - 1) * 0.22,
            ((i % 2) - 0.5) * 0.2
          )
        );
        const dir = target.clone().sub(sunPos).normalize();
        const mid = sunPos.clone().addScaledVector(dir, len * 0.5);
        cone.position.copy(mid);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        ctx.scene.add(cone);
        ctx.track(cone);
        beams.push(cone);
        beamMats.push(mat);
      }

      // Extra soft shaft planes (camera-facing around beam axis)
      const shaftCount = budgetCount(3, 2, 2);
      for (let i = 0; i < shaftCount; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: coneMap,
          color: 0xffefc0,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const len = 5.8;
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.85 + i * 0.2, len), mat);
        const target = plantFocus.clone().add(
          new THREE.Vector3((i - 1) * 0.25, (i % 2) * 0.15, 0)
        );
        const dir = target.clone().sub(sunPos).normalize();
        plane.position.copy(sunPos).addScaledVector(dir, len * 0.48);
        beamDirs.push(dir);
        ctx.scene.add(plane);
        ctx.track(plane);
        shaftPlanes.push(plane);
        shaftMats.push(mat);
        beamMats.push(mat);
      }

      const n = budgetCount(110, 64, 40);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 7.5;
        pos[i * 3 + 1] = (Math.random() - 0.3) * 5.2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 5.2;
      }
      motes = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
        new THREE.PointsMaterial({
          map: moteMap,
          color: 0xc8f0a0,
          size: ctx.mobile ? 0.1 : 0.13,
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      ctx.scene.add(motes);
      ctx.track(motes);

      const sn = budgetCount(36, 22, 12);
      const spos = new Float32Array(sn * 3);
      for (let i = 0; i < sn; i++) {
        const t = Math.random();
        spos[i * 3] = THREE.MathUtils.lerp(sunPos.x, 0.2, t) + (Math.random() - 0.5) * 0.45;
        spos[i * 3 + 1] = THREE.MathUtils.lerp(sunPos.y, 0.7, t) + (Math.random() - 0.5) * 0.3;
        spos[i * 3 + 2] = THREE.MathUtils.lerp(sunPos.z, 0, t) + (Math.random() - 0.5) * 0.3;
      }
      sparkles = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(spos, 3)),
        new THREE.PointsMaterial({
          map: glowMap,
          color: 0xfff2c8,
          size: ctx.mobile ? 0.12 : 0.16,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      ctx.scene.add(sparkles);
      ctx.track(sparkles);

      const key = new THREE.DirectionalLight(0xffe8c0, 2.15);
      key.position.copy(sunPos);
      ctx.scene.add(key);
      ctx.track(key);

      const fill = new THREE.PointLight(0x7a96c8, 0.42, 28, 2);
      fill.position.set(-3.4, 0.9, 3.6);
      ctx.scene.add(fill);
      ctx.track(fill);

      const leafGlow = new THREE.PointLight(0x78d882, 0.7, 9, 1.7);
      leafGlow.position.set(0.35, 0.95, 0.7);
      ctx.scene.add(leafGlow);
      ctx.track(leafGlow);

      const hemi = new THREE.HemisphereLight(0xfff2e0, 0x120818, 0.6);
      ctx.scene.add(hemi);
      ctx.track(hemi);

      ctx._bioKey = key;
      ctx._bioFill = fill;
      ctx._bioLeafGlow = leafGlow;

      ctx.camera.position.set(-1.15, 1.48, 2.7);
      look.set(0.4, 0.95, 0.05);
      ctx.camera.lookAt(look);
      if (ctx.camera.isPerspectiveCamera) {
        ctx.camera.fov = 48;
        ctx.camera.updateProjectionMatrix();
      }
      billboardSun(ctx);
      orientShafts(ctx);
    },
    intro(ctx) {
      if (ctx.reduced) {
        const tl = gsap.timeline();
        leafMats.forEach(function (m) {
          if (m) m.opacity = 0.18;
        });
        if (stemMat) stemMat.opacity = 0.14;
        beamMats.forEach(function (m) {
          if (m) m.opacity = 0.07;
        });
        if (sunCore && sunCore.material) sunCore.material.opacity = 0.6;
        if (sunHalo && sunHalo.material) sunHalo.material.opacity = 0.2;
        if (sunBloom && sunBloom.material) sunBloom.material.opacity = 0.07;
        if (motes && motes.material) motes.material.opacity = 0.12;
        if (sparkles && sparkles.material) sparkles.material.opacity = 0.06;
        state.dim = 1;
        state.pulse = 0.25;
        state.photo = 0.3;
        setPersistentLook(ctx);
        billboardSun(ctx);
        orientShafts(ctx);
        tl.to({}, { duration: 0.28 });
        return tl;
      }

      const tl = gsap.timeline();

      leafMats.forEach(function (m, i) {
        tl.to(m, { opacity: 1, duration: 0.75, ease: "power2.out" }, i * 0.04);
      });
      tl.to(stemMat, { opacity: 1, duration: 0.65, ease: "power2.out" }, 0);
      tl.to(sunCore.material, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0);
      tl.to(sunHalo.material, { opacity: 0.78, duration: 0.8, ease: "power2.out" }, 0.04);
      tl.to(sunBloom.material, { opacity: 0.32, duration: 0.95, ease: "power2.out" }, 0.06);

      // Cones + shafts
      for (let i = 0; i < beams.length; i++) {
        tl.to(beamMats[i], { opacity: 0.28 + (i % 2) * 0.06, duration: 1.0, ease: "power2.out" }, 0.1 + i * 0.05);
      }
      shaftMats.forEach(function (m, i) {
        tl.to(m, { opacity: 0.38 + i * 0.04, duration: 1.05, ease: "power2.out" }, 0.14 + i * 0.06);
      });

      tl.to(motes.material, { opacity: 0.4, duration: 0.9 }, 0.08);
      tl.to(sparkles.material, { opacity: 0.72, duration: 1.05 }, 0.16);
      tl.to(state, { pulse: 1, photo: 1, camLag: 1, duration: 0.9 }, 0);

      tl.to(
        ctx.camera.position,
        {
          x: 0.55,
          y: 1.28,
          z: 4.85,
          duration: 5.5,
          ease: "power1.inOut",
          onUpdate() {
            look.set(0.14, 0.68, 0);
            ctx.camera.lookAt(look);
            billboardSun(ctx);
            orientShafts(ctx);
          },
        },
        0.12
      );

      if (ctx.camera.isPerspectiveCamera) {
        tl.to(
          ctx.camera,
          {
            fov: 44,
            duration: 5.3,
            ease: "sine.inOut",
            onUpdate() {
              ctx.camera.updateProjectionMatrix();
            },
          },
          0.18
        );
      }

      tl.to(state, { photo: 1.4, duration: 2.3, ease: "sine.inOut" }, 1.5);
      tl.to(state, { photo: 1.05, duration: 2.0, ease: "sine.inOut" }, 3.9);
      leafMats.forEach(function (m) {
        if (!m) return;
        tl.to(m, { emissiveIntensity: 0.9, duration: 2.1, ease: "sine.inOut" }, 1.7);
        tl.to(m, { emissiveIntensity: 0.48, duration: 1.9, ease: "sine.inOut" }, 4.0);
      });
      if (ctx._bioLeafGlow) {
        tl.to(ctx._bioLeafGlow, { intensity: 1.4, duration: 2.1, ease: "sine.inOut" }, 1.7);
        tl.to(ctx._bioLeafGlow, { intensity: 0.55, duration: 1.9 }, 4.0);
      }

      beamMats.forEach(function (m, i) {
        tl.to(m, { opacity: (m.opacity || 0.3) + 0.12, duration: 1.8, ease: "sine.inOut" }, 1.9 + i * 0.04);
        tl.to(m, { opacity: 0.22, duration: 1.6, ease: "sine.inOut" }, 4.2);
      });

      const arrive = 5.8;
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.55 },
          { opacity: 0.68, scale: 1.26, duration: 0.4, ease: "power2.out" }
        );
      }, arrive);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.48 }, arrive + 0.48);

      leafMats.forEach(function (m) {
        tl.to(
          m,
          { opacity: 0.16, emissiveIntensity: 0.26, duration: 1.15, ease: "power2.inOut" },
          arrive
        );
      });
      tl.to(stemMat, { opacity: 0.1, duration: 1.1 }, arrive);
      beamMats.forEach(function (m) {
        tl.to(m, { opacity: 0.055, duration: 1.15 }, arrive);
      });
      tl.to(sunCore.material, { opacity: 0.48, duration: 1.1 }, arrive);
      tl.to(sunHalo.material, { opacity: 0.15, duration: 1.1 }, arrive);
      tl.to(sunBloom.material, { opacity: 0.05, duration: 1.1 }, arrive);
      tl.to(motes.material, { opacity: 0.13, duration: 1.05 }, arrive + 0.05);
      tl.to(sparkles.material, { opacity: 0.08, duration: 1.0 }, arrive + 0.05);
      tl.to(state, { pulse: 0.28, camLag: 0.1, dim: 1, photo: 0.35, duration: 1.15 }, arrive);

      tl.to(
        ctx.camera.position,
        {
          x: 0.35,
          y: 1.15,
          z: 6.4,
          duration: 1.35,
          ease: "power2.inOut",
          onUpdate() {
            look.set(0.05, 0.45, 0);
            ctx.camera.lookAt(look);
            billboardSun(ctx);
            orientShafts(ctx);
          },
        },
        arrive + 0.1
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
        tl.to(ctx.scene.fog, { near: 10, far: 36, duration: 1.2 }, arrive + 0.05);
      }

      return tl;
    },
    onPersistent(ctx) {
      state.pulse = 0.24;
      state.dim = 1;
      state.camLag = 0;
      state.photo = 0.3;
      leafMats.forEach(function (m) {
        if (!m) return;
        m.opacity = 0.14;
        m.emissiveIntensity = 0.22;
      });
      if (stemMat) stemMat.opacity = 0.09;
      beamMats.forEach(function (m) {
        if (m) m.opacity = 0.05;
      });
      if (sunCore && sunCore.material) sunCore.material.opacity = 0.4;
      if (sunHalo && sunHalo.material) sunHalo.material.opacity = 0.12;
      if (sunBloom && sunBloom.material) sunBloom.material.opacity = 0.04;
      if (motes && motes.material) motes.material.opacity = 0.11;
      if (sparkles && sparkles.material) sparkles.material.opacity = 0.05;
      if (ctx._bioLeafGlow) ctx._bioLeafGlow.intensity = 0.25;
      if (ctx._bioKey) ctx._bioKey.intensity = 0.6;
      setPersistentLook(ctx);
      billboardSun(ctx);
      orientShafts(ctx);
    },
    update(ctx, dt, t) {
      if (!plant) return;

      const sway = state.pulse * (state.dim ? 0.35 : 1);
      plant.rotation.y = Math.sin(t * 0.22) * 0.038 * sway;
      plant.rotation.z = Math.sin(t * 0.18 + 0.5) * 0.016 * sway;

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        const phase = i * 0.7;
        leaf.rotation.z += Math.sin(t * 0.65 + phase) * 0.00032 * sway;
        if (!state.dim && leafMats[i]) {
          leafMats[i].emissiveIntensity =
            0.42 + Math.sin(t * 1.05 + phase) * 0.1 * state.photo;
        }
      }

      billboardSun(ctx);
      orientShafts(ctx);

      if (sunHalo) {
        sunHalo.scale.setScalar(1 + Math.sin(t * 0.85) * 0.045 * (state.dim ? 0.4 : 1));
      }
      if (sunBloom) {
        sunBloom.scale.setScalar(1 + Math.sin(t * 0.6 + 0.4) * 0.03);
      }

      if (motes) {
        motes.rotation.y = t * 0.032;
        motes.position.y = Math.sin(t * 0.2) * 0.07;
      }
      if (sparkles && !state.dim) {
        sparkles.material.opacity = 0.52 + Math.sin(t * 1.35) * 0.15 * state.photo;
      }

      if (ctx._bioLeafGlow && !state.dim) {
        ctx._bioLeafGlow.intensity = 0.55 + Math.sin(t * 0.85) * 0.22 * state.photo;
      }
      if (ctx._bioFill && !state.dim) {
        ctx._bioFill.intensity = 0.36 + Math.sin(t * 0.55) * 0.05;
      }
    },
    disposeExtra() {
      leafMap = null;
      leafAlpha = null;
      moteMap = null;
      glowMap = null;
      coneMap = null;
      leaves = [];
      leafMats = [];
      beams = [];
      beamMats = [];
      shaftPlanes = [];
      shaftMats = [];
      beamDirs.length = 0;
    },
  });
}
