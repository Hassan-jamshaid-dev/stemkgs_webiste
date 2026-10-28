/**
 * Physics: Newton's cradle — classic 5 polished spheres on a metal frame.
 * Left ball swings in; page unlocks on first impact (≤ ~2.5s, fail-safe 4s).
 * Persistent: dimmed static cradle on purple-black #0c0814.
 * Reduced-motion: boot skips WebGL → short CSS fade (subject-scene.css).
 */
import { THREE, gsap } from "./core.js";

const BG = 0x0c0814;
const N = 5;
const R = 0.42;
const GAP = R * 2;
const L = 3.35;
const PIVOT_Y = 1.55;
const START_ANG = -0.92;
const IMPACT_T = 2.15;

function makeChromeMap(size) {
  const s = size || 256;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d");
  const cx = s * 0.5;
  const cy = s * 0.5;
  const r = s * 0.5;

  const body = g.createRadialGradient(cx - r * 0.28, cy - r * 0.32, r * 0.04, cx, cy, r);
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.1, "#f4f7fb");
  body.addColorStop(0.28, "#c8d2de");
  body.addColorStop(0.5, "#8a97a8");
  body.addColorStop(0.72, "#4e5866");
  body.addColorStop(1, "#1c222c");
  g.fillStyle = body;
  g.fillRect(0, 0, s, s);

  const spec = g.createRadialGradient(
    cx - r * 0.34,
    cy - r * 0.4,
    0,
    cx - r * 0.22,
    cy - r * 0.28,
    r * 0.55
  );
  spec.addColorStop(0, "rgba(255,255,255,1)");
  spec.addColorStop(0.2, "rgba(255,255,255,0.7)");
  spec.addColorStop(0.5, "rgba(210,230,255,0.14)");
  spec.addColorStop(1, "rgba(200,220,255,0)");
  g.fillStyle = spec;
  g.fillRect(0, 0, s, s);

  // Secondary highlight band (polished chrome cue)
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = s * 0.035;
  g.lineCap = "round";
  g.beginPath();
  g.arc(cx - r * 0.06, cy - r * 0.08, r * 0.62, -2.4, -0.85);
  g.stroke();

  const rim = g.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
  rim.addColorStop(0, "rgba(0,0,0,0)");
  rim.addColorStop(0.7, "rgba(0,0,0,0)");
  rim.addColorStop(1, "rgba(8,10,16,0.4)");
  g.fillStyle = rim;
  g.fillRect(0, 0, s, s);

  // Cool violet edge catch — ties to #0c0814 field
  g.globalCompositeOperation = "screen";
  g.strokeStyle = "rgba(190,165,255,0.28)";
  g.lineWidth = s * 0.04;
  g.beginPath();
  g.arc(cx + r * 0.08, cy + r * 0.12, r * 0.78, 0.4, 2.2);
  g.stroke();
  g.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeMetalBarMat(color) {
  return new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.88,
    roughness: 0.28,
    emissive: 0x1a1228,
    emissiveIntensity: 0.15,
  });
}

function ballPos(i, angle, originX) {
  const px = originX + i * GAP;
  const a = angle || 0;
  return {
    x: px + Math.sin(a) * L,
    y: PIVOT_Y - Math.cos(a) * L,
    px: px,
  };
}

