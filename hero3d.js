// Homepage hero: a 3D version of the logo whose panels orbit the coral sphere.
// The flat animated logo stays in place until the 3D one has drawn, and remains for
// reduced-motion visitors and browsers without WebGL.
(() => {
  const art = document.querySelector(".hero-art");
  const flat = art && art.querySelector(".hero-mark");
  if (!flat || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try { const c = document.createElement("canvas"); if (!(c.getContext("webgl") || c.getContext("experimental-webgl"))) return; } catch (e) { return; }

  const lib = document.createElement("script");
  lib.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  lib.onload = start;
  document.head.appendChild(lib);

  function start() {
    const CX = 60, CY = 71, DOT = 12, TUBE = 1.9;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", flat.getAttribute("aria-label") + ", shown in 3D with the panels orbiting the circle");
    art.appendChild(canvas);

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { canvas.remove(); return; }
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding;
    const brand = (c) => new THREE.Color(c).convertSRGBToLinear();   // brand colors are sRGB; the renderer works in linear light

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
    camera.position.set(0, 4, 275);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8f8576, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(90, 140, 180); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(-120, -40, -100); scene.add(rim);
    const glow = new THREE.PointLight(0xef6a4c, 0.6, 140); scene.add(glow);
    const logo = new THREE.Group(); scene.add(logo);

    // Panels: sample the flat logo's own outlines and run a round tube along each.
    const tubeMat = new THREE.MeshStandardMaterial({ roughness: 0.36, metalness: 0.12 });
    const setInk = () => tubeMat.color.copy(brand(getComputedStyle(flat).color));
    setInk();
    const panels = [...flat.querySelectorAll(".panel")].map((path, k) => {
      const L = path.getTotalLength(), pts = [];
      for (let i = 0; i < 260; i++) { const p = path.getPointAtLength(L * i / 260); pts.push(new THREE.Vector3(p.x - CX, -(p.y - CY), 0)); }
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5), 520, TUBE, 16, true), tubeMat);
      // Orbit axis: through the sphere, perpendicular to the panel's direction, tilted so the panel passes
      // in front of and behind the sphere. Alternating tilts make the three paths cross.
      const dir = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).normalize();
      const tilt = THREE.MathUtils.degToRad(58) * (k % 2 ? -1 : 1);
      const axis = new THREE.Vector3(0, 0, Math.cos(tilt)).add(new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(Math.sin(tilt))).normalize();
      logo.add(mesh);
      return { mesh, axis };
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(DOT, 64, 48),
      new THREE.MeshPhysicalMaterial({ color: brand(0xef6a4c), roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12, emissive: brand(0x3a0f05), emissiveIntensity: 0.25 }));
    logo.add(sphere);

    const sc = document.createElement("canvas"); sc.width = sc.height = 128;
    const g = sc.getContext("2d"), grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,0.3)"); grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -56; scene.add(shadow);

    const resize = () => { const s = art.clientWidth; renderer.setSize(s, s, false); camera.aspect = 1; camera.updateProjectionMatrix(); };
    new ResizeObserver(resize).observe(art); resize();
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", setInk);
    new MutationObserver(setInk).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Horizontal drag turns the mark (vertical swipes still scroll the page on phones).
    const drag = { on: false, x: 0, yaw: 0 };
    canvas.addEventListener("pointerdown", (e) => { drag.on = true; drag.x = e.clientX; });
    addEventListener("pointermove", (e) => { if (drag.on) { drag.yaw += (e.clientX - drag.x) * 0.01; drag.x = e.clientX; } });
    addEventListener("pointerup", () => { drag.on = false; });
    canvas.addEventListener("pointercancel", () => { drag.on = false; });

    // Pause control, since the motion loops.
    const pause = document.createElement("button");
    pause.type = "button"; pause.className = "hero-pause";
    const label = (p) => { pause.setAttribute("aria-label", p ? "Pause logo animation" : "Play logo animation"); pause.innerHTML = p
      ? '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="4" width="3.5" height="12" rx="1"/></svg>'
      : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z"/></svg>'; };
    let playing = true, onScreen = true, clock = 0.6, last = performance.now();
    label(playing);
    pause.addEventListener("click", () => { playing = !playing; label(playing); });
    art.appendChild(pause);
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(art);

    const easeInOut = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const bump = (x) => (x <= 0 || x >= 1) ? 0 : Math.sin(Math.PI * x);
    const CYCLE = 9.5, START = 2.2, STAGGER = 0.45, RUN = 4.2, q = new THREE.Quaternion();
    let shown = false;

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (playing && onScreen) clock += dt;
      if (onScreen || !shown) {
        const u = clock % CYCLE;
        let pulse = 0;
        panels.forEach((p, k) => {
          const s = (u - (START + k * STAGGER)) / RUN;
          p.mesh.quaternion.copy(q.setFromAxisAngle(p.axis, (s > 0 && s < 1 ? easeInOut(s) : 0) * Math.PI * 2));
          pulse += bump((s - 1) / 0.14);
        });
        sphere.scale.setScalar(1 + 0.14 * pulse + 0.03 * Math.sin(clock * 2.4));
        glow.intensity = 0.6 + 0.9 * pulse;
        if (!drag.on) drag.yaw *= 0.94;
        logo.rotation.set(Math.sin(clock * 0.27) * 0.1, Math.sin(clock * 0.35) * 0.32 + drag.yaw, 0);
        logo.position.y = Math.sin(clock * 0.8) * 1.5;
        renderer.render(scene, camera);
        if (!shown) { shown = true; art.classList.add("is-3d"); }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
