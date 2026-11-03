// Interactive sections: rotating steppers, flip tiles and a swipeable carousel.
// Every section's text is in the HTML; this script only changes how much is shown at once.
(() => {
  document.documentElement.classList.add("js");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hero spiral: draw it in only when someone can see it; otherwise it simply shows complete.
  const mark = document.querySelector(".hero-mark");
  const line = mark && mark.querySelector(".line");
  if (line && line.animate && !reduceMotion && document.visibilityState === "visible") {
    const length = line.getTotalLength();                       // real length, so this works where pathLength is ignored
    line.style.strokeDasharray = length;
    line.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: 2200, easing: "cubic-bezier(.6,.05,.25,1)", fill: "backwards" })
      .finished.then(() => { line.style.strokeDasharray = ""; }, () => { line.style.strokeDasharray = ""; });
    mark.classList.add("animate");
  }

  // Steppers: tabs that auto-advance while on screen, pause on hover or focus, and stop once someone picks a step.
  document.querySelectorAll("[data-tabs]").forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    const ms = Number(root.dataset.autoplay) || 0;
    let current = 0, timer = null, stopped = !ms || reduceMotion, onScreen = false, paused = false;
    root.style.setProperty("--rotate-ms", ms + "ms");

    function restart() {
      clearTimeout(timer);
      root.classList.remove("playing");
      void root.offsetWidth;                       // restarts the progress-line animation
      if (stopped || !onScreen || paused) return;
      root.classList.add("playing");
      timer = setTimeout(() => show(current + 1), ms);
    }
    function show(n, focus) {
      current = (n + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === current); t.tabIndex = k === current ? 0 : -1; });
      panels.forEach((p, k) => { p.hidden = k !== current; });
      if (focus) tabs[current].focus();
      restart();
    }
    tabs.forEach((t, k) => {
      t.addEventListener("click", () => { stopped = true; show(k); });
      t.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step) { e.preventDefault(); stopped = true; show(current + step, true); }
        if (e.key === "Home" || e.key === "End") { e.preventDefault(); stopped = true; show(e.key === "Home" ? 0 : tabs.length - 1, true); }
      });
    });
    root.addEventListener("pointerenter", () => { paused = true; restart(); });
    root.addEventListener("pointerleave", () => { paused = false; restart(); });
    root.addEventListener("focusin", () => { paused = true; restart(); });
    root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) { paused = false; restart(); } });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; restart(); }, { threshold: 0.35 }).observe(root);
    }
    show(0);
  });

  // Flip tiles: hover flips on devices with a mouse; a tap or Enter keeps a tile turned.
  document.querySelectorAll(".flip-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const on = toggle.getAttribute("aria-pressed") !== "true";
      toggle.setAttribute("aria-pressed", on);
      toggle.parentElement.classList.toggle("is-flipped", on);
    });
  });

  // Carousel: native swipe and scroll-snap, plus arrows, dots and arrow keys.
  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const track = root.querySelector(".carousel-track");
    const slides = [...track.children];
    const dots = [...root.querySelectorAll(".dot")];
    const prev = root.querySelector("[data-prev]");
    const next = root.querySelector("[data-next]");
    const count = root.querySelector(".carousel-count");
    let current = 0, frame = 0;

    const go = (n) => {
      n = Math.max(0, Math.min(slides.length - 1, n));
      const left = slides[n].offsetLeft;
      track.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
      // Fallback: if smooth scrolling didn't finish (some browsers in the background skip it), jump there.
      setTimeout(() => { if (Math.abs(track.scrollLeft - left) > 4) { track.style.scrollBehavior = "auto"; track.scrollLeft = left; track.style.scrollBehavior = ""; update(); } }, 700);
    };
    function update() {
      const step = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : 1;
      current = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / step)));
      dots.forEach((d, k) => d.setAttribute("aria-current", k === current ? "true" : "false"));
      slides.forEach((s, k) => s.setAttribute("aria-hidden", k !== current));
      if (count) count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      prev.disabled = current === 0;
      next.disabled = current === slides.length - 1;
    }
    track.addEventListener("scroll", () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); });
    prev.addEventListener("click", () => go(current - 1));
    next.addEventListener("click", () => go(current + 1));
    dots.forEach((d, k) => d.addEventListener("click", () => go(k)));
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
    });
    addEventListener("resize", update);
    update();
  });
})();
