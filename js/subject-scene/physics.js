/**
 * Physics: cinematic 1D block collision — big mass drives a small block into a wall;
 * after a burst of elastic bounces the small block knocks the big one back, then the page unlocks.
 * Persistent: cheap dimmed silhouettes on purple-black #0c0814.
 * Reduced-motion: boot skips WebGL → short CSS fade (subject-scene.css).
 */
import { THREE, gsap } from "./core.js";

const BG = 0x0c0814;
const WALL_X = -5.55;
const FLOOR_Y = -1.9;
const M_BIG = 100;
const M_SMALL = 1;
const W_BIG = 2.2;
const H_BIG = 2.2;
const W_SMALL = 0.55;
const H_SMALL = 0.55;
const HALF_SUM = (W_BIG + W_SMALL) * 0.5;
const EPS = 1e-9;
const X_BIG0 = 4.85;
const X_SMALL0 = -3.05;
const V_BIG0 = -2.85;

function elastic(m1, m2, v1, v2) {
  const inv = 1 / (m1 + m2);
  return [
    ((m1 - m2) * v1 + 2 * m2 * v2) * inv,
    ((m2 - m1) * v2 + 2 * m1 * v1) * inv,
  ];
}

/**
 * Event-based 1D elastic sim (wall ↔ small ↔ big). Sparse keyframes only —
 * ~31 clacks for 100:1, then GSAP drives time (no per-frame collision search).
 */
function bakeCollisions(xBig0, xSmall0, vBig0) {
  let x1 = xBig0;
  let x2 = xSmall0;
  let v1 = vBig0;
  let v2 = 0;
  let t = 0;
  const frames = [{ t: 0, x1, x2, v1, v2, kind: "start" }];

  for (let n = 0; n < 80; n++) {
    let tWall = Infinity;
    let tBlock = Infinity;

    const smallLeft = x2 - W_SMALL * 0.5;
    if (v2 < -EPS) {
      const dist = smallLeft - WALL_X;
      tWall = dist > 0 ? dist / -v2 : 0;
    }

    const gap = x1 - x2 - HALF_SUM;
    const closing = v2 - v1;
    if (closing > EPS) {
      tBlock = gap > 0 ? gap / closing : 0;
    }

    const dt = Math.min(tWall, tBlock);
    if (!isFinite(dt) || dt === Infinity) break;

    const step = Math.max(dt, 0);
    t += step;
    x1 += v1 * step;
    x2 += v2 * step;

    if (tWall <= tBlock) {
      v2 = -v2;
      x2 = WALL_X + W_SMALL * 0.5 + 1e-6;
      frames.push({ t, x1, x2, v1, v2, kind: "wall" });
    } else {
      const next = elastic(M_BIG, M_SMALL, v1, v2);
      v1 = next[0];
      v2 = next[1];
      x1 = x2 + HALF_SUM + 1e-6;
      frames.push({ t, x1, x2, v1, v2, kind: "block" });
    }
  }

  // Coast so the heavy block’s rebound reads clearly before unlock
  if (frames.length > 1) {
    const coast = 0.85;
    t += coast;
    x1 += v1 * coast;
    x2 += v2 * coast;
    frames.push({ t, x1, x2, v1, v2, kind: "coast" });
  }

  return frames;
}

function frameIndexAt(frames, simT) {
  let lo = 0;
  let hi = frames.length - 1;
  if (simT <= frames[0].t) return 0;
  if (simT >= frames[hi].t) return hi;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= simT) lo = mid;
    else hi = mid;
  }
  return lo;
}

function lerpFrame(frames, simT) {
  const last = frames[frames.length - 1];
  if (simT <= frames[0].t) return Object.assign({ idx: 0 }, frames[0]);
  if (simT >= last.t) return Object.assign({ idx: frames.length - 1 }, last);
  const lo = frameIndexAt(frames, simT);
  const hi = Math.min(lo + 1, frames.length - 1);
  const a = frames[lo];
  const b = frames[hi];
  const span = b.t - a.t || 1;
  const u = (simT - a.t) / span;
  return {
    t: simT,
    idx: lo,
    x1: a.x1 + (b.x1 - a.x1) * u,
    x2: a.x2 + (b.x2 - a.x2) * u,
    v1: a.v1,
    v2: a.v2,
    kind: u < 0.5 ? a.kind : b.kind,
  };
}

