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
    initAccordion();
    initPaperGlitch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
