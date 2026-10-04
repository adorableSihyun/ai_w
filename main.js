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

  /* ----- 날짜 도우미 ----- */
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const pad = (n) => String(n).padStart(2, "0");
  const parseDate = (str) => {
    const [y, m, d] = String(str).trim().split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const withTime = (date, hhmm) => {
    const [hh, mm] = String(hhmm || "00:00").split(":").map(Number);
    const x = new Date(date);
    x.setHours(hh || 0, mm || 0, 0, 0);
    return x;
  };
  const parseDateTime = (str) => {
    const [d, t] = String(str).trim().split(/[ T]+/);
    return withTime(parseDate(d), t || "23:59");
  };
  const addDays = (date, n) => { const x = new Date(date); x.setDate(x.getDate() + n); return x; };
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const fmtDate = (date, withYear) =>
    `${withYear ? `${date.getFullYear()}년 ` : ""}${date.getMonth() + 1}월 ${date.getDate()}일 (${WD[date.getDay()]})`;
  const fmtTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  // '오늘' 기준 (테스트용 덮어쓰기: ?today=YYYY-MM-DD 또는 ?today=YYYY-MM-DDTHH:MM, schedule.todayOverride)
  const sch = C.schedule || {};
  const todayParam = new URLSearchParams(location.search).get("today") || sch.todayOverride;
  const clockOffset = (() => {
    if (!todayParam) return 0;
    const real = new Date();
    if (/^\d{4}-\d{1,2}-\d{1,2}[ T]\d{1,2}:\d{2}$/.test(todayParam)) return parseDateTime(todayParam) - real;
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(todayParam)) return 0;
    const fake = parseDate(todayParam);
    fake.setHours(real.getHours(), real.getMinutes(), real.getSeconds(), real.getMilliseconds());
    return fake - real;
  })();
  const now = () => new Date(Date.now() + clockOffset);

  /* ----- 주차별 일정 계산: 매주 같은 요일, 휴일은 건너뜀 ----- */
  const holidays = new Map((sch.holidays || []).map((hd) => [ymd(parseDate(hd.date)), hd.name]));
  const weeks = (() => {
    let cursor = parseDate(sch.startDate);
    return (C.curriculum.weeks || []).map((w, i) => {
      let date;
      if (w.date) date = parseDate(w.date);
      else {
        while (holidays.has(ymd(cursor))) cursor = addDays(cursor, 7);
        date = cursor;
      }
      cursor = addDays(date, 7);

      let assignment = null;
      if (w.assignment) {
        const a = w.assignment;
        const due = a.due
          ? parseDateTime(a.due)
          : withTime(addDays(date, a.dueAfterDays ?? 6), a.dueTime || "23:59");
        assignment = { ...a, due, submitUrl: a.submitUrl || sch.submitUrl || "" };
      }
      return {
        ...w,
        no: i + 1,
        label: `${i + 1}주`,
        date,
        key: ymd(date),
        startTime: w.startTime || sch.startTime,
        endTime: w.endTime || sch.endTime,
        location: w.location || sch.location,
        assignment,
      };
    });
  })();

  // 마감까지 남은 시간
  const remaining = (due) => {
    const diff = due - now();
    if (diff <= 0) return { state: "closed", text: "마감되었습니다", chip: "마감" };
    const mins = Math.floor(diff / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const text = d > 0 ? `${d}일 ${h}시간 남음` : h > 0 ? `${h}시간 ${m}분 남음` : `${Math.max(1, m)}분 남음`;
    const dayDiff = Math.round((startOfDay(due) - startOfDay(now())) / 86400000);
    return { state: diff < 72 * 3600000 ? "urgent" : "open", text, chip: dayDiff <= 0 ? "D-Day" : `D-${dayDiff}` };
  };

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
  const scheduleText = () => {
    if (!weeks.length) return "";
    const f = weeks[0].date;
    const l = weeks[weeks.length - 1].date;
    return `${f.getFullYear()}. ${f.getMonth() + 1}. ${f.getDate()} – ${l.getMonth() + 1}. ${l.getDate()} (${weeks.length}주)`;
  };
  $(".quick-info").innerHTML = list(
    h.quickInfo,
    (q) => `<div class="card info-card reveal">
      <span class="info-icon" aria-hidden="true">${esc(q.icon)}</span>
      <div><div class="info-label">${esc(q.label)}</div><div class="info-value">${esc(q.auto === "schedule" ? scheduleText() : q.value)}</div></div></div>`
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

  /* ----- 커리큘럼: 주차별 펼쳐 보기 ----- */
  const cu = C.curriculum;
  const timeRange = (w) => `${esc(w.startTime)} – ${esc(w.endTime)}`;

  // 과제 블록 (커리큘럼과 달력 상세에서 함께 사용)
  const assignmentHtml = (w) => {
    const a = w.assignment;
    if (!a) return "";
    const dueMs = a.due.getTime();
    return `<div class="assignment">
      <div class="assignment-head">
        <span class="assignment-icon" aria-hidden="true">📝</span>
        <h4>${esc(a.title || "과제")}</h4>
      </div>
      <p>${esc(a.description)}</p>
      <div class="assignment-foot">
        <div class="due-info">
          <span class="due-label">마감</span>
          <strong>${fmtDate(a.due, true)} ${fmtTime(a.due)}</strong>
          <span class="countdown" data-due="${dueMs}" data-kind="text"></span>
        </div>
        <a class="btn btn-sm submit-btn" data-due="${dueMs}" data-kind="submit" data-week="${w.no}"
           data-href="${esc(a.submitUrl)}" data-label="${esc(a.submitLabel || "과제 제출하기")}" target="_blank" rel="noopener"></a>
      </div>
    </div>`;
  };

  $("#curriculum").innerHTML =
    sectionHead(cu.title, cu.subtitle) +
    `<div class="week-toolbar reveal">
      <span class="week-legend"><span class="legend-chip">📝 과제</span> 과제가 있는 주</span>
      <button class="text-btn" id="toggle-all-weeks" aria-pressed="false">모두 펼치기</button>
    </div>
    <div class="week-list">${list(weeks, (w) => {
      const dueChip = w.assignment
        ? `<span class="due-chip" data-due="${w.assignment.due.getTime()}" data-kind="chip"></span>`
        : "";
      return `<article class="card week-item reveal" id="week-${w.no}">
        <button class="week-head" aria-expanded="false" aria-controls="week-body-${w.no}" id="week-head-${w.no}">
          <span class="week-badge">${esc(w.label)}</span>
          <span class="week-head-main">
            <span class="week-title">${esc(w.title)}</span>
            <span class="week-sub">${fmtDate(w.date)} · ${esc(w.summary || "")}</span>
          </span>
          ${dueChip}
          <span class="chevron" aria-hidden="true"></span>
        </button>
        <div class="week-body" id="week-body-${w.no}" role="region" aria-labelledby="week-head-${w.no}">
          <div><div class="week-body-inner">
            <dl class="week-meta">
              <div><dt>📅 날짜</dt><dd>${fmtDate(w.date, true)}</dd></div>
              <div><dt>⏰ 시간</dt><dd>${timeRange(w)}</dd></div>
              <div><dt>📍 장소</dt><dd>${esc(w.location)}</dd></div>
            </dl>
            ${w.topics && w.topics.length ? `<h4 class="week-h4">학습 내용</h4><ul class="topic-list">${list(w.topics, (t) => `<li>${esc(t)}</li>`)}</ul>` : ""}
            ${w.videos && w.videos.length ? `<h4 class="week-h4">참고 영상</h4><ul class="video-list">${list(
              w.videos,
              (v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener"><span class="play" aria-hidden="true">▶</span>${esc(v.title)}</a></li>`
            )}</ul>` : ""}
            ${assignmentHtml(w)}
          </div></div>
        </div>
      </article>`;
    })}</div>`;

  const setWeekOpen = (item, open) => {
    item.classList.toggle("open", open);
    $(".week-head", item).setAttribute("aria-expanded", String(open));
  };
  const toggleAllBtn = $("#toggle-all-weeks");
  const syncToggleAll = () => {
    const allOpen = $$(".week-item").every((it) => it.classList.contains("open"));
    toggleAllBtn.textContent = allOpen ? "모두 접기" : "모두 펼치기";
    toggleAllBtn.setAttribute("aria-pressed", String(allOpen));
  };
  $("#curriculum").addEventListener("click", (ev) => {
    const head = ev.target.closest(".week-head");
    if (head) {
      const item = head.parentElement;
      setWeekOpen(item, !item.classList.contains("open"));
      syncToggleAll();
    }
  });
  toggleAllBtn.addEventListener("click", () => {
    const open = toggleAllBtn.getAttribute("aria-pressed") !== "true";
    $$(".week-item").forEach((it) => setWeekOpen(it, open));
    syncToggleAll();
  });
  const openWeek = (no) => {
    const item = document.getElementById(`week-${no}`);
    if (!item) return;
    setWeekOpen(item, true);
    item.classList.add("visible");
    syncToggleAll();
    item.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    $(".week-head", item).focus({ preventScroll: true });
  };

  /* ----- 수업 달력 ----- */
  const cal = C.calendar || {};
  const events = new Map(); // "YYYY-MM-DD" → { week, dues: [] }
  const eventsOn = (key) => events.get(key) || events.set(key, { week: null, dues: [] }).get(key);
  weeks.forEach((w) => {
    eventsOn(w.key).week = w;
    if (w.assignment) eventsOn(ymd(w.assignment.due)).dues.push(w);
  });

  $("#calendar").innerHTML =
    sectionHead(cal.title || "수업 달력", cal.subtitle) +
    `<div class="calendar-layout">
      <div class="card calendar reveal">
        <div class="cal-head">
          <button class="cal-nav" data-move="-1" aria-label="이전 달">‹</button>
          <h3 class="cal-title" aria-live="polite"></h3>
          <button class="cal-nav" data-move="1" aria-label="다음 달">›</button>
        </div>
        <div class="cal-grid cal-weekdays" aria-hidden="true">${list(WD, (d, i) => `<span class="${i === 0 ? "sun" : i === 6 ? "sat" : ""}">${d}</span>`)}</div>
        <div class="cal-grid cal-days"></div>
        <div class="cal-foot">
          <div class="cal-legend">
            <span><i class="lg lg-class"></i>수업일</span>
            <span><i class="lg lg-due"></i>과제 마감</span>
            <span><i class="lg lg-holiday"></i>휴강</span>
            <span><i class="lg lg-today"></i>오늘</span>
          </div>
          <button class="text-btn cal-today">오늘로</button>
        </div>
      </div>
      <div class="card cal-detail reveal" aria-live="polite"></div>
    </div>`;

  const calDays = $("#calendar .cal-days");
  const calTitle = $("#calendar .cal-title");
  const calDetail = $("#calendar .cal-detail");
  let viewYear, viewMonth, selectedKey;

  const renderCalendar = () => {
    calTitle.textContent = `${viewYear}년 ${viewMonth + 1}월`;
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayKey = ymd(now());
    let html = "";
    for (let i = 0; i < first.getDay(); i++) html += `<span class="cal-empty"></span>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const key = ymd(date);
      const e = events.get(key);
      const holiday = holidays.get(key);
      const cls = ["cal-day"];
      const labels = [`${viewMonth + 1}월 ${d}일 ${WD[date.getDay()]}요일`];
      if (date.getDay() === 0) cls.push("sun");
      if (date.getDay() === 6) cls.push("sat");
      if (key === todayKey) { cls.push("is-today"); labels.push("오늘"); }
      if (key === selectedKey) cls.push("is-selected");
      if (e && e.week) { cls.push("is-class"); labels.push(`${e.week.label} 수업`); }
      if (e && e.dues.length) { cls.push("has-due"); labels.push("과제 마감"); }
      if (holiday) { cls.push("is-holiday"); labels.push(`${holiday} 휴강`); }
      const tag = e && e.week
        ? `<span class="cal-tag">${esc(e.week.label)}</span>`
        : holiday ? `<span class="cal-tag holiday">${esc(holiday)}</span>` : "";
      html += `<button class="${cls.join(" ")}" data-key="${key}" aria-pressed="${key === selectedKey}" aria-label="${esc(labels.join(", "))}">
        <span class="cal-num">${d}</span>${tag}${e && e.dues.length ? `<span class="cal-dot" aria-hidden="true"></span>` : ""}
      </button>`;
    }
    calDays.innerHTML = html;
  };

  const renderDetail = () => {
    const date = parseDate(selectedKey);
    const e = events.get(selectedKey);
    const holiday = holidays.get(selectedKey);
    let body = "";
    if (e && e.week) {
      const w = e.week;
      body += `<div class="detail-class">
        <div class="detail-week"><span class="week-badge">${esc(w.label)}</span><h4>${esc(w.title)}</h4></div>
        <ul class="detail-meta">
          <li>⏰ ${timeRange(w)}</li>
          <li>📍 ${esc(w.location)}</li>
        </ul>
        ${w.topics && w.topics.length ? `<ul class="topic-list">${list(w.topics, (t) => `<li>${esc(t)}</li>`)}</ul>` : `<p>${esc(w.summary)}</p>`}
        ${w.assignment ? `<p class="detail-note">📝 이번 주 과제: <b>${esc(w.assignment.title)}</b> · 마감 ${fmtDate(w.assignment.due)} ${fmtTime(w.assignment.due)}</p>` : ""}
        <button class="btn btn-sm btn-secondary" data-open-week="${w.no}">${esc(w.label)} 자세히 보기</button>
      </div>`;
    }
    if (e && e.dues.length) {
      body += list(e.dues, (w) => `<div class="detail-due">
        <p class="detail-due-title">⏳ 이날 마감되는 과제 ·${esc(w.label)}</p>
        ${assignmentHtml(w)}
      </div>`);
    }
    if (holiday) body += `<div class="detail-empty"><span aria-hidden="true">🎈</span><p><b>${esc(holiday)}</b> · 휴강입니다.</p></div>`;
    if (!body) body = `<div class="detail-empty"><span aria-hidden="true">🌸</span><p>이날은 수업이 없어요.<br />분홍색으로 표시된 날짜를 눌러 보세요.</p></div>`;
    calDetail.innerHTML = `<p class="detail-date">${fmtDate(date, true)}</p>${body}`;
    updateCountdowns(calDetail);
  };

  const selectDate = (key, moveView) => {
    selectedKey = key;
    if (moveView) {
      const d = parseDate(key);
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
    }
    renderCalendar();
    renderDetail();
  };

  // 처음 보여줄 날짜: 학기 중이면 오늘 이후 가장 가까운 수업일, 아니면 1주차
  const initialKey = (() => {
    if (!weeks.length) return ymd(now());
    const today = startOfDay(now());
    const first = weeks[0].date;
    const last = weeks[weeks.length - 1].date;
    if (today >= first && today <= last) return (weeks.find((w) => w.date >= today) || weeks[weeks.length - 1]).key;
    return weeks[0].key;
  })();

  $("#calendar").addEventListener("click", (evt) => {
    const nav = evt.target.closest(".cal-nav");
    if (nav) {
      const d = new Date(viewYear, viewMonth + Number(nav.dataset.move), 1);
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
      renderCalendar();
      return;
    }
    const day = evt.target.closest(".cal-day");
    if (day) { selectDate(day.dataset.key, false); return; }
    if (evt.target.closest(".cal-today")) { selectDate(ymd(now()), true); return; }
    const open = evt.target.closest("[data-open-week]");
    if (open) openWeek(Number(open.dataset.openWeek));
  });

  /* ----- 마감 남은 시간 표시 (1분마다 갱신) ----- */
  function updateCountdowns(root = document) {
    $$("[data-due]", root).forEach((el) => {
      const r = remaining(new Date(Number(el.dataset.due)));
      const kind = el.dataset.kind;
      if (kind === "chip") {
        el.textContent = r.state === "closed" ? "과제 마감" : `과제 ${r.chip}`;
        el.className = `due-chip ${r.state}`;
      } else if (kind === "text") {
        el.textContent = r.state === "closed" ? "마감되었습니다" : `${r.chip} · ${r.text}`;
        el.className = `countdown ${r.state}`;
      } else if (kind === "submit") {
        // 제출 링크가 비어 있으면 사이트 안의 '학생 공간' 과제 제출로 연결
        const closed = r.state === "closed";
        el.classList.toggle("is-disabled", closed);
        if (closed) {
          el.removeAttribute("href");
          el.setAttribute("aria-disabled", "true");
          el.textContent = "제출 마감";
        } else {
          el.href = el.dataset.href || "#student";
          if (el.dataset.href) el.target = "_blank"; else el.removeAttribute("target");
          el.removeAttribute("aria-disabled");
          el.textContent = el.dataset.label;
        }
      }
    });
  }

  selectDate(initialKey, true);
  updateCountdowns();
  setInterval(() => updateCountdowns(), 60 * 1000);

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
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) =>
          entries.forEach((en) => {
            if (en.isIntersecting) {
              reveal(en.target);
              io.unobserve(en.target);
            }
          }),
        { threshold: 0.12 }
      )
    : null;
  // 나중에 그려지는 요소(features.js)도 등장 효과를 쓰도록 공개
  const observeReveal = (root = document) => {
    const els = root.classList && root.classList.contains("reveal") ? [root, ...$$(".reveal", root)] : $$(".reveal", root);
    els.forEach((el) => (io ? io.observe(el) : reveal(el)));
  };
  observeReveal();

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

  /* ----- features.js(참여 기능)에서 함께 쓰는 도구 ----- */
  window.SiteCore = {
    C, $, $$, esc, list, sectionHead, reduceMotion,
    WD, pad, parseDate, parseDateTime, withTime, addDays, startOfDay, ymd, fmtDate, fmtTime,
    now, weeks, remaining, updateCountdowns, openWeek, observeReveal,
  };
})();
