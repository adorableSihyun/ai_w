/* 화면 렌더링 스크립트 — 내용 수정은 config.js에서 하세요. */
(function () {
  "use strict";

  const C = window.SITE_CONFIG;
  if (!C) {
    document.body.innerHTML = "<p style='padding:24px'>config.js를 불러오지 못했습니다. 파일 이름과 위치를 확인해 주세요.</p>";
    return;
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const list = (arr, fn) => (arr || []).map(fn).join("");
  const sectionHead = (title, subtitle) =>
    `<div class="section-head reveal"><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>`;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 페이지 안 이동(target) 또는 외부 링크(url) 버튼/링크 속성
  const linkAttrs = (item) =>
    item.url
      ? `href="${esc(item.url)}" target="_blank" rel="noopener"`
      : `href="#${esc(item.target)}" data-scroll="${esc(item.target)}"`;

  const s = C.site;
  const fullCourse = `「${s.courseName}」`;

  /* ----- 헤더 ----- */
  document.title = `${fullCourse} 강의 소개 | ${s.university} ${s.department}`;
  $(".brand-text").textContent = `${s.department} ${fullCourse}`;
  $(".site-nav ul").innerHTML = list(C.nav, (n) => `<li><a ${linkAttrs(n)}>${esc(n.label)}</a></li>`);

  /* ----- 첫 화면 ----- */
  const h = C.hero;
  $(".hero-badge").textContent = h.badge;
  $(".hero-dept").textContent = `${s.university} ${s.department}`;
  $(".hero-title").textContent = fullCourse;
  $(".hero-subtitle").textContent = h.subtitle;
  $(".hero-desc").textContent = h.description;
  $(".hero-buttons").innerHTML = list(
    h.buttons,
    (b) => `<a class="btn ${b.style === "secondary" ? "btn-secondary" : ""}" ${linkAttrs(b)}>${esc(b.label)}</a>`
  );
  $(".quick-info").innerHTML = list(
    h.quickInfo,
    (q) => `<div class="card info-card reveal">
      <span class="info-icon" aria-hidden="true">${esc(q.icon)}</span>
      <div><div class="info-label">${esc(q.label)}</div><div class="info-value">${esc(q.value)}</div></div></div>`
  );

  const petals = $(".petals");
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("span");
    const size = 0.6 + Math.random() * 0.8;
    p.className = "petal";
    p.style.left = `${Math.random() * 100}%`;
    p.style.width = `${14 * size}px`;
    p.style.height = `${10 * size}px`;
    p.style.animationDuration = `${9 + Math.random() * 8}s`;
    p.style.animationDelay = `${-Math.random() * 16}s`;
    petals.appendChild(p);
  }

  /* ----- 통계 카드 ----- */
  const toolCount = (C.tools && C.tools.items ? C.tools.items.length : 0);
  $("#stats").innerHTML = `<div class="grid grid-4">${list(C.stats, (st) => {
    const val = st.auto === "tools" ? toolCount : Number(st.value) || 0;
    return `<div class="card stat reveal">
      <div class="stat-value"><span class="count" data-to="${val}">${reduceMotion ? val : 0}</span><span class="stat-suffix">${esc(st.suffix)}</span></div>
      <div class="stat-label">${esc(st.label)}</div></div>`;
  })}</div>`;

  /* ----- 프로그램 소개: 장점 슬라이드 ----- */
  const a = C.about;
  $("#about").innerHTML =
    sectionHead(a.title, a.subtitle) +
    `<div class="slider reveal" role="region" aria-roledescription="carousel" aria-label="강의 장점">
      <div class="slider-track" tabindex="0">${list(
        a.slides,
        (sl, i) => `<article class="card slide" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${a.slides.length}">
          <div class="slide-num">${String(i + 1).padStart(2, "0")}</div>
          <div class="feature-icon" aria-hidden="true">${esc(sl.icon)}</div>
          <h3>${esc(sl.title)}</h3><p>${esc(sl.text)}</p></article>`
      )}</div>
      <div class="slider-controls">
        <button class="slider-btn prev" aria-label="이전 슬라이드">‹</button>
        <div class="slider-dots"></div>
        <button class="slider-btn next" aria-label="다음 슬라이드">›</button>
      </div>
    </div>`;
  initSlider($("#about .slider"), Number(a.autoplaySeconds) || 0);

  /* ----- 커리큘럼 ----- */
  const cu = C.curriculum;
  $("#curriculum").innerHTML =
    sectionHead(cu.title, cu.subtitle) +
    `<div class="grid grid-3">${list(
      cu.weeks,
      (w) => `<article class="card week-card reveal">
        <span class="week-badge">${esc(w.week)}</span>
        <div><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div></article>`
    )}</div>`;

  /* ----- AI 도구 ----- */
  const t = C.tools;
  $("#tools").innerHTML =
    sectionHead(t.title, t.subtitle) +
    `<div class="grid grid-4">${list(t.items, (it) => {
      const tag = it.url ? "a" : "div";
      const attrs = it.url ? ` href="${esc(it.url)}" target="_blank" rel="noopener"` : "";
      return `<${tag} class="card tool-card reveal"${attrs}>
        <div class="tool-top"><span class="tool-icon" aria-hidden="true">${esc(it.icon)}</span><span class="tool-tag">${esc(it.tag)}</span></div>
        <h3>${esc(it.name)}</h3><p>${esc(it.text)}</p></${tag}>`;
    })}</div>`;

  /* ----- 수강 안내 ----- */
  const e = C.enroll;
  $("#enroll").innerHTML =
    sectionHead(e.title, e.subtitle) +
    `<h3 class="sub-title reveal">${esc(e.preparationTitle || "수강 준비물")}</h3>
    <div class="grid grid-3">${list(
      e.preparation,
      (p) => `<div class="card prep-card reveal">
        <span class="prep-icon" aria-hidden="true">${esc(p.icon)}</span>
        <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div></div>`
    )}</div>
    <div class="grid grid-2 enroll-bottom">
      <div class="card reveal"><h3 class="card-title">${esc(e.gradingTitle || "평가 방법")}</h3>${list(
        e.grading,
        (g) => `<div class="bar-row"><div class="bar-label"><span>${esc(g.label)}</span><strong>${esc(g.percent)}%</strong></div>
          <div class="bar"><span data-width="${Number(g.percent) || 0}"></span></div></div>`
      )}</div>
      <div class="card notes reveal"><h3 class="card-title">${esc(e.notesTitle || "유의 사항")}</h3>
        <ul>${list(e.notes, (n) => `<li>${esc(n)}</li>`)}</ul></div>
    </div>`;

  /* ----- FAQ ----- */
  const f = C.faq;
  $("#faq").innerHTML =
    sectionHead(f.title, f.subtitle) +
    `<div class="faq-list">${list(
      f.items,
      (it, i) => `<div class="card faq-item reveal">
        <button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}" id="faq-q-${i}"><span>${esc(it.q)}</span></button>
        <div class="faq-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${esc(it.a)}</p></div></div>
      </div>`
    )}</div>`;

  $("#faq").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".faq-q");
    if (!btn) return;
    const open = btn.parentElement.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });

  /* ----- 푸터: 교수자 소개 ----- */
  const ins = C.instructor;
  const ft = C.footer;
  const avatar = ins.photo
    ? `<img src="${esc(ins.photo)}" alt="${esc(ins.name)} 사진" />`
    : `<span>${esc((ins.name || "?").charAt(0))}</span>`;
  $(".site-footer").innerHTML = `
    <div class="footer-inner">
      <p class="footer-eyebrow">${esc(ins.title || "교수자 소개")}</p>
      <div class="footer-card reveal">
        <div class="footer-profile">
          <div class="avatar">${avatar}</div>
          <div>
            <h3 class="footer-name">${esc(ins.name)}</h3>
            <p class="footer-role">${esc(ins.role)}</p>
          </div>
        </div>
        <div class="footer-bio">
          <p>${esc(ins.bio)}</p>
          ${ins.career && ins.career.length ? `<ul class="career">${list(ins.career, (c) => `<li>${esc(c)}</li>`)}</ul>` : ""}
        </div>
        <ul class="footer-contacts">${list(ins.contacts, (c) => {
          const v = c.href ? `<a href="${esc(c.href)}">${esc(c.value)}</a>` : esc(c.value);
          return `<li><span class="contact-icon" aria-hidden="true">${esc(c.icon)}</span><div><b>${esc(c.label)}</b>${v}</div></li>`;
        })}</ul>
      </div>
      <div class="footer-bottom">
        <span>${esc(ft.text)}</span>
        <span class="footer-links">${list(ft.links, (l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)}</span>
      </div>
    </div>`;

  /* ----- 메뉴 이동 · 모바일 메뉴 ----- */
  const header = $(".site-header");
  const nav = $(".site-nav");
  const toggle = $(".menu-toggle");

  const closeMenu = () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "메뉴 열기");
  };

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  });

  document.addEventListener("click", (ev) => {
    const link = ev.target.closest("[data-scroll]");
    if (link) {
      ev.preventDefault();
      const id = link.dataset.scroll;
      if (id === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", id === "top" ? location.pathname : `#${id}`);
      closeMenu();
    } else if (!ev.target.closest(".site-header")) {
      closeMenu();
    }
  });

  /* ----- 스크롤: 헤더 그림자 · 맨 위로 버튼 · 현재 메뉴 표시 ----- */
  const toTop = $(".to-top");
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const navLinks = $$("a", nav);
  const sections = C.nav.map((n) => document.getElementById(n.target)).filter(Boolean);

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 8);
    toTop.classList.toggle("show", y > 400);

    const probe = y + header.offsetHeight + window.innerHeight * 0.3;
    let current = "";
    for (const sec of sections) if (sec.offsetTop <= probe) current = sec.id;
    if (window.innerHeight + y >= document.documentElement.scrollHeight - 4 && sections.length)
      current = sections[sections.length - 1].id;
    navLinks.forEach((l) => l.classList.toggle("active", l.dataset.scroll === current));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----- 등장 효과 · 평가 막대 · 숫자 올라가기 ----- */
  const countUp = (el) => {
    const to = Number(el.dataset.to) || 0;
    if (reduceMotion || to === 0) { el.textContent = to; return; }
    const start = performance.now();
    const dur = 1400;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const reveal = (el) => {
    el.classList.add("visible");
    $$(".bar > span", el).forEach((b) => (b.style.width = `${b.dataset.width}%`));
    $$(".count", el).forEach(countUp);
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            reveal(en.target);
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12 }
    );
    $$(".reveal").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach(reveal);
  }

  /* ----- 슬라이더 ----- */
  function initSlider(root, autoplaySec) {
    const track = $(".slider-track", root);
    const slides = $$(".slide", track);
    const dotsBox = $(".slider-dots", root);
    const prev = $(".prev", root);
    const next = $(".next", root);
    if (!slides.length) return;

    const step = () => slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
    const maxIndex = () => Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / step()));
    const index = () => Math.round(track.scrollLeft / step());
    const go = (i) => {
      const n = maxIndex();
      const target = i > n ? 0 : i < 0 ? n : i;     // 끝에서 처음으로 순환
      track.scrollTo({ left: target * step(), behavior: reduceMotion ? "auto" : "smooth" });
    };

    const buildDots = () => {
      const n = maxIndex() + 1;
      dotsBox.innerHTML = Array.from({ length: n }, (_, i) =>
        `<button class="dot" aria-label="${i + 1}번째로 이동" data-i="${i}"></button>`).join("");
      update();
    };
    const update = () => {
      const i = index();
      $$(".dot", dotsBox).forEach((d, k) => {
        d.classList.toggle("active", k === i);
        d.setAttribute("aria-current", k === i ? "true" : "false");
      });
    };

    prev.addEventListener("click", () => { go(index() - 1); restart(); });
    next.addEventListener("click", () => { go(index() + 1); restart(); });
    dotsBox.addEventListener("click", (ev) => {
      const d = ev.target.closest(".dot");
      if (d) { go(Number(d.dataset.i)); restart(); }
    });
    track.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowLeft") { ev.preventDefault(); go(index() - 1); restart(); }
      if (ev.key === "ArrowRight") { ev.preventDefault(); go(index() + 1); restart(); }
    });

    let raf;
    track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(buildDots, 150); });
    buildDots();

    // 자동 넘김: 마우스를 올리거나 터치·포커스 중에는 멈춤
    let timer = null;
    let paused = false;
    function restart() {
      clearInterval(timer);
      if (!autoplaySec || reduceMotion) return;
      timer = setInterval(() => { if (!paused && !document.hidden) go(index() + 1); }, autoplaySec * 1000);
    }
    ["mouseenter", "focusin", "touchstart"].forEach((evt) => root.addEventListener(evt, () => (paused = true), { passive: true }));
    ["mouseleave", "focusout", "touchend"].forEach((evt) => root.addEventListener(evt, () => (paused = false), { passive: true }));
    restart();
  }
})();
