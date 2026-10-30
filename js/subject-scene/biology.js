/**
 * Biology: sketched plant sprouting — seed → stem → branches → leaves (line / sketch).
 * Matches maths quadratic intro: Line / LineSegments / Points only, readable, no mesh mush.
 * Palette: purple-black #0c0814 / cool white / soft green-lilac accents.
 * Instant start; total intro ≤ 4s; reduced-motion short path; cheap persistent field after.
 */
import { THREE, gsap, budgetCount } from "./core.js";

const CLEAR = 0x0c0814;

/** Soft undulating soil horizon in the x–y plane. */
function sampleSoil(xMin, xMax, segments, y0, amp) {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = xMin + (xMax - xMin) * t;
    const y = y0 + amp * Math.sin(t * Math.PI * 3.2) * (1 - Math.abs(t * 2 - 1) * 0.4);
    const o = i * 3;
    pts[o] = x;
    pts[o + 1] = y;
    pts[o + 2] = 0;
  }
  return pts;
}

/** Stem grows from soil; slight 3D wobble for sketch depth. */
function sampleStem(height, segments, wobble) {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = t * height;
    const x = wobble * Math.sin(t * Math.PI * 1.6) * t;
    const z = wobble * 0.55 * Math.sin(t * Math.PI * 2.1) * (1 - t * 0.35);
    const o = i * 3;
    pts[o] = x;
    pts[o + 1] = y;
    pts[o + 2] = z;
  }
  return pts;
}

function stemPoint(height, wobble, frac) {
  const t = THREE.MathUtils.clamp(frac, 0, 1);
  return {
    x: wobble * Math.sin(t * Math.PI * 1.6) * t,
    y: t * height,
    z: wobble * 0.55 * Math.sin(t * Math.PI * 2.1) * (1 - t * 0.35),
  };
}

/**
 * Side branch stroke — maths-curve energy, arcs out from the stem.
 * open 0→1 draws length along the branch.
 */
function sampleBranch(side, length, lift, open, segments, attach) {
  const n = Math.max(4, segments);
  const pts = new Float32Array((n + 1) * 3);
  const L = length * Math.max(0.001, open);
  const sx = side;

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const along = t * L;
    const arch = Math.sin(t * Math.PI * 0.85) * 0.22;
    const droop = Math.sin(t * Math.PI) * 0.06;
    const x = attach.x + sx * (along * 0.88 + arch * 0.35);
    const y = attach.y + along * lift + arch * 0.45 - droop;
    const z = attach.z + sx * along * 0.18 + Math.sin(t * Math.PI) * 0.05 * sx;
    const o = i * 3;
    pts[o] = x;
    pts[o + 1] = y;
    pts[o + 2] = z;
  }
  return pts;
}

function branchTip(side, length, lift, open, attach) {
  const t = 1;
  const L = length * Math.max(0.001, open);
  const along = t * L;
  const arch = Math.sin(t * Math.PI * 0.85) * 0.22;
  const droop = Math.sin(t * Math.PI) * 0.06;
  return {
    x: attach.x + side * (along * 0.88 + arch * 0.35),
    y: attach.y + along * lift + arch * 0.45 - droop,
    z: attach.z + side * along * 0.18 + Math.sin(t * Math.PI) * 0.05 * side,
  };
}

/**
 * Single leaf outline as a closed-ish stroke: midrib out to tip, back along edge.
 * open 0→1 unfurls length and width.
 */
function sampleLeaf(side, length, width, open, segments, attach) {
  const n = Math.max(4, segments);
  // midrib + return edge ≈ 2n+1 points (open polyline that reads as a leaf stroke)
  const count = n * 2 + 1;
  const pts = new Float32Array(count * 3);
  const L = length * Math.max(0.001, open);
  const W = width * Math.max(0.001, open);
  const sx = side;

  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const along = t * L;
    const flare = Math.sin(t * Math.PI) * W * (0.55 + 0.45 * open);
    const x = attach.x + sx * (along * 0.72 + flare * 0.15);
    const y = attach.y + along * 0.55 + flare * 0.08;
    const z = attach.z + sx * flare * 0.35 + Math.sin(t * Math.PI) * 0.04;
    const o = i * 3;
    pts[o] = x;
    pts[o + 1] = y;
    pts[o + 2] = z;
  }
  // return along the lower edge toward the petiole
  for (let i = 1; i <= n; i++) {
    const t = 1 - i / n;
    const along = t * L;
    const flare = Math.sin(t * Math.PI) * W * (0.55 + 0.45 * open) * 0.92;
    const x = attach.x + sx * (along * 0.72 - flare * 0.55);
    const y = attach.y + along * 0.5 - flare * 0.12;
    const z = attach.z - sx * flare * 0.28;
    const o = (n + i) * 3;
    pts[o] = x;
    pts[o + 1] = y;
    pts[o + 2] = z;
  }
  return pts;
}

