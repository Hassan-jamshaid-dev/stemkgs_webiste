/**
 * Mathematics: ride a glowing quadratic curve (y = ax²), then drop into the page.
 * Persistent: calm faint parabola + light grid — cheap Line / LineSegments / Points only.
 * Palette: navy / cool white / blue. Reduced-motion: boot skips WebGL → short CSS fade.
 */
import { THREE, gsap, budgetCount } from "./core.js";

/** Sample y = a x² in the x–y plane, with a soft z wobble for light 3D. */
function sampleParabola(a, xMin, xMax, segments, zAmp) {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = xMin + (xMax - xMin) * t;
    const y = a * x * x;
    const z = zAmp * Math.sin(t * Math.PI * 2) * (1 - Math.abs(t * 2 - 1) * 0.35);
    const o = i * 3;
    pts[o] = x;
    pts[o + 1] = y;
    pts[o + 2] = z;
  }
  return pts;
}

function pointOnParabola(a, xMin, xMax, u, zAmp) {
  const x = xMin + (xMax - xMin) * u;
  const y = a * x * x;
  const z = zAmp * Math.sin(u * Math.PI * 2) * (1 - Math.abs(u * 2 - 1) * 0.35);
  return { x, y, z };
}

function tangentOnParabola(a, xMin, xMax, u, zAmp) {
  const eps = 0.002;
  const u0 = Math.max(0, u - eps);
  const u1 = Math.min(1, u + eps);
  const p0 = pointOnParabola(a, xMin, xMax, u0, zAmp);
  const p1 = pointOnParabola(a, xMin, xMax, u1, zAmp);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

export function createMathsExperience(mount) {
  const A = 0.085;
  const X_MIN = -9.5;
  const X_MAX = 9.5;
  const Z_AMP = 1.15;

  let curveCore = null;
  let curveGlow = null;
  let grid = null;
  let beads = null;
  let rideGroup = null;
  let lookTarget = new THREE.Vector3(0, 0, 0);

  const state = {
    u: 0.06,
    drop: 0,
    camDist: 3.4,
    camLift: 0.55,
    glow: 1,
    gridFade: 0,
  };

  function setCameraFromRide(ctx) {
    const p = pointOnParabola(A, X_MIN, X_MAX, state.u, Z_AMP);
    const tan = tangentOnParabola(A, X_MIN, X_MAX, state.u, Z_AMP);
    // Camera sits slightly above/beside the curve, looking ahead down the parabola
    const side = 0.35;
    const nx = -tan.y;
    const ny = tan.x;
    const camX = p.x - tan.x * state.camDist * 0.15 + nx * side;
    const camY = p.y - tan.y * state.camDist * 0.15 + state.camLift + ny * side * 0.25;
    const camZ = p.z + state.camDist + tan.z * 0.2;

    // Blend toward a settled overview as drop → 1
    const settleX = 0;
    const settleY = 2.2;
    const settleZ = 14.5;
    const d = state.drop;
    ctx.camera.position.set(
      camX * (1 - d) + settleX * d,
      camY * (1 - d) + settleY * d,
      camZ * (1 - d) + settleZ * d
    );

    const ahead = pointOnParabola(A, X_MIN, X_MAX, Math.min(1, state.u + 0.08), Z_AMP);
    lookTarget.set(
      ahead.x * (1 - d),
      ahead.y * (1 - d) + 1.2 * d,
      ahead.z * (1 - d)
    );
    ctx.camera.lookAt(lookTarget);
  }

  return mount({
    id: "maths",
    clearColor: 0x08101c,
    fogColor: 0x08101c,
    fogNear: 14,
    fogFar: 48,
    build(ctx) {
      rideGroup = new THREE.Group();
      ctx.scene.add(rideGroup);
      ctx.track(rideGroup);

      const segs = budgetCount(96, 64, 40);
      const pts = sampleParabola(A, X_MIN, X_MAX, segs, Z_AMP);

      const coreGeo = new THREE.BufferGeometry();
      coreGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      curveCore = new THREE.Line(
        coreGeo,
        new THREE.LineBasicMaterial({
          color: 0xe8f1ff,
          transparent: true,
          opacity: 0.95,
          toneMapped: false,
        })
      );
      rideGroup.add(curveCore);
      ctx.track(curveCore);

      // Soft glow: slightly offset duplicate line (cheap faux bloom — no post FX)
      const glowPts = sampleParabola(A, X_MIN, X_MAX, segs, Z_AMP * 1.05);
      const glowGeo = new THREE.BufferGeometry();
      glowGeo.setAttribute("position", new THREE.BufferAttribute(glowPts, 3));
      curveGlow = new THREE.Line(
        glowGeo,
        new THREE.LineBasicMaterial({
          color: 0x4a8fd4,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      curveGlow.scale.set(1.02, 1.02, 1.02);
      rideGroup.add(curveGlow);
      ctx.track(curveGlow);

      // Sparse beads along the curve for depth cues
      const beadCount = budgetCount(28, 18, 12);
      const beadPos = new Float32Array(beadCount * 3);
      for (let i = 0; i < beadCount; i++) {
        const u = i / Math.max(1, beadCount - 1);
        const p = pointOnParabola(A, X_MIN, X_MAX, u, Z_AMP);
        beadPos[i * 3] = p.x;
        beadPos[i * 3 + 1] = p.y;
        beadPos[i * 3 + 2] = p.z;
      }
      const beadGeo = new THREE.BufferGeometry();
      beadGeo.setAttribute("position", new THREE.BufferAttribute(beadPos, 3));
      beads = new THREE.Points(
        beadGeo,
        new THREE.PointsMaterial({
          color: 0x93c5fd,
          size: ctx.mobile ? 0.08 : 0.11,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
      );
      rideGroup.add(beads);
      ctx.track(beads);

      // Calm cartesian grid (built once; faded in for persistent)
      const gridLines = budgetCount(11, 7, 5);
      const gridExtent = 11;
      const gPos = [];
      for (let i = 0; i < gridLines; i++) {
        const t = i / Math.max(1, gridLines - 1);
        const v = -gridExtent + 2 * gridExtent * t;
        gPos.push(-gridExtent, v, -0.8, gridExtent, v, -0.8);
        gPos.push(v, -1.5, -0.8, v, A * gridExtent * gridExtent + 1.5, -0.8);
      }
      const gGeo = new THREE.BufferGeometry();
      gGeo.setAttribute("position", new THREE.Float32BufferAttribute(gPos, 3));
      grid = new THREE.LineSegments(
        gGeo,
        new THREE.LineBasicMaterial({
          color: 0x2a4a78,
          transparent: true,
          opacity: 0,
          toneMapped: false,
        })
      );
      rideGroup.add(grid);
      ctx.track(grid);

      state.u = 0.04;
      state.drop = 0;
      setCameraFromRide(ctx);
    },

    intro(ctx) {
      // Reduced-motion: core finishes immediately → page short-fades in via CSS
      if (ctx.reduced) {
        state.u = 0.5;
        state.drop = 1;
        state.glow = 0.22;
        state.gridFade = 1;
        setCameraFromRide(ctx);
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "none" } });

      // Phase 1 — slide down the parabola (high → vertex → far side)
      tl.to(
        state,
        {
          u: 0.92,
          duration: 2.55,
          ease: "power1.inOut",
          onUpdate() {
            setCameraFromRide(ctx);
          },
        },
        0
      );

      tl.to(
        state,
        {
          camDist: 2.6,
          camLift: 0.35,
          duration: 2.55,
          ease: "power1.inOut",
        },
        0
      );

      // Soft glow pulse while riding
      tl.to(state, { glow: 1.15, duration: 1.2, ease: "sine.inOut" }, 0.2);
      tl.to(state, { glow: 0.9, duration: 1.2, ease: "sine.inOut" }, 1.4);

      // Splash mark near the drop
      tl.add(function () {
        if (!ctx.splash) return;
        gsap.fromTo(
          ctx.splash,
          { opacity: 0, scale: 0.55 },
          { opacity: 0.85, scale: 1.2, duration: 0.35, ease: "power2.out" }
        );
      }, 2.35);

      // Phase 2 — drop / settle into the page
      tl.to(
        state,
        {
          drop: 1,
          duration: 1.05,
          ease: "power3.in",
          onUpdate() {
            setCameraFromRide(ctx);
          },
        },
        2.5
      );

      tl.to(
        state,
        {
          glow: 0.22,
          gridFade: 1,
          duration: 0.9,
          ease: "power2.out",
        },
        2.55
      );

      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.45 }, 2.85);

      // Ease out camera settle
      tl.to(
        state,
        {
          drop: 1,
          duration: 0.35,
          ease: "power2.out",
          onUpdate() {
            setCameraFromRide(ctx);
          },
        },
        3.45
      );

      return tl;
    },

    onPersistent(ctx) {
      state.u = 0.5;
      state.drop = 1;
      state.glow = 0.22;
      state.gridFade = 1;
      if (curveCore) curveCore.material.opacity = 0.18;
      if (curveGlow) curveGlow.material.opacity = 0.08;
      if (beads) beads.material.opacity = 0.1;
      if (grid) grid.material.opacity = 0.07;
      ctx.camera.position.set(0, 2.2, 14.5);
      ctx.camera.lookAt(0, 1.2, 0);
    },

    update(ctx, dt, t) {
      if (!rideGroup) return;

      const calm = state.drop >= 0.99;

      if (calm) {
        // Cheap calm field — low static opacities + tiny drift
        if (curveCore) curveCore.material.opacity = 0.16 + state.glow * 0.08;
        if (curveGlow) {
          curveGlow.material.opacity =
            0.06 + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.55));
        }
        if (beads) beads.material.opacity = 0.08 + state.glow * 0.06;
        if (grid) grid.material.opacity = 0.065 * state.gridFade;
        rideGroup.rotation.y = Math.sin(t * 0.12) * 0.04;
        rideGroup.rotation.x = Math.sin(t * 0.09) * 0.02;
        return;
      }

      if (curveCore) {
        curveCore.material.opacity = Math.min(1, 0.35 + state.glow * 0.55);
      }
      if (curveGlow) {
        curveGlow.material.opacity =
          0.12 + state.glow * 0.32 * (0.7 + 0.3 * Math.sin(t * 1.4));
      }
      if (beads) {
        beads.material.opacity = 0.12 + state.glow * 0.5;
      }
      if (grid) {
        grid.material.opacity = 0.085 * state.gridFade;
      }
    },
  });
}
