/* ============================================================
   The Grove — Scripts
   Progressive enhancement only. Site works fully without JS.
   ============================================================ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     FADE-IN ON SCROLL
     ═══════════════════════════════════════════════════════════ */
  function initFadeIn() {
    var els = document.querySelectorAll('.fade-in');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var scrollRoot = document.querySelector('.page') || null;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, root: scrollRoot });
    els.forEach(function (el) { observer.observe(el); });
  }


  /* ═══════════════════════════════════════════════════════════
     3D BRAIN POINT CLOUD
     A slowly rotating, breathing particle system shaped like
     two cerebral hemispheres. Soft-glow sprites, depth-sorted,
     with faint neural connection lines between nearby points.
     ═══════════════════════════════════════════════════════════ */
  function initPointCloud() {
    var canvas = document.querySelector('.hero__cloud');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var w, h;

    /* — Resize handler (retina-aware) — */
    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    /* — Generate brain-shaped particle distribution — */
    var PARTICLE_COUNT = 320;
    var particles = generateBrain(PARTICLE_COUNT);
    var satellites = generateSatellites();

    /* — Pre-render soft-glow sprites (one per color, larger) — */
    var spriteOlive = createGlowSprite(64, [82, 96, 56]);
    var spriteGold  = createGlowSprite(64, [140, 118, 62]);

    /* — Render loop — */
    var frameId;
    function render(time) {
      ctx.clearRect(0, 0, w, h);

      /* Rotation: slow Y spin + gentle X-axis tilt oscillation */
      var rotY = time * 0.00007;
      var rotX = Math.sin(time * 0.000035) * 0.2;
      var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      var cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      /* Breathing: subtle modulation of drift amplitude */
      var breathe = 1 + Math.sin(time * 0.00025) * 0.04;

      var cx = w / 2;
      var cy = h / 2;
      var sc = w * 0.48;

      /* — Ambient glow behind the cloud — */
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.44);
      glow.addColorStop(0, 'rgba(110,100,50,0.07)');
      glow.addColorStop(1, 'rgba(110,100,50,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
      ctx.fill();

      /* — Transform each particle: drift → rotate → project — */
      var pts = [];
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        /* Per-particle organic drift (3-axis sine, unique phase & speed) */
        var dx = Math.sin(time * 0.0008 * p.speed + p.phase)       * 0.028 * breathe;
        var dy = Math.cos(time * 0.00065 * p.speed + p.phase + 1.5) * 0.028 * breathe;
        var dz = Math.sin(time * 0.0006 * p.speed + p.phase + 3.1)  * 0.022 * breathe;

        var x = p.ox + dx;
        var y = p.oy + dy;
        var z = p.oz + dz;

        /* Rotate Y (horizontal spin) */
        var rx  = x * cosY - z * sinY;
        var rz  = x * sinY + z * cosY;

        /* Rotate X (gentle nod) */
        var ry  = y * cosX - rz * sinX;
        var rz2 = y * sinX + rz * cosX;

        /* Perspective projection */
        var persp = 2.8;
        var s = persp / (persp + rz2);
        var sx = cx + rx * s * sc;
        var sy = cy + ry * s * sc;

        /* Depth-driven size & opacity */
        var size  = p.size * s;
        var alpha = 0.15 + 0.65 * clamp01((rz2 + 0.8) / 1.6);

        /* Bright nodes: larger, pulsing */
        if (p.bright) {
          size  *= 1.8;
          alpha  = Math.min(0.95, alpha * 1.6 + Math.sin(time * 0.0018 + p.phase) * 0.1);
        }

        /* Holographic shimmer — per-particle brightness modulation */
        alpha *= 1.0 + Math.sin(time * 0.003 + p.phase * 10) * 0.06;

        /* Fresnel rim glow — silhouette particles glow brighter */
        var fresnel = 1.0 - Math.abs(rz2) * 1.8;
        if (fresnel > 0) alpha += fresnel * fresnel * 0.25;

        pts.push({ sx: sx, sy: sy, z: rz2, size: size, alpha: alpha, teal: p.teal, group: 0 });
      }

      /* — Transform satellite particles — */
      for (var si = 0; si < satellites.length; si++) {
        var sat = satellites[si];
        var orbAngle = time * sat.orbitSpeed + sat.orbitPhase;
        var flatX = Math.cos(orbAngle) * sat.orbitRadius;
        var flatY = Math.sin(orbAngle) * sat.orbitRadius;
        /* Incline the orbital plane so satellites go above/below */
        var cosInc = Math.cos(sat.orbitTilt);
        var sinInc = Math.sin(sat.orbitTilt);
        var orbX = flatX;
        var orbY = flatY * sinInc;
        var orbZ = flatY * cosInc;

        var selfAngle = time * sat.spinSpeed;
        var cosSelf = Math.cos(selfAngle), sinSelf = Math.sin(selfAngle);

        for (var pi = 0; pi < sat.particles.length; pi++) {
          var p = sat.particles[pi];

          /* Self-rotation (Y-axis) */
          var lx = p.ox * cosSelf - p.oz * sinSelf;
          var lz = p.ox * sinSelf + p.oz * cosSelf;
          var ly = p.oy;

          /* Subtle drift */
          var dx = Math.sin(time * 0.0008 * p.speed + p.phase) * 0.006 * breathe;
          var dy = Math.cos(time * 0.00065 * p.speed + p.phase + 1.5) * 0.006 * breathe;
          var dz = Math.sin(time * 0.0006 * p.speed + p.phase + 3.1) * 0.005 * breathe;

          var x = lx + dx + orbX;
          var y = ly + dy + orbY;
          var z = lz + dz + orbZ;

          /* Global rotation (same as brain) */
          var rx  = x * cosY - z * sinY;
          var rz  = x * sinY + z * cosY;
          var ry  = y * cosX - rz * sinX;
          var rz2 = y * sinX + rz * cosX;

          /* Perspective projection */
          var persp = 2.8;
          var s = persp / (persp + rz2);
          var sx = cx + rx * s * sc;
          var sy = cy + ry * s * sc;

          var size = p.size * s;
          var alpha = 0.12 + 0.55 * clamp01((rz2 + 0.8) / 1.6);
          alpha *= 1.0 + Math.sin(time * 0.003 + p.phase * 10) * 0.06;

          pts.push({ sx: sx, sy: sy, z: rz2, size: size, alpha: alpha, teal: p.teal, group: si + 1 });
        }
      }

      /* Sort back-to-front (painter's algorithm) */
      pts.sort(function (a, b) { return a.z - b.z; });

      /* — Responsive rendering — */
      var compact     = w < 300;
      var glowMul     = compact ? 3.0 : 4.2;
      var lineMul     = compact ? 0.22 : 0.18;
      var lineW       = compact ? 0.8 : 0.6;
      var threshRatio = compact ? 0.20 : 0.16;

      /* — Draw connection lines (neural web) — */
      var thresh  = w * threshRatio;
      var thresh2 = thresh * thresh;
      ctx.lineWidth = lineW;
      ctx.globalAlpha = 1;

      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var ddx = pts[i].sx - pts[j].sx;
          var ddy = pts[i].sy - pts[j].sy;
          var d2  = ddx * ddx + ddy * ddy;

          if (d2 < thresh2) {
            var d = Math.sqrt(d2);
            var samegrp = pts[i].group === pts[j].group;
            var a = (1 - d / thresh) * (samegrp ? lineMul : lineMul * 0.25) * Math.min(pts[i].alpha, pts[j].alpha);
            if (a > 0.003) {
              ctx.beginPath();
              ctx.moveTo(pts[i].sx, pts[i].sy);
              ctx.lineTo(pts[j].sx, pts[j].sy);
              ctx.strokeStyle = 'rgba(90,88,48,' + a.toFixed(3) + ')';
              ctx.stroke();
            }
          }
        }
      }

      /* — Draw particles (soft-glow sprites) — */
      for (var k = 0; k < pts.length; k++) {
        var pt = pts[k];
        ctx.globalAlpha = pt.alpha;
        var sprite   = pt.teal ? spriteGold : spriteOlive;
        var drawSize = pt.size * glowMul;
        ctx.drawImage(sprite, pt.sx - drawSize * 0.5, pt.sy - drawSize * 0.5, drawSize, drawSize);
      }

      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(render);
    }

    frameId = requestAnimationFrame(render);
  }


  /* ─────────────────────────────────────────────────────────
     SDF Brain — Anatomically structured point cloud
     Composite signed distance fields for accurate shape:
     two cerebral hemispheres with visible longitudinal
     fissure, temporal lobes, cerebellum, brainstem.
     Surface-biased sampling with cortical fold noise.
     ───────────────────────────────────────────────────────── */

  /* SDF primitive: distance to ellipsoid surface at origin */
  function sdEllipsoid(px, py, pz, rx, ry, rz) {
    var kx = px / rx, ky = py / ry, kz = pz / rz;
    var k0 = Math.sqrt(kx * kx + ky * ky + kz * kz);
    var kxx = px / (rx * rx), kyy = py / (ry * ry), kzz = pz / (rz * rz);
    var k1 = Math.sqrt(kxx * kxx + kyy * kyy + kzz * kzz);
    return k1 > 0.0001 ? k0 * (k0 - 1.0) / k1 : -1;
  }

  /* Smooth minimum — blends two SDFs organically */
  function smin(a, b, k) {
    var h = Math.max(k - Math.abs(a - b), 0.0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }

  /* Composite brain SDF
     x = lateral, y = vertical (negative = dome/top), z = front-to-back */
  function brainSDF(x, y, z) {
    /* Cerebral hemispheres — two large ellipsoids, clear lateral gap */
    var lh = sdEllipsoid(x + 0.28, y + 0.05, z, 0.26, 0.38, 0.44);
    var rh = sdEllipsoid(x - 0.28, y + 0.05, z, 0.26, 0.38, 0.44);

    /* Temporal lobes — lateral bulges, below and slightly forward */
    var lt = sdEllipsoid(x + 0.28, y - 0.22, z + 0.06, 0.16, 0.12, 0.20);
    var rt = sdEllipsoid(x - 0.28, y - 0.22, z + 0.06, 0.16, 0.12, 0.20);

    /* Cerebellum — compact, below and behind */
    var cb = sdEllipsoid(x, y - 0.20, z - 0.34, 0.20, 0.12, 0.14);

    /* Brainstem — narrow descender */
    var bs = sdEllipsoid(x, y - 0.34, z - 0.20, 0.055, 0.12, 0.055);

    /* Compose: small blend between hemispheres preserves fissure */
    var hemis = smin(lh, rh, 0.02);
    hemis = smin(hemis, lt, 0.06);
    hemis = smin(hemis, rt, 0.06);
    var lower = smin(cb, bs, 0.05);
    return smin(hemis, lower, 0.05);
  }

  /* Multi-frequency sine noise for cortical fold displacement */
  function corticalNoise(x, y, z) {
    return Math.sin(x * 7.3 + y * 2.1) * Math.cos(z * 5.7 + x * 1.3) * 0.5
         + Math.sin(y * 11.1 + z * 3.7) * Math.cos(x * 8.3 + y * 4.1) * 0.25
         + Math.sin(z * 15.3 + x * 5.3) * Math.cos(y * 12.7 + z * 2.9) * 0.125;
  }

  function generateBrain(n) {
    var particles = [];
    var shell = 0.05;
    var maxAttempts = n * 40;
    var attempts = 0;

    while (particles.length < n && attempts < maxAttempts) {
      var x = (Math.random() - 0.5) * 1.4;
      var y = (Math.random() - 0.5) * 1.1;
      var z = (Math.random() - 0.5) * 1.2;

      var d = brainSDF(x, y, z);

      if (Math.abs(d) < shell) {
        /* Reject points in the longitudinal fissure */
        if (Math.abs(x) < 0.05 && y > -0.15 && Math.abs(z) < 0.38) {
          attempts++;
          continue;
        }

        /* Cortical noise displacement — suggests folded surface */
        var noise = corticalNoise(x, y, z);
        var disp = noise * 0.02;
        var len = Math.sqrt(x * x + y * y + z * z);
        if (len > 0.01) {
          x += (x / len) * disp;
          y += (y / len) * disp;
          z += (z / len) * disp;
        }

        particles.push(makeParticle(x, y, z));
      }
      attempts++;
    }

    return particles;
  }

  function makeParticle(x, y, z) {
    return {
      ox: x, oy: y, oz: z,
      size:   0.8 + Math.random() * 1.6,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.18 + Math.random() * 0.65,
      bright: Math.random() < 0.10,
      teal:   Math.random() < 0.15
    };
  }

  function makeSatParticle(x, y, z) {
    return {
      ox: x, oy: y, oz: z,
      size:   0.5 + Math.random() * 0.9,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.2 + Math.random() * 0.5,
      bright: false,
      teal:   Math.random() < 0.2
    };
  }


  /* ─────────────────────────────────────────────────────────
     Satellite Point Clouds — Small geometric shapes orbiting
     the brain. Cube, tetrahedron, octahedron wireframes.
     ───────────────────────────────────────────────────────── */

  function generateCubePoints(scale) {
    var pts = [];
    /* 8 vertices */
    for (var x = -1; x <= 1; x += 2)
      for (var y = -1; y <= 1; y += 2)
        for (var z = -1; z <= 1; z += 2)
          pts.push(makeSatParticle(x * scale, y * scale, z * scale));
    /* 12 edge midpoints */
    for (var a = -1; a <= 1; a += 2)
      for (var b = -1; b <= 1; b += 2) {
        pts.push(makeSatParticle(a * scale, b * scale, 0));
        pts.push(makeSatParticle(a * scale, 0, b * scale));
        pts.push(makeSatParticle(0, a * scale, b * scale));
      }
    return pts;
  }

  function generateTetraPoints(scale) {
    var v = [
      { x:  1, y:  1, z:  1 },
      { x:  1, y: -1, z: -1 },
      { x: -1, y:  1, z: -1 },
      { x: -1, y: -1, z:  1 }
    ];
    var pts = [];
    /* 4 vertices */
    for (var i = 0; i < 4; i++)
      pts.push(makeSatParticle(v[i].x * scale, v[i].y * scale, v[i].z * scale));
    /* 6 edge midpoints */
    for (var i = 0; i < 4; i++)
      for (var j = i + 1; j < 4; j++)
        pts.push(makeSatParticle(
          (v[i].x + v[j].x) * 0.5 * scale,
          (v[i].y + v[j].y) * 0.5 * scale,
          (v[i].z + v[j].z) * 0.5 * scale
        ));
    return pts;
  }

  function generateOctaPoints(scale) {
    var v = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    ];
    var edges = [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]];
    var pts = [];
    /* 6 vertices */
    for (var i = 0; i < 6; i++)
      pts.push(makeSatParticle(v[i].x * scale, v[i].y * scale, v[i].z * scale));
    /* 12 edge midpoints */
    for (var e = 0; e < edges.length; e++) {
      var a = v[edges[e][0]], b = v[edges[e][1]];
      pts.push(makeSatParticle(
        (a.x + b.x) * 0.5 * scale,
        (a.y + b.y) * 0.5 * scale,
        (a.z + b.z) * 0.5 * scale
      ));
    }
    return pts;
  }

  function generateSatellites() {
    var sats = [];
    var TAU = Math.PI * 2;

    /* Procedurally generate many cubes at varied sizes, orbits, and tilts */
    var configs = [
      /* scale, orbitRadius, orbitSpeed, orbitPhase, orbitTilt (inclination), spinSpeed */
      /* Outer — large, slow, varied inclinations */
      [0.09,  0.88,  0.00006,  0.0,         0.15,   0.00018],
      [0.085, 0.90, -0.00007,  TAU * 0.45,  0.70,   0.00022],
      [0.08,  0.85,  0.00005,  TAU * 0.72, -0.55,   0.00015],
      [0.07,  0.82,  0.00008,  TAU * 0.20,  1.20,   0.00020],
      /* Mid — medium, some steeply inclined */
      [0.06,  0.75,  0.00010,  TAU * 0.15, -0.25,   0.00028],
      [0.055, 0.72, -0.00012,  TAU * 0.55,  0.85,   0.00032],
      [0.06,  0.78,  0.00009,  TAU * 0.88, -0.95,   0.00025],
      [0.05,  0.70, -0.00011,  TAU * 0.33,  0.40,   0.00035],
      [0.05,  0.76,  0.00013,  TAU * 0.65, -1.10,   0.00030],
      [0.045, 0.68, -0.00014,  TAU * 0.10,  0.60,   0.00038],
      /* Inner — small, faster, steep orbits above/below */
      [0.04,  0.62, -0.00018,  TAU * 0.05,  1.30,   0.00045],
      [0.035, 0.58,  0.00020,  TAU * 0.38, -0.75,   0.00050],
      [0.035, 0.65, -0.00016,  TAU * 0.70,  0.50,   0.00048],
      [0.03,  0.55,  0.00022,  TAU * 0.92, -1.20,   0.00055],
      [0.03,  0.60, -0.00019,  TAU * 0.28,  0.90,   0.00052],
      /* Close — tiny, fast, polar orbits */
      [0.025, 0.50, -0.00025,  TAU * 0.20,  1.45,   0.00060],
      [0.02,  0.48,  0.00028,  TAU * 0.65, -1.35,   0.00065],
      [0.02,  0.52, -0.00024,  TAU * 0.85,  0.30,   0.00058],
      [0.015, 0.45,  0.00030,  TAU * 0.42, -0.45,   0.00070],
      [0.015, 0.47, -0.00027,  TAU * 0.78,  1.50,   0.00068]
    ];

    for (var i = 0; i < configs.length; i++) {
      var c = configs[i];
      sats.push({
        particles: generateCubePoints(c[0]),
        orbitRadius: c[1],
        orbitSpeed: c[2],
        orbitPhase: c[3],
        orbitTilt: c[4],
        spinSpeed: c[5]
      });
    }

    return sats;
  }


  /* ─────────────────────────────────────────────────────────
     Soft-Glow Sprite
     Pre-rendered radial-gradient circle on an offscreen canvas.
     Stamped per particle via drawImage for performance.
     ───────────────────────────────────────────────────────── */
  function createGlowSprite(size, rgb) {
    var c   = document.createElement('canvas');
    c.width = size; c.height = size;
    var x   = c.getContext('2d');
    var half = size / 2;
    var g    = x.createRadialGradient(half, half, 0, half, half, half);

    g.addColorStop(0,    'rgba(' + rgb.join(',') + ',1)');
    g.addColorStop(0.15, 'rgba(' + rgb.join(',') + ',0.7)');
    g.addColorStop(0.35, 'rgba(' + rgb.join(',') + ',0.3)');
    g.addColorStop(0.6,  'rgba(' + rgb.join(',') + ',0.08)');
    g.addColorStop(1,    'rgba(' + rgb.join(',') + ',0)');

    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }


  /* — Utility — */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }


  /* ═══════════════════════════════════════════════════════════
     CYBERNETIC MARGINALIA — Procedural growth from frame corners
     Recursive branching (vine-like) with sacred geometry nodes,
     architectural grid traces, and mycelium filament terminals.
     Each branch is a single quadratic bezier → reliable animation.
     ═══════════════════════════════════════════════════════════ */
  function initMarginalia() {
    var frame = document.querySelector('.page-frame');
    if (!frame) return;
    if (window.innerWidth <= 900) return;

    /* Deterministic PRNG (mulberry32) */
    function mulberry32(a) {
      return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    var NS = 'http://www.w3.org/2000/svg';
    var rect = frame.getBoundingClientRect();
    var W = rect.width, H = rect.height;

    /* Create SVG container */
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'marginalia');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.style.cssText = 'position:absolute;top:0;left:0;';

    /* ── Helper: create a single SVG <path> and append ── */
    function addPath(d, cls, styles) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      if (styles) {
        for (var k in styles) p.style.setProperty(k, styles[k]);
      }
      svg.appendChild(p);
      return p;
    }

    /* ── Recursive branching — each call creates one bezier path ── */
    function growBranch(x, y, angle, length, depth, maxDepth, rng, delay, paths) {
      if (depth > maxDepth || length < 4) return;

      /* Endpoint + control point for organic curve */
      var wobble = length * (0.15 + rng() * 0.15);
      var perpAngle = angle + (rng() > 0.5 ? 1 : -1) * (0.3 + rng() * 0.4);
      var cx = x + Math.cos(angle) * length * 0.5 + Math.cos(perpAngle) * wobble;
      var cy = y + Math.sin(angle) * length * 0.5 + Math.sin(perpAngle) * wobble;
      var ex = x + Math.cos(angle) * length;
      var ey = y + Math.sin(angle) * length;

      var d = 'M' + x.toFixed(1) + ',' + y.toFixed(1)
            + 'Q' + cx.toFixed(1) + ',' + cy.toFixed(1)
            + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);

      var depthClass = 'marginalia__vine--d' + Math.min(depth, 4);
      paths.push({ d: d, x: ex, y: ey, angle: angle, depth: depth, delay: delay, cls: depthClass });

      /* Sub-branches */
      var branchCount = depth === 0 ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2);
      if (depth >= maxDepth - 1) branchCount = Math.min(branchCount, 1);

      for (var i = 0; i < branchCount; i++) {
        var spread = 0.4 + rng() * 0.6;
        var newAngle = angle + (rng() - 0.5) * spread * 2;
        var shrink = 0.65 + rng() * 0.18;
        var newLen = length * shrink;
        var newDelay = delay + 0.3 + rng() * 0.4;
        growBranch(ex, ey, newAngle, newLen, depth + 1, maxDepth, rng, newDelay, paths);
      }
    }

    /* ── Sacred geometry: golden spiral fragment ── */
    function spiralPath(cx, cy, radius, rng) {
      var phi = 1.618033988749;
      var a0 = rng() * Math.PI * 2;
      var d = '';
      for (var i = 0; i <= 14; i++) {
        var t = i / 14;
        var r = radius * Math.pow(phi, -t * 1.8);
        var a = a0 + t * Math.PI * 2;
        d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1);
      }
      return d;
    }

    /* ── Sacred geometry: concentric diamond ── */
    function diamondPath(cx, cy, size) {
      var d = '';
      for (var s = 0; s < 2; s++) {
        var r = size * (s === 0 ? 1 : 0.5);
        d += 'M' + cx.toFixed(1) + ',' + (cy - r).toFixed(1)
           + 'L' + (cx + r).toFixed(1) + ',' + cy.toFixed(1)
           + 'L' + cx.toFixed(1) + ',' + (cy + r).toFixed(1)
           + 'L' + (cx - r).toFixed(1) + ',' + cy.toFixed(1) + 'Z';
      }
      return d;
    }

    /* ── Sacred geometry: flower-of-life fragment (overlapping circles) ── */
    function flowerCircles(cx, cy, radius, rng) {
      var count = 3 + Math.floor(rng() * 2);
      var a0 = rng() * Math.PI * 2;
      var paths = [];
      for (var i = 0; i < count; i++) {
        var a = a0 + (i / count) * Math.PI * 2;
        var ox = cx + Math.cos(a) * radius * 0.5;
        var oy = cy + Math.sin(a) * radius * 0.5;
        var c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', ox.toFixed(1));
        c.setAttribute('cy', oy.toFixed(1));
        c.setAttribute('r', radius.toFixed(1));
        c.setAttribute('class', 'marginalia__node');
        svg.appendChild(c);
      }
    }

    /* ── Architectural grid traces near a point ── */
    function addGridTraces(x, y, size, rng, fadeDelay) {
      var count = 2 + Math.floor(rng() * 3);
      for (var i = 0; i < count; i++) {
        var horiz = rng() > 0.5;
        var len = size * (0.4 + rng() * 0.6);
        var ox = x + (rng() - 0.5) * size;
        var oy = y + (rng() - 0.5) * size;
        var d;
        if (horiz) {
          d = 'M' + ox.toFixed(1) + ',' + oy.toFixed(1) + 'L' + (ox + len).toFixed(1) + ',' + oy.toFixed(1);
          /* Right-angle tick */
          d += 'M' + ox.toFixed(1) + ',' + (oy - 4).toFixed(1) + 'L' + ox.toFixed(1) + ',' + oy.toFixed(1);
        } else {
          d = 'M' + ox.toFixed(1) + ',' + oy.toFixed(1) + 'L' + ox.toFixed(1) + ',' + (oy + len).toFixed(1);
          d += 'M' + (ox - 4).toFixed(1) + ',' + oy.toFixed(1) + 'L' + ox.toFixed(1) + ',' + oy.toFixed(1);
        }
        addPath(d, 'marginalia__grid marginalia__fade-in', { '--fade-delay': fadeDelay + 's' });
      }
    }

    /* ── Mycelium filaments from a terminal ── */
    function addFilaments(x, y, angle, rng, delay) {
      var count = 3 + Math.floor(rng() * 3);
      for (var i = 0; i < count; i++) {
        var a = angle + (rng() - 0.5) * 2.2;
        var len = 14 + rng() * 24;
        var mx = x + Math.cos(a) * len * 0.45 + (rng() - 0.5) * 6;
        var my = y + Math.sin(a) * len * 0.45 + (rng() - 0.5) * 6;
        var ex = x + Math.cos(a) * len;
        var ey = y + Math.sin(a) * len;
        var d = 'M' + x.toFixed(1) + ',' + y.toFixed(1)
              + 'Q' + mx.toFixed(1) + ',' + my.toFixed(1)
              + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);
        addPath(d, 'marginalia__filament marginalia__draw', {
          '--draw-dur': (0.8 + rng() * 0.6).toFixed(1) + 's',
          '--draw-delay': (delay + 0.5 + rng() * 0.5).toFixed(1) + 's'
        });
      }
    }


    /* ════════════════════════════════════════════════════
       CORNER GROWTH SYSTEMS
       Each corner: multiple starting shoots → recursive branches
       → geometry nodes at forks → grid traces → filaments at tips
       ════════════════════════════════════════════════════ */

    var cornerDefs = [
      /* ── Bottom-left: primary growth, richest — "root system" ── */
      {
        seed: 12345,
        shoots: [
          { angle: -1.45, len: 140 }, /* up along left edge — long reach */
          { angle: -1.20, len: 110 }, /* up and slightly right */
          { angle: -0.90, len: 90 },  /* diagonal into page */
          { angle: -0.55, len: 80 },  /* more rightward diagonal */
          { angle: -0.15, len: 120 }, /* along bottom edge rightward */
          { angle: 0.10,  len: 85 },  /* slightly below horizontal */
        ],
        origin: function () { return { x: 10, y: H - 10 }; },
        maxDepth: 6,
        baseDelay: 0
      },
      /* ── Top-right: secondary growth — "canopy" ── */
      {
        seed: 67890,
        shoots: [
          { angle: 1.50, len: 110 },  /* down along right edge */
          { angle: 1.85, len: 85 },   /* down and slightly left */
          { angle: 2.20, len: 70 },   /* more leftward diagonal */
          { angle: 2.80, len: 95 },   /* along top edge leftward */
          { angle: 3.05, len: 65 },   /* further along top */
        ],
        origin: function () { return { x: W - 10, y: 10 }; },
        maxDepth: 5,
        baseDelay: 1.5
      },
      /* ── Top-left: bridging tendrils ── */
      {
        seed: 11111,
        shoots: [
          { angle: 0.40, len: 70 },   /* diagonal down-right */
          { angle: 0.80, len: 55 },   /* steeper diagonal */
          { angle: 1.45, len: 65 },   /* down along left edge */
          { angle: -0.20, len: 50 },  /* along top edge rightward */
        ],
        origin: function () { return { x: 10, y: 10 }; },
        maxDepth: 4,
        baseDelay: 2.5
      },
      /* ── Bottom-right: geometric focus ── */
      {
        seed: 99999,
        shoots: [
          { angle: -1.70, len: 80 },  /* up along right edge */
          { angle: -2.10, len: 65 },  /* up and leftward */
          { angle: -2.60, len: 55 },  /* more leftward */
          { angle: 3.00, len: 75 },   /* along bottom leftward */
        ],
        origin: function () { return { x: W - 10, y: H - 10 }; },
        maxDepth: 4,
        baseDelay: 2.5,
        geometricFocus: true
      }
    ];


    for (var ci = 0; ci < cornerDefs.length; ci++) {
      var corner = cornerDefs[ci];
      var rng = mulberry32(corner.seed);
      var orig = corner.origin();

      for (var si = 0; si < corner.shoots.length; si++) {
        var shoot = corner.shoots[si];
        var allPaths = [];

        /* Grow recursive branches */
        growBranch(orig.x, orig.y, shoot.angle, shoot.len, 0, corner.maxDepth, rng, corner.baseDelay, allPaths);

        /* Create SVG elements for each branch path */
        for (var pi = 0; pi < allPaths.length; pi++) {
          var bp = allPaths[pi];
          addPath(bp.d, bp.cls + ' marginalia__draw', {
            '--draw-dur': (1.0 + bp.depth * 0.3).toFixed(1) + 's',
            '--draw-delay': bp.delay.toFixed(2) + 's'
          });

          /* Sacred geometry at branch forks (depth 0-2 only) */
          if (bp.depth <= 2 && rng() < 0.55) {
            var nodeDelay = bp.delay + 0.8;
            var nodeType = rng();
            if (corner.geometricFocus || nodeType < 0.35) {
              addPath(diamondPath(bp.x, bp.y, 5 + rng() * 5),
                'marginalia__node marginalia__fade-in', { '--fade-delay': nodeDelay.toFixed(1) + 's' });
            } else if (nodeType < 0.65) {
              addPath(spiralPath(bp.x, bp.y, 7 + rng() * 6, rng),
                'marginalia__node marginalia__fade-in', { '--fade-delay': nodeDelay.toFixed(1) + 's' });
            } else {
              flowerCircles(bp.x, bp.y, 6 + rng() * 4, rng);
            }
          }

          /* Grid traces near mid-depth branches */
          if (bp.depth >= 1 && bp.depth <= 3 && rng() < 0.3) {
            addGridTraces(bp.x, bp.y, 20 + rng() * 15, rng, bp.delay + 0.6);
          }

          /* Mycelium filaments at deep terminals */
          if (bp.depth >= corner.maxDepth - 1 && rng() < 0.6) {
            addFilaments(bp.x, bp.y, bp.angle, rng, bp.delay);
          }
        }
      }
    }

    /* Append to DOM */
    frame.appendChild(svg);

    /* ── Measure all draw-animated paths and set dasharray ── */
    var drawPaths = svg.querySelectorAll('.marginalia__draw');
    for (var di = 0; di < drawPaths.length; di++) {
      var el = drawPaths[di];
      try {
        var len = el.getTotalLength();
        if (len > 0) {
          el.style.setProperty('--path-len', len.toFixed(1));
        } else {
          el.classList.remove('marginalia__draw');
        }
      } catch (e) {
        el.classList.remove('marginalia__draw');
      }
    }

    /* ── Ambient animations — kick in after draw completes ── */
    var ambientRng = mulberry32(77777);
    setTimeout(function () {
      /* Breathing on ~50% of geometry nodes */
      var nodes = svg.querySelectorAll('.marginalia__node');
      for (var ni = 0; ni < nodes.length; ni++) {
        if (ambientRng() < 0.5) {
          nodes[ni].classList.add('marginalia__breathe');
          nodes[ni].style.setProperty('--breathe-dur', (6 + ambientRng() * 6).toFixed(1) + 's');
        }
      }

      /* Drift on ~40% of filaments */
      var filaments = svg.querySelectorAll('.marginalia__filament');
      for (var fi = 0; fi < filaments.length; fi++) {
        if (ambientRng() < 0.4) {
          filaments[fi].classList.add('marginalia__drift');
          filaments[fi].style.setProperty('--drift-dur', (7 + ambientRng() * 6).toFixed(1) + 's');
        }
      }

      /* Glow pulse on ~30% of primary vine paths */
      var vines = svg.querySelectorAll('[class*="marginalia__vine--d0"], [class*="marginalia__vine--d1"]');
      for (var vi = 0; vi < vines.length; vi++) {
        if (ambientRng() < 0.3) {
          vines[vi].classList.add('marginalia__pulse');
          vines[vi].style.setProperty('--pulse-dur', (10 + ambientRng() * 8).toFixed(1) + 's');
        }
      }
    }, 6500);

    /* ── Scroll-reactive growth — branches extend/retract via stroke-dashoffset ──
       d0-d1: always fully drawn (anchored base) with ambient pulse
       d2+:   grow proportionally as user scrolls down, retract on scroll up
       nodes/filaments/grids: fade opacity based on scroll depth
       Activates after the initial draw animation completes (~7s)             ── */
    var page = document.querySelector('.page');
    if (page && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

      var scrollVines = [];
      var scrollNodes = [];
      var scrollGrids = [];
      var scrollFilaments = [];

      var tierRanges = {
        2: { start: 0.03, end: 0.40 },
        3: { start: 0.12, end: 0.55 },
        4: { start: 0.25, end: 0.70 },
        5: { start: 0.35, end: 0.80 },
        6: { start: 0.45, end: 0.90 }
      };

      var scrollTarget = 1;
      var scrollCurrent = 1;
      var scrollRaf = null;
      var scrollReady = false;

      setTimeout(function () {
        for (var tier = 2; tier <= 6; tier++) {
          var paths = svg.querySelectorAll('.marginalia__vine--d' + tier);
          for (var i = 0; i < paths.length; i++) {
            var el = paths[i];
            var pLen = parseFloat(el.style.getPropertyValue('--path-len'));
            if (!pLen || pLen <= 0) continue;

            el.style.animation = 'none';
            el.style.strokeDasharray = pLen.toFixed(1);
            el.style.strokeDashoffset = '0';

            scrollVines.push({ el: el, pathLen: pLen, tier: tier });
          }
        }

        var nEls = svg.querySelectorAll('.marginalia__node');
        for (var ni = 0; ni < nEls.length; ni++) scrollNodes.push(nEls[ni]);

        var gEls = svg.querySelectorAll('.marginalia__grid');
        for (var gi = 0; gi < gEls.length; gi++) scrollGrids.push(gEls[gi]);

        var fEls = svg.querySelectorAll('.marginalia__filament');
        for (var fi = 0; fi < fEls.length; fi++) scrollFilaments.push(fEls[fi]);

        scrollReady = true;

        var initF = page.scrollTop / Math.max(1, page.scrollHeight - page.clientHeight);
        scrollTarget = initF;
        scrollCurrent = 1;
        if (Math.abs(1 - initF) > 0.01) {
          scrollRaf = requestAnimationFrame(tickScrollGrowth);
        }
      }, 7500);

      function applyScrollGrowth(f) {
        for (var vi = 0; vi < scrollVines.length; vi++) {
          var v = scrollVines[vi];
          var range = tierRanges[v.tier] || tierRanges[4];
          var frac = clamp01((f - range.start) / Math.max(0.001, range.end - range.start));
          v.el.style.strokeDashoffset = (v.pathLen * (1 - frac)).toFixed(1);
        }

        var nodeFrac = clamp01((f - 0.05) / 0.45);
        var nodeFilter = 'opacity(' + (0.25 + nodeFrac * 0.75).toFixed(3) + ')';
        for (var nj = 0; nj < scrollNodes.length; nj++) {
          scrollNodes[nj].style.filter = nodeFilter;
        }

        var gridFrac = clamp01((f - 0.10) / 0.50);
        var gridOp = (0.08 + gridFrac * 0.22).toFixed(3);
        for (var gj = 0; gj < scrollGrids.length; gj++) {
          scrollGrids[gj].style.opacity = gridOp;
        }

        var filFrac = clamp01((f - 0.20) / 0.50);
        var filFilter = 'opacity(' + (0.15 + filFrac * 0.85).toFixed(3) + ')';
        for (var fj = 0; fj < scrollFilaments.length; fj++) {
          scrollFilaments[fj].style.filter = filFilter;
        }
      }

      function tickScrollGrowth() {
        scrollCurrent += (scrollTarget - scrollCurrent) * 0.06;
        applyScrollGrowth(scrollCurrent);
        if (Math.abs(scrollTarget - scrollCurrent) > 0.001) {
          scrollRaf = requestAnimationFrame(tickScrollGrowth);
        } else {
          scrollCurrent = scrollTarget;
          applyScrollGrowth(scrollCurrent);
          scrollRaf = null;
        }
      }

      page.addEventListener('scroll', function () {
        if (!scrollReady) return;
        scrollTarget = page.scrollTop / Math.max(1, page.scrollHeight - page.clientHeight);
        if (!scrollRaf) scrollRaf = requestAnimationFrame(tickScrollGrowth);
      }, { passive: true });
    }
  }


  /* ═══════════════════════════════════════════════════════════
     MOBILE ACCORDION — Direction cards expand/collapse
     ═══════════════════════════════════════════════════════════ */
  function initAccordion() {
    var mq = window.matchMedia('(max-width: 900px)');
    if (!mq.matches) return;

    var cards = document.querySelectorAll('.direction');
    if (!cards.length) return;

    /* First card expanded by default */
    cards[0].classList.add('expanded');

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var isOpen = card.classList.contains('expanded');
        cards.forEach(function (c) { c.classList.remove('expanded'); });
        if (!isOpen) card.classList.add('expanded');
      });
    });
  }


  /* ═══════════════════════════════════════════════════════════
     CONSTELLATION — Flat knowledge graph on the about page.
     Gold dots drifting with faint connecting lines.
     ═══════════════════════════════════════════════════════════ */
  function initConstellation() {
    var canvas = document.querySelector('.about__constellation');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    /* ── Constellation definitions ── */
    var CONSTELLATIONS = [
      { // Group A — left, knowledge hub
        nodes: [
          { x: 0.08, y: 0.35 }, { x: 0.15, y: 0.18 }, { x: 0.22, y: 0.32 },
          { x: 0.18, y: 0.52 }, { x: 0.10, y: 0.58 }, { x: 0.25, y: 0.55 }
        ],
        edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[2,5],[3,5]]
      },
      { // Group B — center-left, chain/pathway
        nodes: [
          { x: 0.32, y: 0.68 }, { x: 0.38, y: 0.48 }, { x: 0.42, y: 0.72 },
          { x: 0.48, y: 0.55 }, { x: 0.44, y: 0.35 }
        ],
        edges: [[0,1],[1,2],[2,3],[3,4],[1,3]]
      },
      { // Group C — center-right, triangle cluster
        nodes: [
          { x: 0.58, y: 0.30 }, { x: 0.65, y: 0.15 }, { x: 0.72, y: 0.32 },
          { x: 0.68, y: 0.50 }, { x: 0.62, y: 0.60 }
        ],
        edges: [[0,1],[1,2],[2,0],[2,3],[0,4],[3,4]]
      },
      { // Group D — right, radial/star
        nodes: [
          { x: 0.82, y: 0.45 }, { x: 0.88, y: 0.22 }, { x: 0.95, y: 0.40 },
          { x: 0.90, y: 0.62 }, { x: 0.78, y: 0.65 }, { x: 0.85, y: 0.75 }
        ],
        edges: [[0,1],[0,2],[0,3],[0,4],[3,5],[4,5]]
      }
    ];

    /* Build flat node array + edge list */
    var nodes = [];
    var edges = [];       // { a, b, bridge }
    var groupOffsets = []; // starting index of each group in flat array

    for (var g = 0; g < CONSTELLATIONS.length; g++) {
      var group = CONSTELLATIONS[g];
      var offset = nodes.length;
      groupOffsets.push(offset);

      for (var n = 0; n < group.nodes.length; n++) {
        var def = group.nodes[n];
        nodes.push({
          ox: def.x, oy: def.y,
          x: def.x,  y: def.y,
          vx: (Math.random() - 0.5) * 0.00012,
          vy: (Math.random() - 0.5) * 0.00012,
          size: 3 + Math.random() * 1,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.5,
          bright: Math.random() < 0.25,
          field: false,
          leash: 0.03
        });
      }

      for (var e = 0; e < group.edges.length; e++) {
        edges.push({
          a: offset + group.edges[e][0],
          b: offset + group.edges[e][1],
          bridge: false
        });
      }
    }

    /* Cross-constellation bridges */
    var bridges = [
      [groupOffsets[0] + 2, groupOffsets[1] + 4],  // A[2] — B[4]
      [groupOffsets[1] + 3, groupOffsets[2] + 4],  // B[3] — C[4]
      [groupOffsets[2] + 2, groupOffsets[3] + 0]   // C[2] — D[0]
    ];
    for (var b = 0; b < bridges.length; b++) {
      edges.push({ a: bridges[b][0], b: bridges[b][1], bridge: true });
    }

    /* Secondary nodes — mid-tier fill around constellations */
    var secondaries = [
      /* Near Group A */
      { x: 0.05, y: 0.22 }, { x: 0.13, y: 0.40 }, { x: 0.20, y: 0.15 },
      { x: 0.06, y: 0.48 }, { x: 0.28, y: 0.42 }, { x: 0.15, y: 0.65 },
      /* Near Group B */
      { x: 0.30, y: 0.55 }, { x: 0.35, y: 0.38 }, { x: 0.46, y: 0.65 },
      { x: 0.50, y: 0.45 }, { x: 0.38, y: 0.78 },
      /* Near Group C */
      { x: 0.55, y: 0.20 }, { x: 0.60, y: 0.45 }, { x: 0.70, y: 0.18 },
      { x: 0.75, y: 0.42 }, { x: 0.65, y: 0.65 },
      /* Near Group D */
      { x: 0.80, y: 0.32 }, { x: 0.92, y: 0.52 }, { x: 0.86, y: 0.15 },
      { x: 0.96, y: 0.55 }, { x: 0.76, y: 0.75 }
    ];
    for (var s = 0; s < secondaries.length; s++) {
      nodes.push({
        ox: secondaries[s].x, oy: secondaries[s].y,
        x: secondaries[s].x,  y: secondaries[s].y,
        vx: (Math.random() - 0.5) * 0.00015,
        vy: (Math.random() - 0.5) * 0.00015,
        size: 1.5 + Math.random() * 1,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        bright: false,
        field: false,
        leash: 0.06
      });
    }

    /* Field stars — tiny, dim, atmospheric depth */
    var FIELD_COUNT = 65;
    for (var f = 0; f < FIELD_COUNT; f++) {
      var fx = 0.02 + Math.random() * 0.96;
      var fy = 0.02 + Math.random() * 0.96;
      nodes.push({
        ox: fx, oy: fy,
        x: fx,  y: fy,
        vx: (Math.random() - 0.5) * 0.00015,
        vy: (Math.random() - 0.5) * 0.00015,
        size: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.4,
        bright: false,
        field: true,
        leash: 0
      });
    }

    /* Pre-render glow sprites */
    var spriteSize = 32;
    var sprite = document.createElement('canvas');
    sprite.width = spriteSize; sprite.height = spriteSize;
    var sx = sprite.getContext('2d');
    var sg = sx.createRadialGradient(spriteSize / 2, spriteSize / 2, 0, spriteSize / 2, spriteSize / 2, spriteSize / 2);
    sg.addColorStop(0, 'rgba(140,118,62,1)');
    sg.addColorStop(0.12, 'rgba(140,118,62,0.7)');
    sg.addColorStop(0.3, 'rgba(140,118,62,0.25)');
    sg.addColorStop(0.55, 'rgba(140,118,62,0.06)');
    sg.addColorStop(1, 'rgba(140,118,62,0)');
    sx.fillStyle = sg;
    sx.fillRect(0, 0, spriteSize, spriteSize);

    var bright = document.createElement('canvas');
    bright.width = spriteSize; bright.height = spriteSize;
    var bx = bright.getContext('2d');
    var bg = bx.createRadialGradient(spriteSize / 2, spriteSize / 2, 0, spriteSize / 2, spriteSize / 2, spriteSize / 2);
    bg.addColorStop(0, 'rgba(180,149,69,1)');
    bg.addColorStop(0.12, 'rgba(180,149,69,0.75)');
    bg.addColorStop(0.3, 'rgba(180,149,69,0.3)');
    bg.addColorStop(0.55, 'rgba(180,149,69,0.08)');
    bg.addColorStop(1, 'rgba(180,149,69,0)');
    bx.fillStyle = bg;
    bx.fillRect(0, 0, spriteSize, spriteSize);

    var PROX_DIST = 0.18;

    /* ── Pulse system — random path lights up every 30s ── */
    var anchorCount = 0;
    for (var g = 0; g < CONSTELLATIONS.length; g++) {
      anchorCount += CONSTELLATIONS[g].nodes.length;
    }

    /* Build adjacency list for anchor nodes */
    var adj = {};
    for (var i = 0; i < anchorCount; i++) adj[i] = [];
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (e.a < anchorCount && e.b < anchorCount) {
        adj[e.a].push(e.b);
        adj[e.b].push(e.a);
      }
    }

    function pickPath() {
      /* Random walk through constellation edges, 5-9 steps */
      var start = Math.floor(Math.random() * anchorCount);
      var path = [start];
      var visited = {};
      visited[start] = true;
      var steps = 5 + Math.floor(Math.random() * 5);
      for (var s = 0; s < steps; s++) {
        var cur = path[path.length - 1];
        var neighbors = adj[cur];
        /* Prefer unvisited, but allow revisit if stuck */
        var unvisited = [];
        for (var n = 0; n < neighbors.length; n++) {
          if (!visited[neighbors[n]]) unvisited.push(neighbors[n]);
        }
        var pool = unvisited.length > 0 ? unvisited : neighbors;
        if (pool.length === 0) break;
        var next = pool[Math.floor(Math.random() * pool.length)];
        path.push(next);
        visited[next] = true;
      }
      return path;
    }

    var pulse = null;        // { path, startTime, duration }
    var PULSE_INTERVAL = 30000;
    var PULSE_DURATION = 2500;
    var lastPulse = -PULSE_INTERVAL + 5000; // first pulse after 5s

    function render(time) {
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      /* Update positions — velocity drift + organic sine + leash to origin */
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];

        var dx = Math.sin(time * 0.0004 * n.speed + n.phase) * 0.0003;
        var dy = Math.cos(time * 0.00035 * n.speed + n.phase + 1.5) * 0.0003;

        n.x += n.vx + dx;
        n.y += n.vy + dy;

        /* Leash: pull back toward origin if strayed too far */
        if (n.leash > 0) {
          var lx = n.ox - n.x;
          var ly = n.oy - n.y;
          var ld = Math.sqrt(lx * lx + ly * ly);
          if (ld > n.leash) {
            n.vx += lx * 0.0002;
            n.vy += ly * 0.0002;
          }
        }

        /* Soft bounds */
        if (n.x < 0.01) { n.x = 0.01; n.vx = Math.abs(n.vx); }
        if (n.x > 0.99) { n.x = 0.99; n.vx = -Math.abs(n.vx); }
        if (n.y < 0.02) { n.y = 0.02; n.vy = Math.abs(n.vy); }
        if (n.y > 0.98) { n.y = 0.98; n.vy = -Math.abs(n.vy); }

        /* Damping */
        n.vx *= 0.9995;
        n.vy *= 0.9995;
      }

      /* Draw explicit constellation edges */
      ctx.lineWidth = 0.8;
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        var na = nodes[e.a];
        var nb = nodes[e.b];
        var shimA = 1 + Math.sin(time * 0.002 + na.phase * 5) * 0.15;
        var shimB = 1 + Math.sin(time * 0.002 + nb.phase * 5) * 0.15;
        var avgShim = (shimA + shimB) / 2;
        var alpha = e.bridge ? 0.15 * avgShim : 0.35 * avgShim;
        ctx.strokeStyle = 'rgba(120,105,55,' + alpha + ')';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(na.x * w, na.y * h);
        ctx.lineTo(nb.x * w, nb.y * h);
        ctx.stroke();
      }

      /* Draw proximity connections — light, ephemeral */
      ctx.lineWidth = 0.5;
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var pdx = nodes[i].x - nodes[j].x;
          var pdy = (nodes[i].y - nodes[j].y) * (w / h);
          var pd = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pd < PROX_DIST) {
            var pa = (1 - pd / PROX_DIST) * 0.12;
            ctx.strokeStyle = 'rgba(120,105,55,' + pa + ')';
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * w, nodes[i].y * h);
            ctx.lineTo(nodes[j].x * w, nodes[j].y * h);
            ctx.stroke();
          }
        }
      }

      /* ── Pulse: fire a new path every 30s ── */
      if (time - lastPulse > PULSE_INTERVAL) {
        pulse = { path: pickPath(), startTime: time, duration: PULSE_DURATION };
        lastPulse = time;
      }

      /* Draw pulse glow along path */
      var pulseNodeGlow = {};
      if (pulse) {
        var elapsed = time - pulse.startTime;
        if (elapsed < pulse.duration) {
          var segments = pulse.path.length - 1;
          if (segments > 0) {
            /* Progress: 0 → 1 over duration, with head position advancing */
            var progress = elapsed / pulse.duration;
            /* Head position in segment-space */
            var head = progress * segments;
            /* Trail length in segments */
            var trail = 2.5;

            for (var s = 0; s < segments; s++) {
              /* Segment intensity based on distance from head */
              var segCenter = s + 0.5;
              var dist = head - segCenter;
              /* Only glow segments the head has reached, fade behind */
              if (dist < -0.5) continue;
              var intensity = 0;
              if (dist >= 0) {
                intensity = Math.max(0, 1 - dist / trail);
              } else {
                intensity = Math.max(0, 1 + dist * 2); // leading edge fade-in
              }
              if (intensity <= 0) continue;

              var na = nodes[pulse.path[s]];
              var nb = nodes[pulse.path[s + 1]];

              /* Bright edge */
              ctx.lineWidth = 1.5 * intensity + 0.8;
              ctx.strokeStyle = 'rgba(200,175,90,' + (intensity * 0.7) + ')';
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.moveTo(na.x * w, na.y * h);
              ctx.lineTo(nb.x * w, nb.y * h);
              ctx.stroke();

              /* Track node glow (keep max intensity per node) */
              var nodeA = pulse.path[s];
              var nodeB = pulse.path[s + 1];
              pulseNodeGlow[nodeA] = Math.max(pulseNodeGlow[nodeA] || 0, intensity);
              pulseNodeGlow[nodeB] = Math.max(pulseNodeGlow[nodeB] || 0, intensity);
            }
          }
        } else {
          pulse = null;
        }
      }

      /* Draw nodes */
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var shimmer = 1 + Math.sin(time * 0.002 + n.phase * 5) * 0.15;
        var sz = n.size * 4.5 * shimmer;
        /* Pulse glow: enlarge and brighten nodes on active path */
        var pg = pulseNodeGlow[i] || 0;
        if (pg > 0) {
          sz *= 1 + pg * 0.6;
        }
        var img = (n.bright || pg > 0.3) ? bright : sprite;
        ctx.globalAlpha = n.field ? 0.45 : 1;
        ctx.drawImage(img, n.x * w - sz / 2, n.y * h - sz / 2, sz, sz);
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }


  /* ═══════════════════════════════════════════════════════════
     PAPER GLITCH — Subtle pixel-drift in the bottom-right.
     Fires a few times on load, then goes dormant.
     ═══════════════════════════════════════════════════════════ */
  function initPaperGlitch() {
    var page = document.querySelector('.page');
    if (!page) return;

    /* Create a small glitch element */
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:calc(var(--frame,18px) + 20px);right:calc(var(--frame,18px) + 20px);'
      + 'width:60px;height:18px;pointer-events:none;z-index:50;opacity:0;'
      + 'background:var(--color-bg,#efe5d0);mix-blend-mode:multiply;';
    document.body.appendChild(el);

    function glitch() {
      var dx = (Math.random() - 0.3) * 6;
      var dy = (Math.random() - 0.5) * 3;
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) skewX(' + (Math.random() * 2 - 1) + 'deg)';
      el.style.opacity = (0.15 + Math.random() * 0.2).toFixed(2);
      el.style.width = (30 + Math.random() * 50) + 'px';
      el.style.height = (8 + Math.random() * 14) + 'px';

      /* Flicker 2-4 times rapidly then fade */
      var flickers = 2 + Math.floor(Math.random() * 3);
      var count = 0;
      var interval = setInterval(function () {
        count++;
        if (count >= flickers) {
          clearInterval(interval);
          el.style.opacity = '0';
          return;
        }
        el.style.opacity = count % 2 === 0 ? (0.1 + Math.random() * 0.15).toFixed(2) : '0';
        el.style.transform = 'translate(' + (Math.random() * 4 - 1) + 'px,' + (Math.random() * 3 - 1) + 'px)';
      }, 80 + Math.random() * 60);
    }

    /* Fire on load: two quick glitches */
    setTimeout(glitch, 1200 + Math.random() * 800);
    setTimeout(glitch, 2800 + Math.random() * 600);

    /* Then rare: every 30-90 seconds */
    setInterval(function () {
      if (Math.random() < 0.4) glitch();
    }, 30000 + Math.random() * 60000);
  }


  /* ═══════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════ */
  function init() {
    initFadeIn();
    initPointCloud();
    initMarginalia();
    initConstellation();
    initAccordion();
    initPaperGlitch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