export function createPhysicsExperience(mount) {
  let cradle = null;
  let balls = [];
  let wires = [];
  let flash = null;
  let chromeMap = null;
  let unlocked = false;

  const state = {
    ang0: START_ANG,
    ang4: 0,
    dim: 0,
    flash: 0,
    camZ: 9.2,
    camY: 0.55,
    camX: 0.15,
  };

  function setWires(i, ang) {
    const w = wires[i];
    if (!w) return;
    const p = ballPos(i, ang, cradle._originX);
    const pivL = w.pivL;
    const pivR = w.pivR;
    const mid = balls[i].position;

    function placeLine(line, from, to) {
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, from.x, from.y, from.z);
      pos.setXYZ(1, to.x, to.y, to.z);
      pos.needsUpdate = true;
    }

    placeLine(w.left, pivL, mid);
    placeLine(w.right, pivR, mid);
  }

  function applyAngles() {
    if (!cradle) return;
    for (let i = 0; i < N; i++) {
      let a = 0;
      if (i === 0) a = state.ang0;
      else if (i === N - 1) a = state.ang4;
      const p = ballPos(i, a, cradle._originX);
      balls[i].position.set(p.x, p.y, 0);
      setWires(i, a);
    }
  }

  function setCamera(ctx) {
    ctx.camera.position.set(state.camX, state.camY, state.camZ);
    ctx.camera.lookAt(0, 0.15, 0);
  }

  function dimScene(amount) {
    const oBall = 1 * (1 - amount) + 0.14 * amount;
    const oWire = 0.72 * (1 - amount) + 0.1 * amount;
    const oFrame = 1 * (1 - amount) + 0.12 * amount;
    balls.forEach(function (b) {
      if (b.material) b.material.opacity = oBall;
    });
    wires.forEach(function (w) {
      if (w.left && w.left.material) w.left.material.opacity = oWire;
      if (w.right && w.right.material) w.right.material.opacity = oWire;
    });
    if (cradle && cradle._frameMats) {
      cradle._frameMats.forEach(function (m) {
        if (m) m.opacity = oFrame;
      });
    }
  }

  function settlePersistent(ctx) {
    state.ang0 = 0;
    state.ang4 = 0;
    state.dim = 1;
    state.flash = 0;
    state.camX = 0.05;
    state.camY = 0.45;
    state.camZ = 11.4;
    applyAngles();
    dimScene(1);
    if (flash && flash.material) flash.material.opacity = 0;
    setCamera(ctx);
    if (ctx.scene.fog) {
      ctx.scene.fog.near = 12;
      ctx.scene.fog.far = 36;
    }
  }

  return mount({
    id: "physics",
    clearColor: BG,
    fogColor: BG,
    fogNear: 8,
    fogFar: 28,
    failSafeMs: 4000,
    build(ctx) {
      cradle = new THREE.Group();
      ctx.scene.add(cradle);
      ctx.track(cradle);

      const originX = -((N - 1) * GAP) * 0.5;
      cradle._originX = originX;

      const segs = ctx.weak || ctx.mobile ? 20 : 36;
      chromeMap = makeChromeMap(ctx.weak ? 128 : 256);
      ctx.track(chromeMap);

      const ballMat = new THREE.MeshStandardMaterial({
        map: chromeMap,
        color: 0xeef2f7,
        metalness: 0.92,
        roughness: 0.14,
        emissive: 0x3a2a58,
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 1,
      });
      ctx.track(ballMat);

      const wireMat = new THREE.LineBasicMaterial({
        color: 0xdce3ec,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      });
      ctx.track(wireMat);

      const frameMats = [];
      cradle._frameMats = frameMats;

      function trackMat(m) {
        frameMats.push(m);
        ctx.track(m);
        m.transparent = true;
        m.opacity = 1;
        return m;
      }

      const barMat = trackMat(makeMetalBarMat(0xb0b8c6));
      const postMat = trackMat(makeMetalBarMat(0x8e96a4));
      const baseMat = trackMat(makeMetalBarMat(0x5c5668));

      const barW = (N - 1) * GAP + R * 2.4;
      const topBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, barW, 12),
        barMat
      );
      topBar.rotation.z = Math.PI / 2;
      topBar.position.set(0, PIVOT_Y + 0.02, 0);
      cradle.add(topBar);

      const cross = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.15, 10),
        barMat
      );
      cross.rotation.x = Math.PI / 2;
      cross.position.set(0, PIVOT_Y + 0.02, 0);
      cradle.add(cross);

      const half = barW * 0.5;
      [-1, 1].forEach(function (side) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.085, PIVOT_Y + 1.35, 12),
          postMat
        );
        post.position.set(side * half, (PIVOT_Y - 1.15) * 0.5, 0);
        cradle.add(post);

        // A-frame rear brace
        const brace = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 2.05, 8),
          postMat
        );
        brace.position.set(side * half, 0.15, 0.55);
        brace.rotation.x = 0.48;
        cradle.add(brace);

        const braceF = brace.clone();
        braceF.position.z = -0.55;
        braceF.rotation.x = -0.48;
        cradle.add(braceF);
      });

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(barW + 0.9, 0.12, 1.55),
        baseMat
      );
      base.position.set(0, -1.55, 0);
      cradle.add(base);

      const baseLip = new THREE.Mesh(
        new THREE.BoxGeometry(barW + 1.05, 0.04, 1.7),
        trackMat(makeMetalBarMat(0x3a3548))
      );
      baseLip.position.set(0, -1.62, 0);
      cradle.add(baseLip);

      for (let i = 0; i < N; i++) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(R, segs, segs),
          ballMat.clone()
        );
        ctx.track(mesh.material);
        const p = ballPos(i, i === 0 ? START_ANG : 0, originX);
        mesh.position.set(p.x, p.y, 0);
        cradle.add(mesh);
        balls.push(mesh);

        const px = originX + i * GAP;
        const pivL = new THREE.Vector3(px - 0.07, PIVOT_Y, 0);
        const pivR = new THREE.Vector3(px + 0.07, PIVOT_Y, 0);
        const geoL = new THREE.BufferGeometry().setFromPoints([
          pivL.clone(),
          mesh.position.clone(),
        ]);
        const geoR = new THREE.BufferGeometry().setFromPoints([
          pivR.clone(),
          mesh.position.clone(),
        ]);
        const left = new THREE.Line(geoL, wireMat.clone());
        const right = new THREE.Line(geoR, wireMat.clone());
        ctx.track(left.material);
        ctx.track(right.material);
        cradle.add(left);
        cradle.add(right);
        wires.push({ left, right, pivL, pivR });
      }

      flash = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4),
        new THREE.MeshBasicMaterial({
          color: 0xe8e0ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      flash.position.set(originX + R, PIVOT_Y - L, 0.55);
      cradle.add(flash);
      ctx.track(flash);

      const key = new THREE.DirectionalLight(0xf5f8ff, 1.85);
      key.position.set(4.5, 6.5, 5.5);
      ctx.scene.add(key);
      ctx.track(key);

      const fill = new THREE.DirectionalLight(0xb49ae0, 0.75);
      fill.position.set(-5, 2, -3);
      ctx.scene.add(fill);
      ctx.track(fill);

      const rim = new THREE.PointLight(0xd4c4ff, 1.45, 24);
      rim.position.set(0, 2.2, 4.5);
      ctx.scene.add(rim);
      ctx.track(rim);

      const amb = new THREE.AmbientLight(0x3a3050, 0.72);
      ctx.scene.add(amb);
      ctx.track(amb);

      applyAngles();
      setCamera(ctx);
    },
    intro(ctx) {
      if (ctx.reduced) {
        const tl = gsap.timeline();
        settlePersistent(ctx);
        tl.to({}, { duration: 0.28 });
        return tl;
      }

      // Instant start — raised ball already in motion on first frame.
      const tl = gsap.timeline();

      tl.to(
        state,
        {
          ang0: 0,
          duration: IMPACT_T,
          ease: "power2.in",
          onUpdate() {
            applyAngles();
            // Subtle push-in as the ball falls
            const u = 1 - state.ang0 / START_ANG;
            state.camZ = 9.2 - u * 0.85;
            state.camY = 0.55 - u * 0.08;
            setCamera(ctx);
          },
        },
        0
      );

      // First impact — unlock immediately (timeline ends here).
      tl.add(function () {
        state.flash = 1;
        if (flash) {
          const hit = ballPos(0, 0, cradle._originX);
          flash.position.set(hit.x + R * 0.85, hit.y, 0.55);
        }
        if (ctx.splash) {
          gsap.fromTo(
            ctx.splash,
            { opacity: 0, scale: 0.55 },
            { opacity: 0.9, scale: 1.2, duration: 0.28, ease: "power2.out" }
          );
        }
      }, IMPACT_T);

      tl.to(ctx.splash || { opacity: 0 }, { opacity: 0, duration: 0.22 }, IMPACT_T + 0.02);

      // Tiny settle so splash registers; total still well under 4s.
      tl.to({}, { duration: 0.08 }, IMPACT_T);

      return tl;
    },
    onPersistent(ctx) {
      unlocked = true;
      // Cheap dimmed cradle — no long post-collision sequence.
      state.ang0 = 0;
      state.ang4 = 0;
      applyAngles();
      gsap.to(state, {
        dim: 1,
        camZ: 11.4,
        camY: 0.45,
        camX: 0.05,
        duration: 0.9,
        ease: "power2.out",
        onUpdate() {
          dimScene(state.dim);
          setCamera(ctx);
        },
      });
      if (ctx.scene.fog) {
        gsap.to(ctx.scene.fog, { near: 12, far: 36, duration: 0.9 });
      }
    },
    update(ctx, dt) {
      if (!cradle) return;

      if (!unlocked) {
        applyAngles();
      }

      state.flash = Math.max(0, state.flash - dt * 5.5);
      if (flash && flash.material) {
        flash.material.opacity = state.flash * 0.65 * (1 - state.dim * 0.85);
        flash.rotation.z += dt * 0.5;
      }

      if (state.dim > 0.85) {
        const breath = Math.sin(ctx.clock.elapsedTime * 0.45) * 0.012;
        cradle.rotation.y = breath;
      }
    },
  });
}
