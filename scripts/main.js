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
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
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
    var PARTICLE_COUNT = 200;
    var particles = generateBrain(PARTICLE_COUNT);

    /* — Pre-render soft-glow sprites (one per color) — */
    var spriteOlive = createGlowSprite(32, [82, 96, 56]);
    var spriteGold  = createGlowSprite(32, [140, 118, 62]);

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
      var sc = w * 0.52;

      /* — Ambient glow behind the cloud — */
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.38);
      glow.addColorStop(0, 'rgba(110,100,50,0.025)');
      glow.addColorStop(1, 'rgba(110,100,50,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.38, 0, Math.PI * 2);
      ctx.fill();

      /* — Transform each particle: drift → rotate → project — */
      var pts = new Array(particles.length);
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
        var alpha = 0.08 + 0.58 * clamp01((rz2 + 0.8) / 1.6);

        /* Bright nodes: larger, pulsing */
        if (p.bright) {
          size  *= 1.6;
          alpha  = Math.min(0.92, alpha * 1.5 + Math.sin(time * 0.0018 + p.phase) * 0.09);
        }

        pts[i] = { sx: sx, sy: sy, z: rz2, size: size, alpha: alpha, teal: p.teal };
      }

      /* Sort back-to-front (painter's algorithm) */
      pts.sort(function (a, b) { return a.z - b.z; });

      /* — Draw connection lines (neural web) — */
      var thresh  = w * 0.15;
      var thresh2 = thresh * thresh;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 1;

      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var ddx = pts[i].sx - pts[j].sx;
          var ddy = pts[i].sy - pts[j].sy;
          var d2  = ddx * ddx + ddy * ddy;

          if (d2 < thresh2) {
            var d = Math.sqrt(d2);
            var a = (1 - d / thresh) * 0.1 * Math.min(pts[i].alpha, pts[j].alpha);
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
        var drawSize = pt.size * 3.8;
        ctx.drawImage(sprite, pt.sx - drawSize * 0.5, pt.sy - drawSize * 0.5, drawSize, drawSize);
      }

      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(render);
    }

    frameId = requestAnimationFrame(render);
  }


  /* ─────────────────────────────────────────────────────────
     Brain Particle Generation
     Two hemispheres (surface-biased ellipsoids) with anterior
     tapering, posterior bulge, and a thin connecting region.
     ───────────────────────────────────────────────────────── */
  function generateBrain(n) {
    var particles = [];
    var perHemi = Math.floor(n * 0.46);

    for (var i = 0; i < perHemi; i++) addHemisphere(particles, -1);
    for (var i = 0; i < perHemi; i++) addHemisphere(particles,  1);

    /* Corpus callosum / connecting bridge */
    var bridge = n - perHemi * 2;
    for (var i = 0; i < bridge; i++) {
      particles.push(makeParticle(
        (Math.random() - 0.5) * 0.14,
        (Math.random() - 0.5) * 0.38,
        (Math.random() - 0.5) * 0.22
      ));
    }

    return particles;
  }

  function addHemisphere(arr, side) {
    /* Random point in unit sphere, biased toward the surface */
    var u     = Math.random();
    var v     = Math.random();
    var theta = 2 * Math.PI * u;
    var phi   = Math.acos(2 * v - 1);
    var r     = 0.2 + Math.pow(Math.random(), 0.45) * 0.8;   /* surface-heavy */

    var x = r * Math.sin(phi) * Math.cos(theta);
    var y = r * Math.sin(phi) * Math.sin(theta);
    var z = r * Math.cos(phi);

    /* Shape into hemisphere: scale axes + lateral offset */
    x = x * 0.42 + side * 0.28;
    y = y * 0.55;
    z = z * 0.44;

    /* Anterior tapering (front narrows) */
    if (y > 0) {
      x *= 1 - y * 0.18;
      z *= 1 - y * 0.12;
    }

    /* Posterior bulge (back widens slightly) */
    if (y < -0.2) {
      var bulge = Math.abs(y + 0.2) * 0.22;
      x *= 1 + bulge;
    }

    arr.push(makeParticle(x, y, z));
  }

  function makeParticle(x, y, z) {
    return {
      ox: x, oy: y, oz: z,
      size:   0.7 + Math.random() * 1.5,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.18 + Math.random() * 0.65,
      bright: Math.random() < 0.09,
      teal:   Math.random() < 0.15
    };
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
    g.addColorStop(0.2,  'rgba(' + rgb.join(',') + ',0.5)');
    g.addColorStop(0.5,  'rgba(' + rgb.join(',') + ',0.12)');
    g.addColorStop(1,    'rgba(' + rgb.join(',') + ',0)');

    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }


  /* — Utility — */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }


  /* ═══════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════ */
  function init() {
    initFadeIn();
    initPointCloud();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
