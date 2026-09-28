/* ============================================================
   KNOX — One Piece pirate portfolio interactions
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ==========================================================
     1. ANIMATED OCEAN (layered sine waves + foam + sparkles)
     ========================================================== */
  var canvas = document.getElementById("ocean-canvas");
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  var t = 0;
  var rafId = null;

  var LAYERS = [
    { amp: 13, len: 340, speed: 0.55, y: 0.30, color: "rgba(29,90,134,0.55)" },
    { amp: 16, len: 270, speed: -0.42, y: 0.46, color: "rgba(18,58,92,0.72)" },
    { amp: 19, len: 210, speed: 0.70, y: 0.63, color: "rgba(9,32,55,0.88)" },
    { amp: 22, len: 165, speed: -0.95, y: 0.82, color: "rgba(6,19,34,0.97)" }
  ];

  var glints = [];
  function seedGlints() {
    glints = [];
    var n = Math.round(window.innerWidth / 90);
    for (var i = 0; i < n; i++) {
      glints.push({
        x: Math.random(),
        base: 0.34 + Math.random() * 0.5,
        w: 22 + Math.random() * 60,
        sp: 0.5 + Math.random() * 1.4,
        ph: Math.random() * Math.PI * 2,
        a: 0.12 + Math.random() * 0.4
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight * 0.56;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawOcean() {
    ctx.clearRect(0, 0, W, H);
    t += 0.016;

    // sky-to-sea gradient wash above the waves
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "rgba(29,90,134,0)");
    sky.addColorStop(0.35, "rgba(29,90,134,0.18)");
    sky.addColorStop(1, "rgba(6,19,34,0.35)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < LAYERS.length; i++) {
      var L = LAYERS[i];
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 6) {
        var ph = t * L.speed * 2.2 + (x / L.len) * Math.PI * 2;
        var y = H * L.y + Math.sin(ph) * L.amp + Math.sin(ph * 0.45 + i) * L.amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = L.color;
      ctx.fill();

      // foam crest
      ctx.beginPath();
      for (var x2 = 0; x2 <= W; x2 += 6) {
        var ph2 = t * L.speed * 2.2 + (x2 / L.len) * Math.PI * 2;
        var y2 = H * L.y + Math.sin(ph2) * L.amp + Math.sin(ph2 * 0.45 + i) * L.amp * 0.4;
        if (x2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.strokeStyle = "rgba(233,244,251," + (0.10 + i * 0.06) + ")";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // moonlit / sunlit glints on the surface
    for (var g = 0; g < glints.length; g++) {
      var q = glints[g];
      var fade = Math.max(0, Math.sin(t * q.sp + q.ph));
      if (fade <= 0.02) continue;
      var gx = q.x * W;
      var gy = H * q.base;
      var grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, q.w);
      grad.addColorStop(0, "rgba(255,240,200," + q.a * fade + ")");
      grad.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(gx, gy, q.w, q.w * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = window.requestAnimationFrame(drawOcean);
  }

  resize();
  seedGlints();
  if (!reduceMotion) drawOcean();

  /* ==========================================================
     2. SCROLL REVEAL
     ========================================================== */
  var revealTargets = document.querySelectorAll(
    ".card, .log, .stat, .crew-card, .captain-note, .section-title, .section-sub, .wanted, .compass"
  );
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });

  function show(el) {
    el.classList.add("is-visible");
    /* fail-safe: never leave content invisible if the entrance
       animation is dropped by the renderer */
    window.setTimeout(function () {
      if (parseFloat(getComputedStyle(el).opacity) < 0.9) {
        el.classList.add("reveal-done");
      }
    }, 1500);
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        ro.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });

    revealTargets.forEach(function (el, i) {
      el.style.animationDelay = (i % 3) * 90 + "ms";
      ro.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible", "reveal-done");
    });
  }

  /* ==========================================================
     3. COUNTERS (bounty, captain wanted card, stat grid)
     ========================================================== */
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var divide = parseFloat(el.getAttribute("data-divide") || "1");
    var suffix = el.getAttribute("data-suffix") || "";
    var start = null;
    var dur = 1600;

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt((target * eased) / divide) + suffix;
      if (p < 1) window.requestAnimationFrame(frame);
      else el.textContent = fmt(target / divide) + suffix;
    }
    window.requestAnimationFrame(frame);
  }

  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (reduceMotion) {
          entry.target.textContent =
            fmt(parseFloat(entry.target.getAttribute("data-count")) /
              parseFloat(entry.target.getAttribute("data-divide") || "1")) +
            (entry.target.getAttribute("data-suffix") || "");
        } else {
          countUp(entry.target);
        }
        co.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { co.observe(c); });
  }

  /* ==========================================================
     4. PARALLAX — horizon + sailboat react to scroll
     ========================================================== */
  if (!reduceMotion) {
    var horizon = document.querySelector(".sea-horizon");
    var boat = document.querySelector(".sailboat");
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY;
        if (horizon) horizon.style.transform = "translateY(" + (y * 0.12) + "px)";
        if (boat) {
          boat.style.marginLeft = (y * 0.05) + "px";
          boat.style.marginRight = (-y * 0.02) + "px";
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ==========================================================
     5. TILT on the wanted poster (pointer devices)
     ========================================================== */
  var wanted = document.querySelector(".wanted");
  if (wanted && !reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    var wrap = document.querySelector(".hero-visual");
    wrap.addEventListener("mousemove", function (e) {
      var r = wrap.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      wanted.style.transform =
        "perspective(1100px) rotateY(" + dx * 16 + "deg) rotateX(" + -dy * 16 + "deg) rotate(-1deg)";
    });
    wrap.addEventListener("mouseleave", function () {
      wanted.style.transform = "";
    });
  }

  /* ==========================================================
     6. TYPEWRITER tagline
     ========================================================== */
  var tw = document.querySelector("[data-typewriter]");
  if (tw && !reduceMotion) {
    var words = tw.getAttribute("data-typewriter").split("|");
    var w = 0, c = 0, deleting = false;

    (function type() {
      var word = words[w];
      tw.textContent = word.slice(0, c);

      if (!deleting && c < word.length) {
        c++;
        window.setTimeout(type, 90);
      } else if (!deleting && c === word.length) {
        deleting = true;
        window.setTimeout(type, 1500);
      } else if (deleting && c > 0) {
        c--;
        window.setTimeout(type, 45);
      } else {
        deleting = false;
        w = (w + 1) % words.length;
        window.setTimeout(type, 320);
      }
    })();
  }

  /* ==========================================================
     7. FOOTER YEAR
     ========================================================== */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