/** Cheap face label so mass ratio reads at a glance. */
function makeLabelMap(text, fill, ink) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = fill;
  g.fillRect(18, 18, 220, 220);
  g.strokeStyle = "rgba(255,255,255,0.22)";
  g.lineWidth = 4;
  g.strokeRect(28, 28, 200, 200);
  g.fillStyle = ink;
  g.font = "700 92px \"Fraunces\", \"Times New Roman\", serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 128, 122);
  g.font = "600 28px \"DM Sans\", system-ui, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.fillText("m", 128, 188);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function addEdges(mesh, color, opacity) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 28),
    new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      toneMapped: false,
    })
  );
  mesh.add(edges);
  return edges;
}

export function createPhysicsExperience(mount) {
  let big = null;
  let small = null;
  let wall = null;
  let floor = null;
  let flash = null;
  let bigEdges = null;
  let smallEdges = null;
  let frames = null;
  let simEnd = 1;

  const state = {
    simT: 0,
    dim: 0,
    camX: 0.2,
    camY: 0.42,
    camZ: 11.4,
    flash: 0,
    lookX: -0.55,
    lastIdx: 0,
  };

  function applyPose(frame) {
    if (big) big.position.x = frame.x1;
    if (small) small.position.x = frame.x2;
  }

  function setCamera(ctx) {
    ctx.camera.position.set(state.camX, state.camY, state.camZ);
    ctx.camera.lookAt(state.lookX, -0.2, 0);
  }

  function settlePersistent(ctx) {
    const last = frames && frames.length ? frames[frames.length - 1] : null;
    if (last) applyPose(last);
    state.dim = 1;
    state.flash = 0;
    state.camX = 0.1;
    state.camY = 0.35;
    state.camZ = 12.6;
    state.lookX = -0.35;
    if (big && big.material) {
      if (Array.isArray(big.material)) {
        big.material.forEach(function (m) {
          if (m && m.opacity != null) m.opacity = 0.12;
        });
      } else {
        big.material.opacity = 0.12;
      }
    }
    if (small && small.material) {
      if (Array.isArray(small.material)) {
        small.material.forEach(function (m) {
          if (m && m.opacity != null) m.opacity = 0.14;
        });
      } else {
        small.material.opacity = 0.14;
      }
    }
    if (bigEdges && bigEdges.material) bigEdges.material.opacity = 0.08;
    if (smallEdges && smallEdges.material) smallEdges.material.opacity = 0.1;
    if (wall && wall.material) wall.material.opacity = 0.09;
    if (floor && floor.material) floor.material.opacity = 0.1;
    if (flash && flash.material) flash.material.opacity = 0;
    setCamera(ctx);
    if (ctx.scene.fog) {
      ctx.scene.fog.near = 14;
      ctx.scene.fog.far = 42;
    }
  }

  function dimMaterials(amount) {
    const oBig = 0.96 * (1 - amount) + 0.12 * amount;
    const oSmall = 0.98 * (1 - amount) + 0.14 * amount;
    const oEdgeBig = 0.55 * (1 - amount) + 0.08 * amount;
    const oEdgeSmall = 0.7 * (1 - amount) + 0.1 * amount;
    const oWall = 0.78 * (1 - amount) + 0.09 * amount;
    const oFloor = 0.5 * (1 - amount) + 0.1 * amount;
    function setOp(mat, o) {
      if (!mat) return;
      if (Array.isArray(mat)) mat.forEach(function (m) { if (m) m.opacity = o; });
      else mat.opacity = o;
    }
    if (big) setOp(big.material, oBig);
    if (small) setOp(small.material, oSmall);
    if (bigEdges) bigEdges.material.opacity = oEdgeBig;
    if (smallEdges) smallEdges.material.opacity = oEdgeSmall;
    if (wall) wall.material.opacity = oWall;
    if (floor) floor.material.opacity = oFloor;
  }

  return mount({
    id: "physics",
    clearColor: BG,
    fogColor: BG,
    fogNear: 11,
    fogFar: 38,
    failSafeMs: 14000,
    build(ctx) {
      const group = new THREE.Group();
      ctx.scene.add(group);
      ctx.track(group);

      wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 4.8, 1.55),
        new THREE.MeshBasicMaterial({
          color: 0x4a3568,
          transparent: true,
          opacity: 0.78,
          toneMapped: false,
        })
      );
      wall.position.set(WALL_X - 0.14, FLOOR_Y + 2.4, 0);
      group.add(wall);
      ctx.track(wall);

      // Soft wall face glow — reads as the impact surface
      const wallFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.02, 4.6),
        new THREE.MeshBasicMaterial({
          color: 0xc4b5fd,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      wallFace.position.set(WALL_X + 0.01, FLOOR_Y + 2.35, 0.02);
      group.add(wallFace);
      ctx.track(wallFace);

      floor = new THREE.Mesh(
        new THREE.BoxGeometry(17, 0.05, 1.6),
        new THREE.MeshBasicMaterial({
          color: 0x6b5a88,
          transparent: true,
          opacity: 0.5,
          toneMapped: false,
        })
      );
      floor.position.set(0.55, FLOOR_Y, 0);
      group.add(floor);
      ctx.track(floor);

      const bigLabel = makeLabelMap("100", "#6d4fc4", "#f5f0ff");
      const smallLabel = makeLabelMap("1", "#7eb8d8", "#071018");
      ctx.track(bigLabel);
      ctx.track(smallLabel);

      const bigMatSide = new THREE.MeshBasicMaterial({
        color: 0x7c5ecf,
        transparent: true,
        opacity: 0.96,
        toneMapped: false,
      });
      const bigMatFace = new THREE.MeshBasicMaterial({
        map: bigLabel,
        transparent: true,
        opacity: 0.96,
        toneMapped: false,
      });
      big = new THREE.Mesh(
        new THREE.BoxGeometry(W_BIG, H_BIG, W_BIG * 0.7),
        [
          bigMatSide, bigMatSide, bigMatSide, bigMatSide,
          bigMatFace, // front (+z)
          bigMatSide,
        ]
      );
      big.position.set(X_BIG0, FLOOR_Y + H_BIG * 0.5, 0);
      group.add(big);
      ctx.track(big);
      bigEdges = addEdges(big, 0xd4c4ff, 0.55);
      ctx.track(bigEdges);

      const smallMatSide = new THREE.MeshBasicMaterial({
        color: 0x9ad4ef,
        transparent: true,
        opacity: 0.98,
        toneMapped: false,
      });
      const smallMatFace = new THREE.MeshBasicMaterial({
        map: smallLabel,
        transparent: true,
        opacity: 0.98,
        toneMapped: false,
      });
      small = new THREE.Mesh(
        new THREE.BoxGeometry(W_SMALL, H_SMALL, W_SMALL * 0.7),
        [
          smallMatSide, smallMatSide, smallMatSide, smallMatSide,
          smallMatFace,
          smallMatSide,
        ]
      );
      small.position.set(X_SMALL0, FLOOR_Y + H_SMALL * 0.5, 0);
      group.add(small);
      ctx.track(small);
      smallEdges = addEdges(small, 0xe8f7ff, 0.7);
      ctx.track(smallEdges);

      flash = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({
          color: 0xe9d5ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      flash.position.set(X_SMALL0, FLOOR_Y + 0.65, 0.6);
      group.add(flash);
      ctx.track(flash);

      frames = bakeCollisions(X_BIG0, X_SMALL0, V_BIG0);
      simEnd = frames[frames.length - 1].t || 1;

      applyPose(frames[0]);
      setCamera(ctx);
    },
    intro(ctx) {
      if (ctx.reduced) {
        const tl = gsap.timeline();
        settlePersistent(ctx);
        tl.to({}, { duration: 0.28 });
        return tl;
      }

      const tl = gsap.timeline();
      const endT = simEnd;

      // Establish: big block sliding in from the right
      tl.to(state, { simT: endT * 0.035, duration: 0.5, ease: "power1.out" }, 0);
      tl.to(state, { camZ: 9.4, camX: -0.25, camY: 0.35, duration: 0.85, ease: "power2.inOut" }, 0);

      // First contact + shove toward the wall (readable beat)
      tl.to(
        state,
        {
          simT: endT * 0.2,
          duration: 1.25,
          ease: "power1.inOut",
          onUpdate() {
            const f = lerpFrame(frames, state.simT);
            state.lookX = (f.x1 + f.x2) * 0.5 * 0.32 - 0.55;
            setCamera(ctx);
          },
        },
        0.4
      );

      // Bounce storm — many clacks, slightly compressed but still countable
      tl.to(
        state,
        {
          simT: endT * 0.86,
          duration: 3.15,
          ease: "power2.in",
          onUpdate() {
            const f = lerpFrame(frames, state.simT);
            state.lookX = (f.x1 + f.x2) * 0.5 * 0.26 - 0.4;
            state.camX = THREE.MathUtils.lerp(state.camX, f.x2 * 0.1 - 0.15, 0.1);
            setCamera(ctx);
          },
        },
        1.55
      );

      // Final knock-back — small block reverses the big one
      tl.to(
        state,
        {
          simT: endT,
          duration: 1.25,
          ease: "power2.out",
          onUpdate() {
            const f = lerpFrame(frames, state.simT);
            state.lookX = (f.x1 + f.x2) * 0.5 * 0.2 - 0.15;
            state.camX = THREE.MathUtils.lerp(state.camX, 0.15, 0.06);
            setCamera(ctx);
          },
        },
        4.65
      );

      tl.to(state, { camZ: 11.6, camY: 0.4, camX: 0.18, duration: 1.05, ease: "power2.inOut" }, 5.15);

      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.5 },
          { opacity: 0.88, scale: 1.28, duration: 0.36, ease: "power2.out" }
        );
      }, 5.55);
      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.45 }, 5.95);

      tl.to(
        state,
        {
          dim: 1,
          flash: 0,
          duration: 0.85,
          ease: "power2.inOut",
          onUpdate() {
            dimMaterials(state.dim);
          },
        },
        5.85
      );

      tl.to(
        state,
        {
          camZ: 12.6,
          camY: 0.35,
          camX: 0.1,
          lookX: -0.35,
          duration: 0.9,
          ease: "power2.inOut",
          onUpdate() {
            setCamera(ctx);
          },
        },
        5.9
      );

      if (ctx.scene.fog) {
        tl.to(ctx.scene.fog, { near: 14, far: 42, duration: 0.85 }, 5.9);
      }

      return tl;
    },
    onPersistent(ctx) {
      settlePersistent(ctx);
    },
    update(ctx, dt) {
      if (frames && state.dim < 0.95) {
        const f = lerpFrame(frames, state.simT);
        applyPose(f);
        if (f.idx > state.lastIdx) {
          let hitKind = null;
          let hx = f.x2;
          for (let i = state.lastIdx + 1; i <= f.idx; i++) {
            const crossed = frames[i];
            if (crossed && crossed.kind !== "start" && crossed.kind !== "coast") {
              hitKind = crossed.kind;
              hx =
                crossed.kind === "wall"
                  ? WALL_X + 0.4
                  : (crossed.x1 + crossed.x2) * 0.5;
            }
          }
          if (hitKind) {
            state.flash = 1;
            if (flash) {
              flash.position.x = hx;
              flash.position.y = FLOOR_Y + H_SMALL * 0.7;
            }
          }
          state.lastIdx = f.idx;
        }
      }

      state.flash = Math.max(0, state.flash - dt * 6);
      if (flash && flash.material) {
        flash.material.opacity = state.flash * 0.6 * (1 - state.dim * 0.9);
        flash.rotation.z += dt * 0.4;
      }

      if (state.dim > 0.85 && big && small) {
        const breath = Math.sin(ctx.clock.elapsedTime * 0.5) * 0.01;
        big.position.y = FLOOR_Y + H_BIG * 0.5 + breath;
        small.position.y = FLOOR_Y + H_SMALL * 0.5 - breath * 0.55;
      }
    },
  });
}
