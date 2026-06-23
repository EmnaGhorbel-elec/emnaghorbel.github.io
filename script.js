(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============ BOOT ============ */
  const bootScreen = document.getElementById("boot-screen");
  const line2 = document.getElementById("boot-line-2");
  const line3 = document.getElementById("boot-line-3");
  const bar   = document.getElementById("boot-bar-fill");

  function hideBoot() {
    bootScreen.classList.add("hidden");
    setTimeout(() => { bootScreen.style.display = "none"; }, 550);
  }

  if (reduceMotion || sessionStorage.getItem("booted")) {
    hideBoot();
  } else {
    sessionStorage.setItem("booted", "1");
    let progress = 0;
    const steps = [
      () => { line2.textContent = "> LOADING EMBEDDED_SYSTEMS.LIB ... OK"; },
      () => { line3.textContent = "> LOADING ROBOTICS.LIB ... OK"; },
    ];
    const interval = setInterval(() => {
      progress += 10;
      bar.style.width = progress + "%";
      if (progress === 30) steps[0]();
      if (progress === 65) steps[1]();
      if (progress >= 100) { clearInterval(interval); setTimeout(hideBoot, 350); }
    }, 120);
    const skip = () => { clearInterval(interval); hideBoot(); };
    window.addEventListener("keydown", skip, { once: true });
    bootScreen.addEventListener("click", skip, { once: true });
  }

  /* ============ MOBILE NAV ============ */
  const navToggle = document.getElementById("nav-toggle");
  const navLinks  = document.getElementById("nav-links");
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }));

  /* ============ ACTIVE NAV ============ */
  const navAnchors = document.querySelectorAll("[data-nav]");
  const sections   = document.querySelectorAll("main .section");
  const navObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navAnchors.forEach(a => a.classList.remove("active"));
        const m = document.querySelector(`[data-nav][href="#${e.target.id}"]`);
        if (m) m.classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  sections.forEach(s => navObs.observe(s));

  /* ============ FLASH + SCROLL ============ */
  const flash = document.getElementById("screen-flash");
  function goTo(sel) {
    const t = document.querySelector(sel);
    if (!t) return;
    if (!reduceMotion) {
      flash.classList.add("flashing");
      setTimeout(() => flash.classList.remove("flashing"), 300);
    }
    t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  /* ============ HUB WORLD ============ */
  const hubWorld = document.getElementById("hub-world");
  const player   = document.getElementById("player");
  const signs    = Array.from(document.querySelectorAll(".sign"));
  const hint     = document.getElementById("hub-hint");

  let playerPos = 7;
  let moving = { left: false, right: false };
  let facing = "right";

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function updateNearSign() {
    const W = hubWorld.getBoundingClientRect().width;
    const px = (playerPos / 100) * W;
    let nearest = null, nd = Infinity;
    signs.forEach(s => {
      const sp = (parseFloat(s.style.getPropertyValue("--pos")) / 100) * W;
      const d  = Math.abs(sp - px);
      s.classList.toggle("near", d < 45);
      if (d < nd) { nd = d; nearest = s; }
    });
    return nd < 45 ? nearest : null;
  }

  player.style.left = playerPos + "%";
  updateNearSign();

  requestAnimationFrame(function step() {
    let changed = false;
    if (moving.left)  { playerPos = clamp(playerPos - 0.6, 2, 96); facing = "left";  changed = true; }
    if (moving.right) { playerPos = clamp(playerPos + 0.6, 2, 96); facing = "right"; changed = true; }
    player.classList.toggle("face-left", facing === "left");
    player.classList.toggle("walking", moving.left || moving.right);
    if (changed) {
      player.style.left = playerPos + "%";
      updateNearSign();
      if (hint) hint.style.opacity = "0";
    }
    requestAnimationFrame(step);
  });

  function activateNearSign() {
    const n = updateNearSign();
    if (n) goTo(n.dataset.target);
  }

  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") moving.left  = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moving.right = true;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateNearSign(); }
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") moving.left  = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moving.right = false;
  });

  signs.forEach(s => s.addEventListener("click", () => goTo(s.dataset.target)));

  /* ============ D-PAD ============ */
  const dLeft  = document.getElementById("dpad-left");
  const dRight = document.getElementById("dpad-right");
  const dA     = document.getElementById("dpad-a");

  function bindHold(el, down, up) {
    if (!el) return;
    ["mousedown","touchstart"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); down(); }));
    ["mouseup","mouseleave","touchend"].forEach(ev => el.addEventListener(ev, up));
  }
  bindHold(dLeft,  () => (moving.left  = true), () => (moving.left  = false));
  bindHold(dRight, () => (moving.right = true), () => (moving.right = false));
  if (dA) dA.addEventListener("click", activateNearSign);

  /* ============ OSCILLOSCOPE ============ */
  const oscScreen = document.getElementById("osc-screen");
  const oscLine   = document.getElementById("osc-line");

  function flatLine() {
    return "0,50 680,50";
  }

  function pulsePoints() {
    // Generate a realistic-looking oscilloscope pulse wave
    const pts = [];
    const W = 680, H = 100, mid = 50;
    // flat lead-in
    for (let x = 0; x <= 60; x += 10) pts.push(`${x},${mid}`);
    // first pulse
    pts.push("80,50","90,10","120,10","130,50");
    // flat
    pts.push("160,50");
    // second pulse
    pts.push("180,50","190,10","210,10","220,50");
    // flat
    pts.push("260,50");
    // smaller third
    pts.push("280,50","290,25","310,25","320,50");
    // flat
    pts.push("360,50");
    // negative dip
    pts.push("380,50","390,75","420,75","430,50");
    // flat tail
    for (let x = 450; x <= 680; x += 30) pts.push(`${x},50`);
    return pts.join(" ");
  }

  let pulsed = false;
  function triggerPulse() {
    if (reduceMotion) return;
    oscLine.setAttribute("points", pulsePoints());
    oscLine.style.stroke = "#4dd9c0";
    pulsed = true;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      oscLine.setAttribute("points", flatLine());
      pulsed = false;
    }, 2200);
  }

  let resetTimer;
  if (oscScreen) {
    oscScreen.addEventListener("click", triggerPulse);
    // auto-pulse once when section scrolls into view
    const oscObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !pulsed) {
        setTimeout(triggerPulse, 400);
        oscObs.disconnect();
      }
    }, { threshold: 0.4 });
    const cont = document.getElementById("continue");
    if (cont) oscObs.observe(cont);
  }

  /* ============ KONAMI ============ */
  const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let ki = 0;
  const toast = document.getElementById("cheat-toast");
  window.addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === seq[ki]) {
      ki++;
      if (ki === seq.length) {
        ki = 0;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2400);
      }
    } else {
      ki = k === seq[0] ? 1 : 0;
    }
  });
})();