/** Tiny seed as an ellipse stroke sitting on the soil. */
function sampleSeed(cx, cy, rx, ry, segments) {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const o = i * 3;
    pts[o] = cx + Math.cos(a) * rx;
    pts[o + 1] = cy + Math.sin(a) * ry;
    pts[o + 2] = 0.02;
  }
  return pts;
}

function setLinePositions(line, pts) {
  const attr = line.geometry.getAttribute("position");
  attr.array.set(pts);
  attr.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

function smoothstep01(x) {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

export function createBiologyExperience(mount) {
  const STEM_H = 2.35;
  const WOBBLE = 0.22;
  const SOIL_Y = -0.15;

  let plant = null;
  let soilLine = null;
  let soilGlow = null;
  let stemCore = null;
  let stemGlow = null;
  let seedLine = null;
  let branchCores = [];
  let branchGlows = [];
  let leafCores = [];
  let leafGlows = [];
  let beads = null;
  let lookTarget = new THREE.Vector3(0, 0.4, 0);

  const state = {
    grow: 0,
    branch: 0,
    leaf: 0,
    seedFade: 0,
    drop: 0,
    glow: 1,
    camDist: 4.2,
    camLift: 0.55,
  };

  // Side branch strokes — fuller canopy silhouette without mesh bulk
  const branchSpecs = [
    { side: 1, heightFrac: 0.4, length: 0.82, lift: 0.38, delay: 0 },
    { side: -1, heightFrac: 0.55, length: 0.95, lift: 0.48, delay: 0.1 },
    { side: 1, heightFrac: 0.7, length: 0.68, lift: 0.52, delay: 0.18 },
  ];

  // Leaves attach on stem or at a branch tip (branch ≥ 0)
  const leafSpecs = [
    { side: 1, length: 1.12, width: 0.54, delay: 0, attachFrac: 0.9, branch: -1 },
    { side: -1, length: 1.05, width: 0.5, delay: 0.06, attachFrac: 0.86, branch: -1 },
    { side: 1, length: 0.78, width: 0.4, delay: 0.12, attachFrac: 0.4, branch: 0 },
    { side: -1, length: 0.88, width: 0.44, delay: 0.16, attachFrac: 0.55, branch: 1 },
    { side: 1, length: 0.62, width: 0.32, delay: 0.22, attachFrac: 0.7, branch: 2 },
    { side: -1, length: 0.58, width: 0.3, delay: 0.28, attachFrac: 0.76, branch: -1 },
  ];

  function rebuildStem() {
    if (!stemCore) return;
    const h = STEM_H * Math.max(0.001, state.grow);
    const segs = stemCore.userData.segs;
    const pts = sampleStem(h, segs, WOBBLE);
    setLinePositions(stemCore, pts);
    if (stemGlow) {
      setLinePositions(stemGlow, sampleStem(h, segs, WOBBLE * 1.08));
    }
  }

  function branchOpen(i) {
    const sp = branchSpecs[i];
    if (!sp) return 0;
    return smoothstep01(
      (state.branch - sp.delay) / Math.max(0.01, 1 - sp.delay)
    );
  }

  function rebuildBranches() {
    const h = STEM_H * Math.max(0.001, state.grow);
    for (let i = 0; i < branchCores.length; i++) {
      const sp = branchSpecs[i];
      const open = branchOpen(i);
      // Gate on stem having reached the fork so branches sprout from living wood
      const stemGate = THREE.MathUtils.clamp((state.grow - sp.heightFrac * 0.85) / 0.2, 0, 1);
      const draw = open * stemGate;
      const attach = stemPoint(h, WOBBLE, sp.heightFrac);
      const segs = branchCores[i].userData.segs;
      const pts = sampleBranch(sp.side, sp.length, sp.lift, Math.max(0.001, draw), segs, attach);
      setLinePositions(branchCores[i], pts);
      if (branchGlows[i]) {
        setLinePositions(
          branchGlows[i],
          sampleBranch(sp.side, sp.length * 1.03, sp.lift, Math.max(0.001, draw), segs, attach)
        );
      }
      branchCores[i].material.opacity = draw < 0.02 ? 0 : 0.2 + draw * 0.72;
      if (branchGlows[i]) {
        branchGlows[i].material.opacity = draw < 0.02 ? 0 : 0.06 + draw * 0.28;
      }
    }
  }

  function leafAttach(sp) {
    const h = STEM_H * Math.max(0.001, state.grow);
    if (sp.branch >= 0 && sp.branch < branchSpecs.length) {
      const bs = branchSpecs[sp.branch];
      const open = Math.max(0.001, branchOpen(sp.branch));
      const base = stemPoint(h, WOBBLE, bs.heightFrac);
      return branchTip(bs.side, bs.length * 0.92, bs.lift, open, base);
    }
    return stemPoint(h, WOBBLE, sp.attachFrac);
  }

  function rebuildLeaves() {
    for (let i = 0; i < leafCores.length; i++) {
      const sp = leafSpecs[i];
      const local = smoothstep01(
        (state.leaf - sp.delay) / Math.max(0.01, 1 - sp.delay)
      );
      const open = local;
      const attach = leafAttach(sp);
      const segs = leafCores[i].userData.segs;
      const pts = sampleLeaf(sp.side, sp.length, sp.width, open, segs, attach);
      setLinePositions(leafCores[i], pts);
      if (leafGlows[i]) {
        setLinePositions(
          leafGlows[i],
          sampleLeaf(sp.side, sp.length * 1.02, sp.width * 1.05, open, segs, attach)
        );
      }
      leafCores[i].material.opacity = open < 0.02 ? 0 : 0.15 + open * 0.8;
      if (leafGlows[i]) leafGlows[i].material.opacity = open < 0.02 ? 0 : 0.05 + open * 0.32;
    }
  }

  function rebuildPlant() {
    rebuildStem();
    rebuildBranches();
    rebuildLeaves();
  }

  function setCamera(ctx) {
    const tipY = STEM_H * state.grow * 0.55 + 0.15;
    const liveX = 0.55;
    const liveY = SOIL_Y + 0.35 + tipY * 0.55 + state.camLift * (0.4 + state.grow * 0.6);
    const liveZ = state.camDist;

    const settleX = 0;
    const settleY = 1.15;
    const settleZ = 9.5;
    const d = state.drop;

    ctx.camera.position.set(
      liveX * (1 - d) + settleX * d,
      liveY * (1 - d) + settleY * d,
      liveZ * (1 - d) + settleZ * d
    );

    lookTarget.set(
      0.02 * (1 - d),
      (SOIL_Y + 0.2 + tipY * 0.85) * (1 - d) + 0.55 * d,
      0
    );
    ctx.camera.lookAt(lookTarget);
  }

  function showGrownQuiet() {
    state.grow = 1;
    state.branch = 1;
    state.leaf = 1;
    state.seedFade = 1;
    state.drop = 1;
    state.glow = 0.22;
    rebuildPlant();
    if (stemCore) stemCore.material.opacity = 0.18;
    if (stemGlow) stemGlow.material.opacity = 0.08;
    if (seedLine) seedLine.material.opacity = 0;
    if (soilLine) soilLine.material.opacity = 0.14;
    if (soilGlow) soilGlow.material.opacity = 0.06;
    if (beads) beads.material.opacity = 0.1;
    branchCores.forEach(function (l) {
      if (l) l.material.opacity = 0.15;
    });
    branchGlows.forEach(function (l) {
      if (l) l.material.opacity = 0.055;
    });
    leafCores.forEach(function (l) {
      if (l) l.material.opacity = 0.16;
    });
    leafGlows.forEach(function (l) {
      if (l) l.material.opacity = 0.06;
    });
  }

  return mount({
    id: "biology",
    clearColor: CLEAR,
    fogColor: CLEAR,
    fogNear: 12,
    fogFar: 42,
    build(ctx) {
      branchCores = [];
      branchGlows = [];
      leafCores = [];
      leafGlows = [];

      plant = new THREE.Group();
      // Lift so soil sits near origin visually
      plant.position.y = SOIL_Y;
      ctx.scene.add(plant);
      ctx.track(plant);

      const soilSegs = budgetCount(48, 32, 20);
      const soilPts = sampleSoil(-6.5, 6.5, soilSegs, 0, 0.12);
      const soilGeo = new THREE.BufferGeometry();
      soilGeo.setAttribute("position", new THREE.BufferAttribute(soilPts, 3));
      soilLine = new THREE.Line(
        soilGeo,
        new THREE.LineBasicMaterial({
          color: 0xc8b8e8,
          transparent: true,
          opacity: 0.55,
          toneMapped: false,
        })
      );
      plant.add(soilLine);
      ctx.track(soilLine);

      const soilGlowPts = sampleSoil(-6.5, 6.5, soilSegs, -0.04, 0.14);
      const soilGlowGeo = new THREE.BufferGeometry();
      soilGlowGeo.setAttribute("position", new THREE.BufferAttribute(soilGlowPts, 3));
      soilGlow = new THREE.Line(
        soilGlowGeo,
        new THREE.LineBasicMaterial({
          color: 0x5a4878,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      plant.add(soilGlow);
      ctx.track(soilGlow);

      // Seed sketch — visible on first frame
      const seedSegs = budgetCount(28, 20, 14);
      const seedPts = sampleSeed(0.02, 0.08, 0.16, 0.1, seedSegs);
      const seedGeo = new THREE.BufferGeometry();
      seedGeo.setAttribute("position", new THREE.BufferAttribute(seedPts, 3));
      seedLine = new THREE.Line(
        seedGeo,
        new THREE.LineBasicMaterial({
          color: 0xe8d8b8,
          transparent: true,
          opacity: 0.9,
          toneMapped: false,
        })
      );
      plant.add(seedLine);
      ctx.track(seedLine);

      const stemSegs = budgetCount(40, 28, 18);
      const stemPts = sampleStem(0.001, stemSegs, WOBBLE);
      const stemGeo = new THREE.BufferGeometry();
      stemGeo.setAttribute("position", new THREE.BufferAttribute(stemPts.slice(), 3));
      stemCore = new THREE.Line(
        stemGeo,
        new THREE.LineBasicMaterial({
          color: 0xd8f0d0,
          transparent: true,
          opacity: 0.95,
          toneMapped: false,
        })
      );
      stemCore.userData.segs = stemSegs;
      plant.add(stemCore);
      ctx.track(stemCore);

      const stemGlowGeo = new THREE.BufferGeometry();
      stemGlowGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(sampleStem(0.001, stemSegs, WOBBLE * 1.08), 3)
      );
      stemGlow = new THREE.Line(
        stemGlowGeo,
        new THREE.LineBasicMaterial({
          color: 0x6a9a70,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      stemGlow.userData.segs = stemSegs;
      stemGlow.scale.set(1.02, 1.02, 1.02);
      plant.add(stemGlow);
      ctx.track(stemGlow);

      const branchSegs = budgetCount(16, 12, 8);
      const branchN = ctx.weak ? 2 : branchSpecs.length;
      for (let i = 0; i < branchN; i++) {
        const sp = branchSpecs[i];
        const attach0 = { x: 0, y: 0.01, z: 0 };
        const pts = sampleBranch(sp.side, sp.length, sp.lift, 0.001, branchSegs, attach0);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pts.slice(), 3));
        const core = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: 0xc8e0b8,
            transparent: true,
            opacity: 0,
            toneMapped: false,
          })
        );
        core.userData.segs = branchSegs;
        plant.add(core);
        ctx.track(core);
        branchCores.push(core);

        const gPts = sampleBranch(sp.side, sp.length * 1.03, sp.lift, 0.001, branchSegs, attach0);
        const gGeo = new THREE.BufferGeometry();
        gGeo.setAttribute("position", new THREE.BufferAttribute(gPts, 3));
        const glow = new THREE.Line(
          gGeo,
          new THREE.LineBasicMaterial({
            color: 0x5a8860,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        );
        glow.userData.segs = branchSegs;
        plant.add(glow);
        ctx.track(glow);
        branchGlows.push(glow);
      }

      const leafSegs = budgetCount(18, 12, 9);
      const leafN = ctx.weak ? 3 : leafSpecs.length;
      for (let i = 0; i < leafN; i++) {
        const sp = leafSpecs[i];
        const attach0 = { x: 0, y: 0.01, z: 0 };
        const pts = sampleLeaf(sp.side, sp.length, sp.width, 0.001, leafSegs, attach0);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pts.slice(), 3));
        const core = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: 0xc8e8b8,
            transparent: true,
            opacity: 0,
            toneMapped: false,
          })
        );
        core.userData.segs = leafSegs;
        plant.add(core);
        ctx.track(core);
        leafCores.push(core);

        const gPts = sampleLeaf(sp.side, sp.length * 1.02, sp.width * 1.05, 0.001, leafSegs, attach0);
        const gGeo = new THREE.BufferGeometry();
        gGeo.setAttribute("position", new THREE.BufferAttribute(gPts, 3));
        const glow = new THREE.Line(
          gGeo,
          new THREE.LineBasicMaterial({
            color: 0x5a8860,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          })
        );
        glow.userData.segs = leafSegs;
        plant.add(glow);
        ctx.track(glow);
        leafGlows.push(glow);
      }

      // Sparse beads — seed / soil / eventual canopy cues
      const beadCount = budgetCount(24, 16, 10);
      const beadPos = new Float32Array(beadCount * 3);
      for (let i = 0; i < beadCount; i++) {
        const u = i / Math.max(1, beadCount - 1);
        beadPos[i * 3] = (u - 0.5) * 5.5;
        beadPos[i * 3 + 1] = Math.sin(u * Math.PI * 4) * 0.08 + (u > 0.45 && u < 0.55 ? 0.35 : 0);
        beadPos[i * 3 + 2] = Math.sin(u * Math.PI * 2) * 0.35;
      }
      const beadGeo = new THREE.BufferGeometry();
      beadGeo.setAttribute("position", new THREE.BufferAttribute(beadPos, 3));
      beads = new THREE.Points(
        beadGeo,
        new THREE.PointsMaterial({
          color: 0xa8c898,
          size: ctx.mobile ? 0.07 : 0.1,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      plant.add(beads);
      ctx.track(beads);

      state.grow = 0;
      state.branch = 0;
      state.leaf = 0;
      state.seedFade = 0;
      state.drop = 0;
      state.glow = 1;
      state.camDist = 4.2;
      state.camLift = 0.55;
      setCamera(ctx);
    },

    intro(ctx) {
      if (ctx.reduced) {
        showGrownQuiet();
        ctx.camera.position.set(0, 1.15, 9.5);
        lookTarget.set(0, 0.55, 0);
        ctx.camera.lookAt(lookTarget);
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "none" } });

      // Instant: seed + soil already visible — soft glow wake
      tl.to(state, { glow: 1.12, duration: 0.55, ease: "sine.out" }, 0);

      // Stem sketches upward (~1.6s)
      tl.to(
        state,
        {
          grow: 1,
          duration: 1.65,
          ease: "power2.out",
          onUpdate() {
            rebuildStem();
            rebuildBranches();
            setCamera(ctx);
          },
        },
        0.12
      );

      tl.to(
        state,
        {
          camDist: 5.4,
          camLift: 0.85,
          duration: 1.65,
          ease: "power1.inOut",
        },
        0.12
      );

      // Seed fades as the sprout takes focus
      tl.to(state, { seedFade: 1, duration: 0.7, ease: "power2.in" }, 0.85);
      tl.to(
        seedLine.material,
        { opacity: 0, duration: 0.7, ease: "power2.in" },
        0.85
      );

      // Branches fork out as stem rises
      tl.to(
        state,
        {
          branch: 1,
          duration: 1.05,
          ease: "power2.out",
          onUpdate: rebuildBranches,
        },
        0.85
      );

      // Leaves unfurl on stem + branch tips
      tl.to(
        state,
        {
          leaf: 1,
          duration: 1.15,
          ease: "power2.out",
          onUpdate: rebuildLeaves,
        },
        1.15
      );

      tl.to(state, { glow: 1.05, duration: 0.7, ease: "sine.inOut" }, 1.2);
      tl.to(state, { glow: 0.85, duration: 0.7, ease: "sine.inOut" }, 2.0);

      // Splash near unlock
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.55 },
          { opacity: 0.8, scale: 1.18, duration: 0.32, ease: "power2.out" }
        );
      }, 2.85);

      // Settle / drop into page — unlock by ~3.9s
      tl.to(
        state,
        {
          drop: 1,
          glow: 0.22,
          duration: 0.95,
          ease: "power3.in",
          onUpdate() {
            setCamera(ctx);
          },
        },
        2.9
      );

      tl.to(
        [stemCore.material, soilLine.material],
        { opacity: 0.18, duration: 0.75, ease: "power2.out" },
        2.95
      );
      tl.to(stemGlow.material, { opacity: 0.08, duration: 0.75 }, 2.95);
      tl.to(soilGlow.material, { opacity: 0.06, duration: 0.75 }, 2.95);
      tl.to(beads.material, { opacity: 0.1, duration: 0.75 }, 2.95);
      branchCores.forEach(function (l) {
        tl.to(l.material, { opacity: 0.15, duration: 0.75 }, 2.95);
      });
      branchGlows.forEach(function (l) {
        tl.to(l.material, { opacity: 0.055, duration: 0.75 }, 2.95);
      });
      leafCores.forEach(function (l) {
        tl.to(l.material, { opacity: 0.16, duration: 0.75 }, 2.95);
      });
      leafGlows.forEach(function (l) {
        tl.to(l.material, { opacity: 0.06, duration: 0.75 }, 2.95);
      });

      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.4 }, 3.2);

      tl.to(
        state,
        {
          drop: 1,
          duration: 0.28,
          ease: "power2.out",
          onUpdate() {
            setCamera(ctx);
          },
        },
        3.7
      );

      return tl;
    },

    onPersistent(ctx) {
      showGrownQuiet();
      ctx.camera.position.set(0, 1.15, 9.5);
      lookTarget.set(0, 0.55, 0);
      ctx.camera.lookAt(lookTarget);
    },

    update(ctx, dt, t) {
      if (!plant) return;

      const calm = state.drop >= 0.99;

      if (calm) {
        if (stemCore) stemCore.material.opacity = 0.15 + state.glow * 0.08;
        if (stemGlow) {
          stemGlow.material.opacity =
            0.05 + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.55));
        }
        if (soilLine) soilLine.material.opacity = 0.12;
        if (soilGlow) soilGlow.material.opacity = 0.05;
        if (beads) beads.material.opacity = 0.08 + state.glow * 0.05;
        branchCores.forEach(function (l, i) {
          if (!l) return;
          l.material.opacity = 0.13 + 0.025 * Math.sin(t * 0.4 + i * 0.7);
        });
        leafCores.forEach(function (l, i) {
          if (!l) return;
          l.material.opacity = 0.14 + 0.03 * Math.sin(t * 0.45 + i);
        });
        plant.rotation.y = Math.sin(t * 0.12) * 0.04;
        plant.rotation.x = Math.sin(t * 0.09) * 0.02;
        return;
      }

      if (stemCore) {
        stemCore.material.opacity = Math.min(1, 0.35 + state.glow * 0.55);
      }
      if (stemGlow) {
        stemGlow.material.opacity =
          0.12 + state.glow * 0.3 * (0.7 + 0.3 * Math.sin(t * 1.35));
      }
      if (beads) {
        beads.material.opacity = 0.2 + state.glow * 0.35;
      }
      if (soilLine) {
        soilLine.material.opacity = 0.35 + state.glow * 0.2;
      }
    },

    disposeExtra() {
      branchCores = [];
      branchGlows = [];
      leafCores = [];
      leafGlows = [];
    },
  });
}
