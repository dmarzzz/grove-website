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

    /* — Pre-render soft-glow sprites (one per color, larger) — */
    var spriteOlive = createGlowSprite(48, [82, 96, 56]);
    var spriteGold  = createGlowSprite(48, [140, 118, 62]);

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
      glow.addColorStop(0, 'rgba(110,100,50,0.04)');
      glow.addColorStop(1, 'rgba(110,100,50,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
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
        var alpha = 0.15 + 0.65 * clamp01((rz2 + 0.8) / 1.6);

        /* Bright nodes: larger, pulsing */
        if (p.bright) {
          size  *= 1.8;
          alpha  = Math.min(0.95, alpha * 1.6 + Math.sin(time * 0.0018 + p.phase) * 0.1);
        }

        pts[i] = { sx: sx, sy: sy, z: rz2, size: size, alpha: alpha, teal: p.teal };
      }

      /* Sort back-to-front (painter's algorithm) */
      pts.sort(function (a, b) { return a.z - b.z; });

      /* — Draw connection lines (neural web) — */
      var thresh  = w * 0.18;
      var thresh2 = thresh * thresh;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 1;

      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var ddx = pts[i].sx - pts[j].sx;
          var ddy = pts[i].sy - pts[j].sy;
          var d2  = ddx * ddx + ddy * ddy;

          if (d2 < thresh2) {
            var d = Math.sqrt(d2);
            var a = (1 - d / thresh) * 0.15 * Math.min(pts[i].alpha, pts[j].alpha);
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
        var drawSize = pt.size * 4.5;
        ctx.drawImage(sprite, pt.sx - drawSize * 0.5, pt.sy - drawSize * 0.5, drawSize, drawSize);
      }

      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(render);
    }

    frameId = requestAnimationFrame(render);
  }


  /* ─────────────────────────────────────────────────────────
     Brain Particle Generation
     Anatomically-structured: cerebral hemispheres with dome
     shape, temporal lobes, cerebellum, brainstem, and visible
     midline fissure. Coordinates: x = lateral, y = vertical
     (up on screen), z = front-to-back (rotates with Y spin).
     ───────────────────────────────────────────────────────── */
  function generateBrain(n) {
    var particles = [];
    var mainPer  = Math.floor(n * 0.36);
    var tempPer  = Math.floor(n * 0.07);
    var cerebPer = Math.floor(n * 0.06);

    for (var i = 0; i < mainPer; i++) addCerebralHemi(particles, -1);
    for (var i = 0; i < mainPer; i++) addCerebralHemi(particles,  1);
    for (var i = 0; i < tempPer; i++) addTemporalLobe(particles, -1);
    for (var i = 0; i < tempPer; i++) addTemporalLobe(particles,  1);
    for (var i = 0; i < cerebPer; i++) addCerebellum(particles);

    /* Remaining: corpus callosum + brainstem */
    var remaining = n - (mainPer * 2 + tempPer * 2 + cerebPer);
    for (var i = 0; i < remaining; i++) {
      if (Math.random() < 0.55) {
        /* Corpus callosum — flat band connecting hemispheres */
        particles.push(makeParticle(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.10,
          (Math.random() - 0.5) * 0.30
        ));
      } else {
        /* Brainstem — descends from cerebellum */
        particles.push(makeParticle(
          (Math.random() - 0.5) * 0.07,
          -0.30 - Math.random() * 0.20,
          -0.18 + (Math.random() - 0.5) * 0.10
        ));
      }
    }

    return particles;
  }

  function addCerebralHemi(arr, side) {
    var u = Math.random(), v = Math.random();
    var theta = 2 * Math.PI * u;
    var phi   = Math.acos(2 * v - 1);
    var r     = 0.25 + Math.pow(Math.random(), 0.38) * 0.75;

    var x = r * Math.sin(phi) * Math.cos(theta);
    var y = r * Math.sin(phi) * Math.sin(theta);
    var z = r * Math.cos(phi);

    /* Scale into hemisphere shape + lateral gap */
    x = x * 0.30 + side * 0.30;
    y = y * 0.38;
    z = z * 0.48;

    /* Dome: top rounded, bottom flat */
    if (y > 0) {
      y *= 1.2;
    } else {
      y *= 0.65;
    }

    /* Frontal taper (z > 0 = front narrows) */
    if (z > 0.1) {
      var ft = (z - 0.1) / 0.38;
      x *= 1 - ft * 0.28;
      y *= 1 - ft * 0.12;
    }

    /* Occipital slight bulge (back widens) */
    if (z < -0.18) {
      var ob = Math.abs(z + 0.18) / 0.30;
      x *= 1 + ob * 0.12;
    }

    arr.push(makeParticle(x, y, z));
  }

  function addTemporalLobe(arr, side) {
    var u = Math.random(), v = Math.random();
    var theta = 2 * Math.PI * u;
    var phi   = Math.acos(2 * v - 1);
    var r     = 0.30 + Math.pow(Math.random(), 0.5) * 0.70;

    var x = r * Math.sin(phi) * Math.cos(theta);
    var y = r * Math.sin(phi) * Math.sin(theta);
    var z = r * Math.cos(phi);

    /* Temporal lobe: lateral, below cerebrum, slightly forward */
    x = x * 0.20 + side * 0.28;
    y = y * 0.14 - 0.24;
    z = z * 0.24 + 0.06;

    arr.push(makeParticle(x, y, z));
  }

  function addCerebellum(arr) {
    var u = Math.random(), v = Math.random();
    var theta = 2 * Math.PI * u;
    var phi   = Math.acos(2 * v - 1);
    var r     = 0.30 + Math.pow(Math.random(), 0.5) * 0.70;

    var x = r * Math.sin(phi) * Math.cos(theta);
    var y = r * Math.sin(phi) * Math.sin(theta);
    var z = r * Math.cos(phi);

    /* Cerebellum: behind and below the cerebrum, centered */
    x = x * 0.22;
    y = y * 0.13 - 0.20;
    z = z * 0.15 - 0.34;

    arr.push(makeParticle(x, y, z));
  }

  function makeParticle(x, y, z) {
    return {
      ox: x, oy: y, oz: z,
      size:   1.1 + Math.random() * 2.0,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.18 + Math.random() * 0.65,
      bright: Math.random() < 0.12,
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
     INIT
     ═══════════════════════════════════════════════════════════ */
  function init() {
    initFadeIn();
    initPointCloud();
    initAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
