/* Procedural STEM scenes. One renderer, one particle field, one line field.
   Stage index 0..6 matches the fallback list in index.html, then a short convergence. */
(function (global) {
  var NAVY = 0x071018;
  var SUBJECTS = 0x261248;
  var LINE_N = 12;
  var PTS = 20;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function fract(n) {
    return n - Math.floor(n);
  }
  function rand(i, s) {
    return fract(Math.sin(i * 127.1 + s * 311.7) * 43758.5453123);
  }
  function hypot3(x, y, z) {
    return Math.hypot(x, y, z);
  }
  function dist3(a, b) {
    return hypot3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  function resample(points, count) {
    var out = [];
    var i;
    if (!points || !points.length) {
      for (i = 0; i < count; i++) out.push([0, 0, 0]);
      return out;
    }
    if (points.length === 1) {
      for (i = 0; i < count; i++) out.push(points[0].slice());
      return out;
    }
    var lengths = [0];
    var total = 0;
    for (i = 1; i < points.length; i++) {
      total += dist3(points[i - 1], points[i]);
      lengths.push(total);
    }
    if (total < 1e-5) {
      for (i = 0; i < count; i++) out.push(points[0].slice());
      return out;
    }
    for (var s = 0; s < count; s++) {
      var d = (s / (count - 1)) * total;
      var idx = 1;
      while (idx < lengths.length - 1 && lengths[idx] < d) idx++;
      var span = lengths[idx] - lengths[idx - 1] || 1;
      var t = (d - lengths[idx - 1]) / span;
      var a = points[idx - 1];
      var b = points[idx];
      out.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
      ]);
    }
    return out;
  }

  function fitPolys(list) {
    var source = list && list.length ? list : [[[0, 0, 0], [0, 0, 0]]];
    var out = [];
    for (var i = 0; i < LINE_N; i++) out.push(resample(source[i % source.length], PTS));
    return out;
  }

  function polysToSegments(polys) {
    var out = new Float32Array(LINE_N * (PTS - 1) * 6);
    var seg = 0;
    for (var p = 0; p < polys.length; p++) {
      var pts = polys[p];
      for (var i = 0; i < pts.length - 1; i++) {
        var o = seg * 6;
        var a = pts[i];
        var b = pts[i + 1];
        out[o] = a[0];
        out[o + 1] = a[1];
        out[o + 2] = a[2];
        out[o + 3] = b[0];
        out[o + 4] = b[1];
        out[o + 5] = b[2];
        seg++;
      }
    }
    return out;
  }

  global.StemJourneyScene = function (THREE, options) {
    options = options || {};
    var canvas = options.canvas;
    var viewport = options.viewport || (canvas && canvas.parentElement);
    var lite = !!options.lite;
    var N = lite ? 300 : 640;
    var depth = lite ? 3 : 4;
    var flowCount = lite ? 16 : 28;
    var glyphCount = lite ? 8 : 12;
    var weights = [1, 1, 1, 1, 1, 1, 1, 0.72];
    var ranges = [];
    var sumW = 0;
    var wi;
    for (wi = 0; wi < weights.length; wi++) sumW += weights[wi];
    var acc = 0;
    for (wi = 0; wi < weights.length; wi++) {
      var start = acc / sumW;
      acc += weights[wi];
      ranges.push([start, acc / sumW]);
    }

    var textures = [];
    var dead = false;
    var held = 0;
    var UP = new THREE.Vector3(0, 1, 0);
    var tmp = new THREE.Vector3();

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !lite,
      alpha: false,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false
    });
    if (!renderer.getContext()) throw new Error("WebGL unavailable");
    renderer.setClearColor(NAVY, 1);
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (THREE.NoToneMapping !== undefined) renderer.toneMapping = THREE.NoToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5));
    canvas.style.pointerEvents = "none";

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(NAVY);
    scene.fog = new THREE.Fog(NAVY, 15, 32);
    var camera = new THREE.PerspectiveCamera(38, 1, 0.08, 60);

    scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    scene.add(new THREE.HemisphereLight(0xe7eef8, 0x142c48, 0.85));
    var key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4.2, 6.2, 5.4);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0x4a8fd4, 0.55);
    fill.position.set(-5.5, -1.2, -2.4);
    scene.add(fill);

    function lambert(opts) {
      var base = opts.opacity == null ? 1 : opts.opacity;
      var mat = new THREE.MeshLambertMaterial({
        color: opts.color,
        map: opts.map || null,
        emissive: opts.emissive || 0x000000,
        emissiveIntensity: opts.emissiveIntensity || 1,
        side: opts.side || THREE.FrontSide,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      mat.userData.baseOpacity = base;
      return mat;
    }

    function track(group) {
      var mats = [];
      group.traverse(function (obj) {
        if (!obj.material) return;
        var list = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (var i = 0; i < list.length; i++) {
          var m = list[i];
          if (m.userData.baseOpacity == null) m.userData.baseOpacity = 1;
          m.transparent = true;
          m.depthWrite = false;
          m.opacity = 0;
          if (mats.indexOf(m) === -1) mats.push(m);
        }
      });
      group.userData.mats = mats;
    }

    function fade(group, amount) {
      var o = clamp(amount, 0, 1);
      group.visible = o > 0.02;
      var mats = group.userData.mats || [];
      for (var i = 0; i < mats.length; i++) {
        var base = mats[i].userData.baseOpacity;
        if (base == null) base = 1;
        mats[i].opacity = base * o;
        mats[i].depthWrite = base * o > 0.88;
      }
    }

    function placeUnitCylinder(mesh, ax, ay, az, bx, by, bz) {
      var dx = bx - ax;
      var dy = by - ay;
      var dz = bz - az;
      var len = hypot3(dx, dy, dz) || 0.001;
      mesh.scale.set(1, len, 1);
      mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      tmp.set(dx / len, dy / len, dz / len);
      mesh.quaternion.setFromUnitVectors(UP, tmp);
    }

    function makeDot() {
      var c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      var g = c.getContext("2d");
      var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.4, "rgba(255,255,255,0.8)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      var tex = new THREE.CanvasTexture(c);
      textures.push(tex);
      return tex;
    }

    function makePlanetTexture() {
      var c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      var g = c.getContext("2d");
      var grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, "#142c48");
      grd.addColorStop(0.28, "#1c456e");
      grd.addColorStop(0.46, "#4a8fd4");
      grd.addColorStop(0.58, "#28144c");
      grd.addColorStop(0.78, "#16324e");
      grd.addColorStop(1, "#0d1c30");
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 256);
      var y;
      for (y = 6; y < 256; y += 7) {
        g.fillStyle = "rgba(255,255,255," + (0.03 + (y % 5) * 0.012) + ")";
        g.fillRect(0, y, 512, 2);
      }
      var tex = new THREE.CanvasTexture(c);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      return tex;
    }

    function makeTextSprite(str, color, scale) {
      var c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      var g = c.getContext("2d");
      g.clearRect(0, 0, 256, 256);
      g.fillStyle = color;
      g.font = "600 164px 'DM Sans', 'Segoe UI', Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(str, 128, 138);
      var tex = new THREE.CanvasTexture(c);
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      var mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0
      });
      mat.userData.baseOpacity = 1;
      var sprite = new THREE.Sprite(mat);
      sprite.scale.set(scale, scale, 1);
      return sprite;
    }

    var PLUS = [-1.15, 0.48, 0];
    var MINUS = [1.15, 0.48, 0];
    var MOL = [-1.05, 0.32, 0.1];
    var FLASK = { x: 1.85, y: -0.42, z: 0.05 };
    var BOND = 1.05;
    var HALF = 52.25 * Math.PI / 180;
    var H1 = [Math.sin(HALF) * BOND, Math.cos(HALF) * BOND, 0];
    var H2 = [-Math.sin(HALF) * BOND, Math.cos(HALF) * BOND, 0];

    var STARS = [
      [-3.2, 1.85, -1.5],
      [-2.35, 2.35, -1.65],
      [-1.45, 1.9, -1.4],
      [-0.55, 2.4, -1.7],
      [0.35, 1.75, -1.35],
      [1.15, 2.25, -1.55],
      [1.95, 1.6, -1.25],
      [2.7, 2.5, -1.15],
      [3.4, 1.95, -1.4],
      [2.85, 1.2, -1.05],
      [-2.85, 1.05, -1.85],
      [-2.15, 1.4, -1.95]
    ];
    var STAR_LINKS = [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
      [7, 8], [8, 9], [7, 9],
      [0, 10], [10, 11], [11, 2]
    ];
    var NODES = [
      [-2.4, 1.55, 0.05],
      [-0.85, 2.15, -0.12],
      [0.8, 1.6, 0.16],
      [2.35, 2.1, -0.02],
      [-1.45, 0.72, 0.22],
      [1.05, 0.78, -0.16],
      [0.1, 2.45, 0.02],
      [2.05, 0.95, 0.12]
    ];
    var EDGES = [
      [0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 2],
      [1, 6], [6, 3], [4, 1], [5, 7], [7, 3], [2, 6]
    ];

    function circlePts(cx, cy, cz, rx, ry, tilt) {
      var raw = [];
      for (var i = 0; i <= 28; i++) {
        var a = (i / 28) * Math.PI * 2;
        var x = Math.cos(a) * rx;
        var y = Math.sin(a) * ry;
        var z = 0;
        var y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
        var z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
        raw.push([cx + x, cy + y2, cz + z2]);
      }
      return raw;
    }

    function arc(a, b, lift) {
      return [
        a,
        [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + lift, (a[2] + b[2]) / 2],
        b
      ];
    }

    function fieldAt(x, y, z) {
      function part(cx, cy, cz, q) {
        var dx = x - cx;
        var dy = y - cy;
        var dz = z - cz;
        var r = hypot3(dx, dy, dz) + 0.001;
        var f = q / (r * r * r);
        return [dx * f, dy * f, dz * f];
      }
      var a = part(PLUS[0], PLUS[1], PLUS[2], 1);
      var b = part(MINUS[0], MINUS[1], MINUS[2], -1);
      return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    function traceField(seed) {
      var pts = [seed.slice()];
      var x = seed[0];
      var y = seed[1];
      var z = seed[2];
      for (var s = 0; s < 46; s++) {
        var f = fieldAt(x, y, z);
        var len = hypot3(f[0], f[1], f[2]);
        if (len < 1e-5) break;
        x += (f[0] / len) * 0.24;
        y += (f[1] / len) * 0.24;
        z += (f[2] / len) * 0.24;
        pts.push([x, y, z]);
        if (hypot3(x - MINUS[0], y - MINUS[1], z - MINUS[2]) < 0.2) break;
        if (hypot3(x, y, z) > 6.2) break;
      }
      return pts;
    }

    function rotateDir(dir, yaw, pitch) {
      var x = dir[0];
      var y = dir[1];
      var z = dir[2];
      var c = Math.cos(yaw);
      var s = Math.sin(yaw);
      var x1 = x * c - y * s;
      var y1 = x * s + y * c;
      var cp = Math.cos(pitch);
      var sp = Math.sin(pitch);
      var y2 = y1 * cp - z * sp;
      var z2 = y1 * sp + z * cp;
      var len = hypot3(x1, y2, z2) || 1;
      return [x1 / len, y2 / len, z2 / len];
    }

    function buildBranches(levels) {
      var segs = [];
      var paths = [];
      function grow(a, dir, d, rad, path) {
        var len = 0.48 + d * 0.1;
        var b = [a[0] + dir[0] * len, a[1] + dir[1] * len, a[2] + dir[2] * len];
        segs.push({ a: a, b: b, r: rad });
        var next = path.concat([b]);
        if (d === 0) {
          paths.push(next);
          return;
        }
        grow(b, rotateDir(dir, 0.42, 0.28), d - 1, rad * 0.7, next);
        grow(b, rotateDir(dir, -0.38, -0.34), d - 1, rad * 0.7, next);
      }
      var origin = [0, -0.75, 0];
      grow(origin, [0.04, 1, 0], levels, 0.07, [origin]);
      return { segs: segs, paths: paths };
    }

    var branches = buildBranches(depth);

    function astroPolys() {
      var list = [];
      for (var i = 0; i < STAR_LINKS.length; i++) {
        var a = STARS[STAR_LINKS[i][0]];
        var b = STARS[STAR_LINKS[i][1]];
        list.push([a, b]);
      }
      return list;
    }

    function csPolys() {
      var list = [];
      for (var i = 0; i < EDGES.length; i++) {
        list.push(arc(NODES[EDGES[i][0]], NODES[EDGES[i][1]], 0.18));
      }
      return list;
    }

    function robotPolys() {
      var list = [];
      var y = -1.32;
      var i;
      for (i = 0; i < 6; i++) {
        var z = -1.7 + i * 0.68;
        list.push([[-2.5, y, z], [2.5, y, z]]);
      }
      for (i = 0; i < 6; i++) {
        var x = -2.5 + i * 1.0;
        list.push([[x, y, -1.7], [x, y, 1.7]]);
      }
      return list;
    }

    function mathPolys() {
      var list = [
        [[-5.6, 0, 0], [5.6, 0, 0]],
        [[0, -2.15, 0], [0, 2.15, 0]],
        [[0, 0, -2.05], [0, 0, 2.05]]
      ];
      var sine = [];
      var i;
      for (i = 0; i <= 18; i++) {
        var x = -5.1 + (i / 18) * 10.2;
        sine.push([x, Math.sin(x) * 1.12, 0]);
      }
      list.push(sine);
      for (i = -2; i <= 2; i++) {
        if (i === 0) continue;
        list.push([[-5.1, i * 0.55, 0], [5.1, i * 0.55, 0]]);
      }
      for (i = 0; i < 4; i++) {
        var gx = -3 + i * 2;
        list.push([[gx, -1.7, 0], [gx, 1.7, 0]]);
      }
      return list;
    }

    function physicsPolys() {
      var list = [];
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        list.push(traceField([
          PLUS[0] + Math.cos(a) * 0.2,
          PLUS[1] + Math.sin(a) * 0.2,
          Math.sin(a * 2) * 0.05
        ]));
      }
      return list;
    }

    function chemPolys() {
      var list = [];
      function W(x, y, z) {
        return [x + FLASK.x, y + FLASK.y, z + FLASK.z];
      }
      list.push([W(-0.7, 0, 0), W(-0.16, 1.12, 0), W(-0.16, 1.7, 0)]);
      list.push([W(0.7, 0, 0), W(0.16, 1.12, 0), W(0.16, 1.7, 0)]);
      var rings = [
        { y: 0.02, r: 0.7 },
        { y: 0.42, r: 0.46 },
        { y: 1.1, r: 0.26 },
        { y: 1.72, r: 0.2 }
      ];
      var r;
      for (r = 0; r < rings.length; r++) {
        var raw = [];
        for (var i = 0; i <= 24; i++) {
          var a = (i / 24) * Math.PI * 2;
          raw.push(W(Math.cos(a) * rings[r].r, rings[r].y, Math.sin(a) * rings[r].r));
        }
        list.push(raw);
      }
      var extra = [
        { y: 0.2, r: 0.58 },
        { y: 0.7, r: 0.34 },
        { y: 0.95, r: 0.22 },
        { y: 1.4, r: 0.16 },
        { y: 1.55, r: 0.16 },
        { y: 0.55, r: 0.4 }
      ];
      for (r = 0; r < extra.length; r++) {
        var band = [];
        for (var e = 0; e <= 24; e++) {
          var ae = (e / 24) * Math.PI * 2;
          band.push(W(Math.cos(ae) * extra[r].r, extra[r].y, Math.sin(ae) * extra[r].r));
        }
        list.push(band);
      }
      return list;
    }

    function bioPolys() {
      var list = branches.paths.slice(0, 12);
      if (!list.length) list = [[[0, -0.5, 0], [0, 0.8, 0]]];
      return list;
    }

    function convPolys() {
      var specs = [
        { rx: 1.85, ry: 1.85, tilt: 0.2 },
        { rx: 2.15, ry: 0.78, tilt: 1.05 },
        { rx: 2.05, ry: 0.7, tilt: -0.78 }
      ];
      var list = [];
      for (var i = 0; i < LINE_N; i++) {
        var spec = specs[i % specs.length];
        list.push(circlePts(0, 0.12, 0, spec.rx, spec.ry, spec.tilt));
      }
      return list;
    }

    var physicsRaw = physicsPolys();
    var lineSources = [
      astroPolys(),
      csPolys(),
      robotPolys(),
      mathPolys(),
      physicsRaw,
      chemPolys(),
      bioPolys(),
      convPolys()
    ];
    var lineSets = [];
    for (var ls = 0; ls < lineSources.length; ls++) lineSets.push(polysToSegments(fitPolys(lineSources[ls])));

    function writeAstro(arr) {
      var i;
      for (i = 0; i < N; i++) {
        var inc = Math.acos(1 - 2 * ((i + 0.5) / N));
        var az = i * 2.399963229728653;
        var rad = 4.8 + rand(i, 1) * 6.2;
        var y = Math.cos(inc);
        var ring = Math.sin(inc);
        if (i % 4 === 0) y *= 0.16;
        arr[i * 3] = Math.cos(az) * ring * rad;
        arr[i * 3 + 1] = y * rad * 0.72;
        arr[i * 3 + 2] = Math.sin(az) * ring * rad * 0.62 - 0.8;
      }
      for (i = 0; i < 56 && i < N; i++) {
        var a = (i / 56) * Math.PI * 2;
        var rr = 1.55 + (i % 3) * 0.08;
        arr[i * 3] = -1.45 + Math.cos(a) * rr;
        arr[i * 3 + 1] = 0.28 + Math.sin(a) * rr * 0.2;
        arr[i * 3 + 2] = Math.sin(a) * rr * 0.42;
      }
    }

    function writeCS(arr) {
      var lanes = [1.05, 0.42, -0.18, -0.72];
      for (var i = 0; i < N; i++) {
        var s = i % 4;
        var along = Math.floor(i / 4) / Math.ceil(N / 4);
        var x = -6.8 + along * 13.6;
        var j = (rand(i, 2) - 0.5) * 0.22;
        arr[i * 3] = x;
        arr[i * 3 + 1] = lanes[s] + Math.sin(along * Math.PI * 4 + s) * 0.16 + j;
        arr[i * 3 + 2] = (s - 1.5) * 0.12 + (rand(i, 3) - 0.5) * 0.2;
      }
    }

    function writeRobot(arr) {
      for (var i = 0; i < N; i++) {
        if (i % 3 !== 2) {
          var a = rand(i, 2) * Math.PI * 2;
          var rad = 0.25 + rand(i, 3) * 1.7;
          arr[i * 3] = Math.cos(a) * rad + 0.1;
          arr[i * 3 + 1] = -1.28 + rand(i, 4) * 0.1;
          arr[i * 3 + 2] = Math.sin(a) * rad * 0.72;
        } else {
          arr[i * 3] = (rand(i, 5) - 0.5) * 1.1 + 0.15;
          arr[i * 3 + 1] = -1.05 + rand(i, 6) * 2.15;
          arr[i * 3 + 2] = (rand(i, 7) - 0.5) * 0.7;
        }
      }
    }

    function writeMath(arr) {
      for (var i = 0; i < N; i++) {
        var mode = i % 5;
        if (mode < 3) {
          var x = -5.1 + rand(i, 1) * 10.2;
          arr[i * 3] = x;
          arr[i * 3 + 1] = Math.sin(x) * 1.12 + (rand(i, 2) - 0.5) * 0.06;
          arr[i * 3 + 2] = (rand(i, 3) - 0.5) * 0.06;
        } else if (mode === 3) {
          arr[i * 3] = -5.4 + rand(i, 4) * 10.8;
          arr[i * 3 + 1] = (rand(i, 5) - 0.5) * 0.04;
          arr[i * 3 + 2] = 0;
        } else {
          arr[i * 3] = (rand(i, 6) - 0.5) * 0.04;
          arr[i * 3 + 1] = -2 + rand(i, 7) * 4;
          arr[i * 3 + 2] = 0;
        }
      }
    }

    function writePhysics(arr) {
      for (var i = 0; i < N; i++) {
        if (i % 3 === 0) {
          var x = -6.1 + rand(i, 1) * 12.2;
          arr[i * 3] = x;
          arr[i * 3 + 1] = -0.82 + Math.sin(x * 0.85) * 0.42;
          arr[i * 3 + 2] = 0.95;
        } else if (physicsRaw.length) {
          var poly = physicsRaw[i % physicsRaw.length];
          var p = poly[Math.floor(rand(i, 2) * poly.length) % poly.length];
          arr[i * 3] = p[0];
          arr[i * 3 + 1] = p[1];
          arr[i * 3 + 2] = p[2];
        }
      }
    }

    function writeChem(arr) {
      for (var i = 0; i < N; i++) {
        if (i % 5 === 0) {
          var a = rand(i, 1) * Math.PI * 2;
          var rr = 0.25 + rand(i, 2) * 0.7;
          arr[i * 3] = FLASK.x + Math.cos(a) * rr;
          arr[i * 3 + 1] = FLASK.y + 0.35 + rand(i, 3) * 0.7;
          arr[i * 3 + 2] = FLASK.z + Math.sin(a) * rr * 0.7;
        } else {
          var ang = rand(i, 4) * Math.PI * 2;
          var u = rand(i, 5) * 2 - 1;
          var s = Math.sqrt(Math.max(0, 1 - u * u));
          var rad = 0.2 + rand(i, 6) * 1.05;
          arr[i * 3] = MOL[0] + Math.cos(ang) * s * rad;
          arr[i * 3 + 1] = MOL[1] + u * rad * 0.75;
          arr[i * 3 + 2] = MOL[2] + Math.sin(ang) * s * rad;
        }
      }
    }

    function writeBio(arr) {
      var segs = branches.segs;
      for (var i = 0; i < N; i++) {
        var seg = segs[i % segs.length];
        var u = rand(i, 3);
        arr[i * 3] = seg.a[0] + (seg.b[0] - seg.a[0]) * u;
        arr[i * 3 + 1] = seg.a[1] + (seg.b[1] - seg.a[1]) * u;
        arr[i * 3 + 2] = seg.a[2] + (seg.b[2] - seg.a[2]) * u;
      }
    }

    function writeConv(arr) {
      var tilts = [0.15, 1.02, -0.82];
      for (var i = 0; i < N; i++) {
        var ring = i % 3;
        var a = (i / N) * Math.PI * 8 + ring;
        var rad = 1.55 + ring * 0.48;
        var tilt = tilts[ring];
        var x = Math.cos(a) * rad;
        var y = Math.sin(a) * rad;
        var z = 0;
        var y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
        var z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
        arr[i * 3] = x;
        arr[i * 3 + 1] = y2 + 0.12;
        arr[i * 3 + 2] = z2;
      }
    }

    var writers = [writeAstro, writeCS, writeRobot, writeMath, writePhysics, writeChem, writeBio, writeConv];
    var particleSets = [];
    for (var ps = 0; ps < writers.length; ps++) {
      var buf = new Float32Array(N * 3);
      writers[ps](buf);
      particleSets.push(buf);
    }

    var pointGeom = new THREE.BufferGeometry();
    var pointAttr = new THREE.BufferAttribute(new Float32Array(N * 3), 3);
    pointGeom.setAttribute("position", pointAttr);
    pointGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    var pointsMat = new THREE.PointsMaterial({
      color: 0xe8eef6,
      size: lite ? 0.11 : 0.075,
      map: makeDot(),
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      opacity: 0.95
    });
    var points = new THREE.Points(pointGeom, pointsMat);
    points.frustumCulled = false;
    scene.add(points);

    var lineGeom = new THREE.BufferGeometry();
    var lineAttr = new THREE.BufferAttribute(new Float32Array(LINE_N * (PTS - 1) * 6), 3);
    lineGeom.setAttribute("position", lineAttr);
    lineGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    var lineMat = new THREE.LineBasicMaterial({
      color: 0xb7d0ea,
      transparent: true,
      opacity: 0.85
    });
    var lines = new THREE.LineSegments(lineGeom, lineMat);
    lines.frustumCulled = false;
    scene.add(lines);

    var astro = new THREE.Group();
    var planetMat = lambert({ color: 0xffffff, map: makePlanetTexture() });
    var planet = new THREE.Mesh(new THREE.SphereGeometry(0.9, lite ? 24 : 36, lite ? 16 : 24), planetMat);
    planet.position.set(-1.42, 0.22, 0.05);
    astro.add(planet);
    var atmos = new THREE.Mesh(
      new THREE.SphereGeometry(0.98, 24, 16),
      lambert({ color: 0x4a8fd4, opacity: 0.14, side: THREE.BackSide })
    );
    atmos.position.copy(planet.position);
    astro.add(atmos);
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.32, 0.016, 8, 64),
      lambert({ color: 0x9a96a8, opacity: 0.9 })
    );
    ring.position.copy(planet.position);
    ring.rotation.x = 1.2;
    ring.rotation.y = 0.2;
    astro.add(ring);
    var starMat = lambert({ color: 0xf4f7fb, emissive: 0xf4f7fb, emissiveIntensity: 0.25 });
    var starGeo = new THREE.SphereGeometry(0.045, 8, 8);
    for (var st = 0; st < STARS.length; st++) {
      var star = new THREE.Mesh(starGeo, starMat);
      star.position.set(STARS[st][0], STARS[st][1], STARS[st][2]);
      astro.add(star);
    }
    var scope = new THREE.Group();
    var metal = lambert({ color: 0xd5dde6 });
    var dark = lambert({ color: 0x142c48 });
    var lensMat = lambert({ color: 0x4a8fd4, emissive: 0x4a8fd4, emissiveIntensity: 0.35 });
    var feet = [[0.5, 0, 0.28], [-0.5, 0, 0.28], [0, 0, -0.55]];
    var hip = [0, 0.78, 0];
    for (var leg = 0; leg < feet.length; leg++) {
      var limb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1, 8), metal);
      placeUnitCylinder(limb, hip[0], hip[1], hip[2], feet[leg][0], feet[leg][1], feet[leg][2]);
      scope.add(limb);
    }
    var mount = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.2), dark);
    mount.position.set(0, 0.9, 0);
    scope.add(mount);
    var yoke = new THREE.Group();
    yoke.position.set(0, 1.02, 0);
    yoke.rotation.z = 0.62;
    yoke.rotation.y = -0.45;
    var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.28, 16), metal);
    tube.rotation.z = Math.PI / 2;
    tube.position.x = 0.1;
    yoke.add(tube);
    var hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.16, 16), dark);
    hood.rotation.z = Math.PI / 2;
    hood.position.x = 0.78;
    yoke.add(hood);
    var lens = new THREE.Mesh(new THREE.CircleGeometry(0.14, 18), lensMat);
    lens.rotation.y = Math.PI / 2;
    lens.position.x = 0.88;
    yoke.add(lens);
    var finder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.48, 10), metal);
    finder.rotation.z = Math.PI / 2;
    finder.position.set(0.12, 0.22, 0);
    yoke.add(finder);
    scope.add(yoke);
    scope.position.set(2.15, -0.72, 0.25);
    astro.add(scope);
    scene.add(astro);
    track(astro);

    var cs = new THREE.Group();
    var nodeMat = lambert({ color: 0x4a8fd4, emissive: 0x4a8fd4, emissiveIntensity: 0.2 });
    var nodeGeo = new THREE.SphereGeometry(0.09, 14, 12);
    for (var nd = 0; nd < NODES.length; nd++) {
      var node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(NODES[nd][0], NODES[nd][1], NODES[nd][2]);
      cs.add(node);
    }
    var glyphs = [];
    for (var g = 0; g < glyphCount; g++) {
      var sprite = makeTextSprite(g % 2 === 0 ? "0" : "1", "#d6e8ff", 0.5);
      cs.add(sprite);
      glyphs.push(sprite);
    }
    scene.add(cs);
    track(cs);

    var robot = new THREE.Group();
    robot.position.set(0.12, -1.08, 0);
    var jointMat = lambert({ color: 0x4a8fd4 });
    var armMat = lambert({ color: 0xd7dee8 });
    var baseMat = lambert({ color: 0x142c48 });
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 0.16, 20), baseMat);
    robot.add(base);
    var yaw = new THREE.Group();
    yaw.position.y = 0.14;
    robot.add(yaw);
    yaw.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), jointMat));
    var shoulder = new THREE.Group();
    yaw.add(shoulder);
    var upper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.12, 0.2), armMat);
    upper.position.y = 0.62;
    shoulder.add(upper);
    var elbowHub = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), jointMat);
    elbowHub.position.y = 1.16;
    shoulder.add(elbowHub);
    var elbow = new THREE.Group();
    elbow.position.y = 1.16;
    shoulder.add(elbow);
    var fore = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 0.16), armMat);
    fore.position.y = 0.5;
    elbow.add(fore);
    var wrist = new THREE.Group();
    wrist.position.y = 0.96;
    elbow.add(wrist);
    wrist.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), jointMat));
    var palm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.14), armMat);
    palm.position.y = 0.16;
    wrist.add(palm);
    var g1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.26, 0.05), baseMat);
    var g2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.26, 0.05), baseMat);
    g1.position.set(-0.08, 0.32, 0);
    g2.position.set(0.08, 0.32, 0);
    wrist.add(g1);
    wrist.add(g2);
    scene.add(robot);
    track(robot);

    var math = new THREE.Group();
    var xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 5.7, 0x4a8fd4, 0.18, 0.1);
    var yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 2.25, 0xffffff, 0.16, 0.08);
    var zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 2.15, 0x9a96a8, 0.16, 0.08);
    math.add(xArrow);
    math.add(yArrow);
    math.add(zArrow);
    var curveN = 140;
    var curveGeom = new THREE.BufferGeometry();
    var curveArr = new Float32Array(curveN * 3);
    for (var ci = 0; ci < curveN; ci++) {
      var cx = -5.1 + (ci / (curveN - 1)) * 10.2;
      curveArr[ci * 3] = cx;
      curveArr[ci * 3 + 1] = Math.sin(cx) * 1.12;
      curveArr[ci * 3 + 2] = 0;
    }
    curveGeom.setAttribute("position", new THREE.BufferAttribute(curveArr, 3));
    var curveLine = new THREE.Line(curveGeom, new THREE.LineBasicMaterial({ color: 0x4a8fd4, transparent: true, opacity: 0 }));
    math.add(curveLine);
    var labelX = makeTextSprite("x", "#d6e8ff", 0.42);
    var labelY = makeTextSprite("y", "#ffffff", 0.42);
    var labelZ = makeTextSprite("z", "#d5d0dc", 0.42);
    labelX.position.set(4.7, 0.38, 0);
    labelY.position.set(0.32, 2.35, 0);
    labelZ.position.set(0.85, -0.72, 0.35);
    math.add(labelX);
    math.add(labelY);
    math.add(labelZ);
    scene.add(math);
    track(math);

    var physics = new THREE.Group();
    var plus = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), lambert({ color: 0xffffff }));
    plus.position.set(PLUS[0], PLUS[1], PLUS[2]);
    var plusMat = lambert({ color: 0x4a8fd4 });
    var plusH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), plusMat);
    var plusV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.02), plusMat);
    plusH.position.set(0, 0, 0.17);
    plusV.position.set(0, 0, 0.17);
    plus.add(plusH);
    plus.add(plusV);
    physics.add(plus);
    var minus = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), lambert({ color: 0x4a8fd4 }));
    minus.position.set(MINUS[0], MINUS[1], MINUS[2]);
    var bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), lambert({ color: 0xffffff }));
    bar.position.set(0, 0, 0.17);
    minus.add(bar);
    physics.add(minus);
    var waveN = 96;
    var waveGeom = new THREE.BufferGeometry();
    var waveAttr = new THREE.BufferAttribute(new Float32Array(waveN * 3), 3);
    waveGeom.setAttribute("position", waveAttr);
    var wave = new THREE.Line(waveGeom, new THREE.LineBasicMaterial({ color: 0xe8eef6, transparent: true, opacity: 0 }));
    physics.add(wave);
    scene.add(physics);
    track(physics);

    var chem = new THREE.Group();
    var mol = new THREE.Group();
    mol.position.set(MOL[0], MOL[1], MOL[2]);
    var oxygen = new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 16), lambert({ color: 0xf4f7fb }));
    var hydrogenMat = lambert({ color: 0x4a8fd4 });
    var h1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), hydrogenMat);
    var h2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), hydrogenMat);
    h1.position.set(H1[0], H1[1], H1[2]);
    h2.position.set(H2[0], H2[1], H2[2]);
    var bondMat = lambert({ color: 0x9a96a8 });
    var bond1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10), bondMat);
    var bond2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10), bondMat);
    placeUnitCylinder(bond1, 0, 0, 0, H1[0], H1[1], H1[2]);
    placeUnitCylinder(bond2, 0, 0, 0, H2[0], H2[1], H2[2]);
    mol.add(oxygen);
    mol.add(h1);
    mol.add(h2);
    mol.add(bond1);
    mol.add(bond2);
    chem.add(mol);
    var flask = new THREE.Group();
    flask.position.set(FLASK.x, FLASK.y, FLASK.z);
    var glass = lambert({ color: 0x9ec4ee, opacity: 0.38, side: THREE.DoubleSide });
    var body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.12, 28), glass);
    body.position.y = 0.56;
    flask.add(body);
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.58, 18), glass);
    neck.position.y = 1.4;
    flask.add(neck);
    var lip = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.028, 8, 20), lambert({ color: 0xd5e4f5, opacity: 0.7 }));
    lip.position.y = 1.7;
    lip.rotation.x = Math.PI / 2;
    flask.add(lip);
    var liquid = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), lambert({ color: 0x142c48, opacity: 0.92 }));
    liquid.scale.set(1.2, 0.55, 1.2);
    liquid.position.y = 0.32;
    flask.add(liquid);
    chem.add(flask);
    scene.add(chem);
    track(chem);

    var bio = new THREE.Group();
    var tubeGeo = new THREE.CylinderGeometry(1, 1, 1, 7);
    var tubeMat = lambert({ color: 0xc5d4e4 });
    var jointGeo = new THREE.SphereGeometry(1, 8, 8);
    var jointBio = lambert({ color: 0x4a8fd4 });
    for (var bi = 0; bi < branches.segs.length; bi++) {
      var seg = branches.segs[bi];
      var tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      var dx = seg.b[0] - seg.a[0];
      var dy = seg.b[1] - seg.a[1];
      var dz = seg.b[2] - seg.a[2];
      var len = hypot3(dx, dy, dz) || 0.001;
      tubeMesh.scale.set(seg.r, len, seg.r);
      tubeMesh.position.set((seg.a[0] + seg.b[0]) / 2, (seg.a[1] + seg.b[1]) / 2, (seg.a[2] + seg.b[2]) / 2);
      tmp.set(dx / len, dy / len, dz / len);
      tubeMesh.quaternion.setFromUnitVectors(UP, tmp);
      bio.add(tubeMesh);
      var joint = new THREE.Mesh(jointGeo, jointBio);
      joint.scale.setScalar(seg.r * 1.35);
      joint.position.set(seg.b[0], seg.b[1], seg.b[2]);
      bio.add(joint);
    }
    var flowGeom = new THREE.BufferGeometry();
    var flowAttr = new THREE.BufferAttribute(new Float32Array(flowCount * 3), 3);
    flowGeom.setAttribute("position", flowAttr);
    flowGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
    var flowMat = new THREE.PointsMaterial({
      color: 0x4a8fd4,
      size: lite ? 0.14 : 0.12,
      map: makeDot(),
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      opacity: 0
    });
    flowMat.userData.baseOpacity = 1;
    var flow = new THREE.Points(flowGeom, flowMat);
    flow.frustumCulled = false;
    bio.add(flow);
    scene.add(bio);
    track(bio);

    var conv = new THREE.Group();
    var core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), lambert({ color: 0xf7f8fb, emissive: 0x4a8fd4, emissiveIntensity: 0.18 }));
    core.position.y = 0.12;
    conv.add(core);
    var shell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14), lambert({ color: 0x4a8fd4, opacity: 0.22 }));
    shell.position.y = 0.12;
    conv.add(shell);
    var orbitMat = lambert({ color: 0x8ebfed, opacity: 0.95 });
    var orbitGeo = new THREE.TorusGeometry(2.05, 0.012, 8, lite ? 48 : 80);
    var orbits = [
      { x: 0.15, z: 0, s: 0.78 },
      { x: 1.02, z: 0.2, s: 1 },
      { x: -0.82, z: 0.4, s: 1.18 }
    ];
    for (var oi = 0; oi < orbits.length; oi++) {
      var orbit = new THREE.Mesh(orbitGeo, orbitMat);
      orbit.rotation.x = orbits[oi].x;
      orbit.rotation.z = orbits[oi].z;
      orbit.scale.setScalar(orbits[oi].s);
      orbit.position.y = 0.12;
      conv.add(orbit);
    }
    scene.add(conv);
    track(conv);

    var tintA = new THREE.Color();
    var tintB = new THREE.Color();
    var tint = new THREE.Color();
    var bgA = new THREE.Color(NAVY);
    var bgB = new THREE.Color(SUBJECTS);
    var bg = new THREE.Color(NAVY);
    var TINTS = [0xe8eef6, 0x7eb6ea, 0xd5dee8, 0xf7f8fb, 0x8ebfed, 0xdfe7f1, 0xc5d5e6, 0x9ec8f0];

    function presence(p, index) {
      var a = ranges[index][0];
      var b = ranges[index][1];
      var span = Math.max(0.0001, b - a);
      var w = span * 0.22;
      var last = index === ranges.length - 1;
      var rise0 = index === 0 ? a : a - w;
      var rise1 = index === 0 ? a : a + w;
      var fall0 = last ? b + 1 : b - w;
      var fall1 = last ? b + 1 : b + w;
      if (p < rise0 || p > fall1) return 0;
      var up = rise1 <= rise0 ? 1 : clamp((p - rise0) / (rise1 - rise0), 0, 1);
      var down = fall1 <= fall0 ? 1 : clamp((fall1 - p) / (fall1 - fall0), 0, 1);
      return smooth(up) * (p > fall0 ? smooth(down) : 1);
    }

    function locate(p) {
      var last = ranges.length - 1;
      var i = 0;
      while (i < last && p >= ranges[i][1]) i++;
      if (i >= last) return { i: last, next: last, t: 0 };
      var b = ranges[i][1];
      var w = Math.max(0.0001, (b - ranges[i][0]) * 0.22);
      var t0 = b - w;
      if (p <= t0) return { i: i, next: i, t: 0 };
      return { i: i, next: i + 1, t: smooth((p - t0) / w) };
    }

    function mixInto(target, sets, loc) {
      var A = sets[loc.i];
      var B = sets[loc.next];
      var t = loc.t;
      for (var k = 0; k < target.length; k++) target[k] = A[k] + (B[k] - A[k]) * t;
    }

    function localOf(p, index) {
      var a = ranges[index][0];
      var b = ranges[index][1];
      return clamp((p - a) / Math.max(0.0001, b - a), 0, 1);
    }

    function render(p, time) {
      if (dead) return null;
      p = clamp(p, 0, 1);
      time = time || 0;
      var loc = locate(p);
      mixInto(pointAttr.array, particleSets, loc);
      var csP = presence(p, 1);
      if (csP > 0.02) {
        var parr = pointAttr.array;
        for (var i = 0; i < N; i++) parr[i * 3] += Math.sin(time * 0.55 + i * 0.17) * 0.055 * csP;
      }
      pointAttr.needsUpdate = true;
      mixInto(lineAttr.array, lineSets, loc);
      lineAttr.needsUpdate = true;

      tintA.setHex(TINTS[loc.i]);
      tintB.setHex(TINTS[loc.next]);
      tint.copy(tintA).lerp(tintB, loc.t);
      pointsMat.color.copy(tint);
      lineMat.color.copy(tint);

      var last = ranges.length - 1;
      var c0 = ranges[last][0];
      var c1 = ranges[last][1];
      var endU = smooth(clamp((p - (c0 + (c1 - c0) * 0.42)) / Math.max(0.0001, c1 - (c0 + (c1 - c0) * 0.42)), 0, 1));
      var veil = 1 - endU;
      pointsMat.opacity = 0.94 * veil;
      lineMat.opacity = 0.82 * veil;

      fade(astro, presence(p, 0) * veil);
      fade(cs, csP * veil);
      fade(robot, presence(p, 2) * veil);
      fade(math, presence(p, 3) * veil);
      fade(physics, presence(p, 4) * veil);
      fade(chem, presence(p, 5) * veil);
      fade(bio, presence(p, 6) * veil);
      fade(conv, presence(p, 7) * veil);

      planet.rotation.y = time * 0.18;
      var robT = smooth(localOf(p, 2));
      yaw.rotation.y = -0.55 + robT * 1.25;
      shoulder.rotation.z = 0.85 - robT * 1.25;
      elbow.rotation.z = -1.45 + robT * 1.15;
      wrist.rotation.z = 0.35 - robT * 0.9;
      var grip = 0.07 + Math.sin(robT * Math.PI) * 0.055;
      g1.position.x = -grip;
      g2.position.x = grip;

      var mathLocal = localOf(p, 3);
      curveGeom.setDrawRange(0, Math.max(2, Math.round(smooth(Math.min(1, mathLocal / 0.86)) * curveN)));

      var physLocal = localOf(p, 4);
      var phase = physLocal * 9 + time * 0.4;
      var amp = 0.16 + physLocal * 0.5;
      var waveArr = waveAttr.array;
      for (var w = 0; w < waveN; w++) {
        var x = -6.2 + (w / (waveN - 1)) * 12.4;
        waveArr[w * 3] = x;
        waveArr[w * 3 + 1] = -0.82 + Math.sin(w * 0.2 + phase) * amp;
        waveArr[w * 3 + 2] = 0.95;
      }
      waveAttr.needsUpdate = true;

      mol.rotation.y = time * 0.12 + localOf(p, 5) * 0.7;

      var bioLocal = localOf(p, 6);
      var flowArr = flowAttr.array;
      var segs = branches.segs;
      for (var f = 0; f < flowCount; f++) {
        var seg = segs[f % segs.length];
        var u = (f * 0.17 + time * 0.07 + bioLocal * 0.35) % 1;
        flowArr[f * 3] = seg.a[0] + (seg.b[0] - seg.a[0]) * u;
        flowArr[f * 3 + 1] = seg.a[1] + (seg.b[1] - seg.a[1]) * u;
        flowArr[f * 3 + 2] = seg.a[2] + (seg.b[2] - seg.a[2]) * u;
      }
      flowAttr.needsUpdate = true;

      var csLocal = localOf(p, 1);
      for (var gi = 0; gi < glyphs.length; gi++) {
        var along = (gi * 0.073 + csLocal * 0.5 + time * 0.03) % 1;
        var stream = gi % 2;
        var gx = -6.4 + along * 12.8;
        var gy = (stream === 0 ? 0.42 : -0.18) + Math.sin(along * 7.5 + stream) * 0.14;
        glyphs[gi].position.set(gx, gy, 0.35);
      }

      bg.copy(bgA).lerp(bgB, endU);
      scene.background.copy(bg);
      scene.fog.color.copy(bg);
      renderer.setClearColor(bg, 1);

      var compact = window.innerWidth < 800 || window.innerHeight < 700;
      camera.fov = compact ? 46 : 38;
      camera.position.set(
        Math.sin(p * Math.PI * 2) * (compact ? 0.12 : 0.24),
        compact ? 0.72 : 0.26,
        (compact ? 11.6 : 9.05) - Math.sin(Math.min(p, 0.9) * Math.PI) * 0.28
      );
      camera.lookAt(0, compact ? 0.42 : 0.08, 0);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);

      var best = 0;
      var bestV = -1;
      for (var s = 0; s < 7; s++) {
        var pr = presence(p, s);
        if (pr > bestV) {
          bestV = pr;
          best = s;
        }
      }
      if (bestV >= 0.08) held = best;
      var copyOpacity = 1 - smooth(clamp((p - c0) / Math.max(0.0001, (c1 - c0) * 0.75), 0, 1));
      return {
        stage: held,
        copyOpacity: copyOpacity,
        showMath: held === 3 && presence(p, 3) > 0.42 && copyOpacity > 0.25
      };
    }

    function resize() {
      if (dead || !viewport) return;
      var w = viewport.clientWidth;
      var h = viewport.clientHeight;
      if (w < 2 || h < 2) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5));
      renderer.setSize(w, h, false);
    }

    function disposeMaterial(m) {
      if (!m || m.userData.disposed) return;
      m.userData.disposed = true;
      if (m.map && textures.indexOf(m.map) === -1) m.map.dispose();
      m.dispose();
    }

    function dispose() {
      if (dead) return;
      dead = true;
      var seenGeo = [];
      scene.traverse(function (obj) {
        if (obj.geometry && seenGeo.indexOf(obj.geometry) === -1) {
          seenGeo.push(obj.geometry);
          obj.geometry.dispose();
        }
        if (obj.material) {
          var list = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (var i = 0; i < list.length; i++) disposeMaterial(list[i]);
        }
      });
      for (var t = 0; t < textures.length; t++) textures[t].dispose();
      renderer.dispose();
    }

    resize();
    return { render: render, resize: resize, dispose: dispose };
  };
})(window);
