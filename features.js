/* 참여 기능: 실시간 투표 · 학생 공간(로그인/출석/과제 제출) · 수강 신청서 · 안내 팝업 · 첫 방문 폭죽
 * 내용 수정은 config.js에서 하세요. main.js 다음에 불러와야 합니다. */
(function () {
  "use strict";

  const S = window.SiteCore;
  if (!S) return;
  const { C, $, $$, esc, list, sectionHead, reduceMotion, fmtDate, fmtTime, ymd, withTime, startOfDay, now, weeks, remaining } = S;

  /* =====================================================================
   *  저장소 (데모 모드: 브라우저 localStorage)
   *  여러 학생이 실제로 공유하려면 read / write / on 세 함수만
   *  Firebase 등 서버 저장소로 바꾸면 나머지 코드는 그대로 동작합니다.
   * ===================================================================== */
  const API = !!S.SERVER_MODE;
  const store = (() => {
    const PREFIX = "aiweb:";
    const mem = new Map();
    // 서버 모드에서는 여럿이 함께 쓰는 데이터를 서버(DB)가 가지고 있으므로 브라우저에는 저장하지 않음 (메모리 캐시만)
    const memOnly = (key) => API && /^(poll:[^:]+$|applications$|roster$|knownStudents$|attendance:|submissions:)/.test(key);
    const listeners = new Map();
    let ls = null;
    try {
      ls = window.localStorage;
      ls.setItem(PREFIX + "__test", "1");
      ls.removeItem(PREFIX + "__test");
    } catch (e) {
      ls = null;
    }
    const read = (key, fallback) => {
      try {
        if (ls && !memOnly(key)) {
          const raw = ls.getItem(PREFIX + key);
          if (raw != null) return JSON.parse(raw);
        }
      } catch (e) { /* 저장소를 못 읽으면 메모리 값 사용 */ }
      return mem.has(key) ? mem.get(key) : fallback;
    };
    const emit = (key) => (listeners.get(key) || []).forEach((fn) => fn());
    let channel = null;
    try {
      channel = new BroadcastChannel("aiweb-store");
      channel.onmessage = (e) => emit(e.data);
    } catch (e) { channel = null; }
    const write = (key, value) => {
      mem.set(key, value);
      emit(key);
      if (memOnly(key)) return;
      try { if (ls) ls.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* 용량 초과 등 */ }
      if (channel) channel.postMessage(key); // 같은 브라우저의 다른 탭에 실시간 반영
    };
    const remove = (key) => {
      mem.delete(key);
      try { if (ls) ls.removeItem(PREFIX + key); } catch (e) { /* 무시 */ }
      emit(key);
      if (channel) channel.postMessage(key);
    };
    window.addEventListener("storage", (e) => {
      if (!channel && e.key && e.key.indexOf(PREFIX) === 0) emit(e.key.slice(PREFIX.length));
    });
    const on = (key, fn) => {
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(fn);
    };
    // 접두어로 시작하는 저장 키 목록 (관리자 화면의 출석·제출 집계용)
    const keys = (prefix = "") => {
      const out = new Set([...mem.keys()].filter((k) => k.indexOf(prefix) === 0));
      try {
        if (ls) for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k && k.indexOf(PREFIX + prefix) === 0) out.add(k.slice(PREFIX.length));
        }
      } catch (e) { /* 무시 */ }
      return [...out];
    };
    return { read, write, remove, on, keys };
  })();

  // 서버 API 호출 (실패하면 서버가 보낸 한국어 오류 문구로 예외)
  const api = async (path, { method = "GET", body, raw, headers = {} } = {}) => {
    const opts = { method, headers: { ...headers } };
    if (raw !== undefined) opts.body = raw;
    else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers["Content-Type"] = "application/json"; }
    let res;
    try { res = await fetch(path, opts); } catch (e) { throw new Error("서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요."); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `요청을 처리하지 못했어요. (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  };

  /* ----- 공통 도우미 ----- */
  const josa = (word, withBatchim, without) => {
    const code = String(word).charCodeAt(String(word).length - 1);
    if (code < 0xac00 || code > 0xd7a3) return `${word}${withBatchim}(${without})`;
    return word + ((code - 0xac00) % 28 ? withBatchim : without);
  };
  const fmtSize = (bytes) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const fmtStamp = (ms) => { const d = new Date(ms); return `${fmtDate(d)} ${fmtTime(d)}`; };
  const scrollToEl = (el) => el && el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

  // 알림 토스트
  const toastBox = document.createElement("div");
  toastBox.className = "toast-box";
  toastBox.setAttribute("role", "status");
  toastBox.setAttribute("aria-live", "polite");
  document.body.appendChild(toastBox);
  const toast = (msg, type = "info") => {
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    toastBox.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 400);
    }, 3200);
  };

  /* =====================================================================
   *  참여하기 섹션 (투표 + 학생 공간)
   * ===================================================================== */
  const P = C.participate || {};
  const poll = C.poll || { options: [] };
  const stu = C.student || {};
  $("#participate").innerHTML =
    sectionHead(P.title || "참여하기", P.subtitle, P.eyebrow || "Join us") +
    (P.demoNotice && !API ? `<p class="demo-notice reveal"><span aria-hidden="true">🧪</span>${esc(P.demoNotice)}</p>` : "") +
    `<div class="card poll reveal" id="poll">
      <div class="poll-head">
        <span class="live-badge"><i aria-hidden="true"></i>실시간 투표</span>
        <h3>${esc(poll.title)}</h3>
        <p>${esc(poll.description || "")}</p>
      </div>
      <div class="poll-body">
        <div class="poll-side">
          <div class="poll-options" role="radiogroup" aria-label="${esc(poll.title)}"></div>
          <div class="poll-actions"></div>
        </div>
        <div class="poll-result">
          <div class="poll-chart" aria-live="polite"></div>
          <p class="poll-meta"></p>
        </div>
      </div>
    </div>
    <div class="card student reveal" id="student"></div>`;

  /* ----- 실시간 투표 ----- */
  const pollKey = `poll:${poll.id || "default"}`;
  const pollMineKey = `${pollKey}:mine`;
  let pollChoice = null;
  // 이 브라우저를 구분하는 무작위 값 (서버에서 한 사람 한 표로 셈)
  const voterId = () => {
    let id = store.read("voterId", null);
    if (!id) {
      id = `v-${Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
      store.write("voterId", id);
    }
    return id;
  };

  const pollCounts = () => {
    const local = store.read(pollKey, {}) || {};
    return poll.options.map((o) => ({ ...o, count: (Number(o.seed) || 0) + (Number(local[o.id]) || 0) }));
  };

  const renderPoll = () => {
    const mine = store.read(pollMineKey, null);
    const rows = pollCounts();
    const total = rows.reduce((a, r) => a + r.count, 0);
    const top = Math.max(0, ...rows.map((r) => r.count));
    if (!pollChoice) pollChoice = mine;

    $("#poll .poll-options").innerHTML = list(poll.options, (o) => {
      const on = pollChoice === o.id;
      return `<button type="button" class="poll-option${on ? " selected" : ""}${mine === o.id ? " voted" : ""}"
        role="radio" aria-checked="${on}" data-id="${esc(o.id)}" ${mine ? "disabled" : ""}>
        <span class="poll-icon" aria-hidden="true">${esc(o.icon || "")}</span>
        <span class="poll-label">${esc(o.label)}</span>
        <span class="poll-check" aria-hidden="true"></span>
      </button>`;
    });

    const myOpt = poll.options.find((o) => o.id === mine);
    $("#poll .poll-actions").innerHTML = mine
      ? `<p class="poll-done">✅ <b>${esc(myOpt ? myOpt.label : "")}</b>에 투표했어요!</p>
         <button type="button" class="text-btn" data-poll="revote">다시 투표하기</button>`
      : `<button type="button" class="btn" data-poll="vote" ${pollChoice ? "" : "disabled"}>투표하기</button>
         <span class="poll-hint">${pollChoice ? "" : "주제를 하나 골라 주세요"}</span>`;

    $("#poll .poll-chart").innerHTML = list(rows, (r) => {
      const pct = total ? Math.round((r.count / total) * 1000) / 10 : 0;
      return `<div class="poll-row${mine === r.id ? " mine" : ""}${r.count === top && top > 0 ? " leader" : ""}">
        <div class="poll-row-label">
          <span>${esc(r.icon || "")} ${esc(r.label)}${r.count === top && top > 0 ? ' <span class="crown" title="1위">👑</span>' : ""}${mine === r.id ? ' <span class="my-tag">내 선택</span>' : ""}</span>
          <span class="poll-num"><b>${pct}%</b> · ${r.count}표</span>
        </div>
        <div class="poll-bar" role="img" aria-label="${esc(r.label)} ${pct}퍼센트, ${r.count}표"><span style="width:${pct}%"></span></div>
      </div>`;
    });
    $("#poll .poll-meta").innerHTML =
      `총 <b>${total}</b>표 참여${poll.seedNote && poll.options.some((o) => o.seed) ? ` · ${esc(poll.seedNote)}` : ""}`;
  };

  $("#poll").addEventListener("click", (e) => {
    const opt = e.target.closest(".poll-option");
    if (opt && !opt.disabled) {
      pollChoice = opt.dataset.id;
      renderPoll();
      $(`#poll .poll-option[data-id="${CSS.escape(pollChoice)}"]`).focus();
      return;
    }
    const act = e.target.closest("[data-poll]");
    if (!act) return;
    const mine = store.read(pollMineKey, null);
    if (API) {
      // 서버 모드: 브라우저마다 한 표 (다시 투표하면 표가 옮겨짐)
      const isVote = act.dataset.poll === "vote" && pollChoice && !mine;
      if (!isVote && !(act.dataset.poll === "revote" && mine)) return;
      act.disabled = true;
      api(`/api/poll/${encodeURIComponent(poll.id || "default")}/vote`, {
        method: isVote ? "POST" : "DELETE",
        body: { voter: voterId(), optionId: pollChoice },
      }).then((d) => {
        store.write(pollKey, d.counts);
        if (isVote) { store.write(pollMineKey, pollChoice); toast("투표해 주셔서 고마워요! 🌿", "success"); }
        else { pollChoice = mine; store.remove(pollMineKey); }
      }).catch((err) => { toast(err.message, "warn"); renderPoll(); });
      return;
    }
    const local = { ...(store.read(pollKey, {}) || {}) };
    if (act.dataset.poll === "vote" && pollChoice && !mine) {
      local[pollChoice] = (Number(local[pollChoice]) || 0) + 1;
      store.write(pollKey, local);
      store.write(pollMineKey, pollChoice);
      toast("투표해 주셔서 고마워요! 🌿", "success");
    } else if (act.dataset.poll === "revote" && mine) {
      local[mine] = Math.max(0, (Number(local[mine]) || 0) - 1);
      store.write(pollKey, local);
      pollChoice = mine;
      store.remove(pollMineKey);
    }
  });
  // 방향키로 선택지 이동
  $("#poll .poll-options").addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const btns = $$(".poll-option:not([disabled])", e.currentTarget);
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = btns[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
    next.click();
  });
  store.on(pollKey, renderPoll);
  store.on(pollMineKey, () => { pollChoice = store.read(pollMineKey, null) || pollChoice; renderPoll(); });
  renderPoll();
  if (API) {
    // 서버의 최신 투표 결과를 10초마다 가져와 실시간처럼 보여 줌
    const refreshPoll = () => {
      if (document.hidden) return;
      api(`/api/poll/${encodeURIComponent(poll.id || "default")}`)
        .then((d) => store.write(pollKey, d.counts))
        .catch(() => { /* 잠깐 끊겨도 다음 주기에 다시 시도 */ });
    };
    refreshPoll();
    setInterval(refreshPoll, 10000);
    document.addEventListener("visibilitychange", refreshPoll);
  }

  /* ----- 학생 공간: 로그인 · 출석 · 과제 제출 ----- */
  const att = stu.attendance || {};
  const sub = stu.submission || {};
  const accept = (sub.accept || []).map((x) => x.toLowerCase());
  const maxBytes = (Number(sub.maxFileMB) || 20) * 1048576;
  const assignmentWeeks = weeks.filter((w) => w.assignment);
  let pendingWeek = null;   // 커리큘럼의 '제출하기'에서 넘어온 주차
  let chosenFile = null;

  const session = () => store.read("session", null);
  const attKey = (sid) => `attendance:${sid}`;
  const subKey = (sid) => `submissions:${sid}`;

  const classState = () => {
    const n = now();
    const w = weeks.find((x) => x.key === ymd(n));
    const next = weeks.find((x) => withTime(x.date, x.startTime) > n && x.key !== ymd(n));
    if (!w) return { state: "none", next };
    const start = withTime(w.date, w.startTime);
    const end = withTime(w.date, w.endTime);
    const open = new Date(start.getTime() - (Number(att.openBeforeMin) || 0) * 60000);
    const late = new Date(start.getTime() + (Number(att.lateAfterMin) || 0) * 60000);
    if (n < open) return { state: "before", week: w, open };
    if (n < late) return { state: "ontime", week: w };
    if (n <= end) return { state: "late", week: w };
    return { state: "ended", week: w, next };
  };

  const loginHtml = (prefill = {}) => `
    <div class="student-login">
      <div class="login-intro">
        <span class="login-emoji" aria-hidden="true">🎓</span>
        <h3>${esc(stu.loginTitle || "수강생 로그인")}</h3>
        <p>로그인하면 출석 체크와 과제 제출을 할 수 있어요.</p>
      </div>
      <form class="login-form" novalidate>
        <div class="field">
          <label for="login-id">학번 <span class="req" aria-hidden="true">*</span></label>
          <input id="login-id" name="studentId" inputmode="numeric" autocomplete="username" placeholder="2024123456" value="${esc(prefill.studentId || "")}" aria-describedby="login-id-err" />
          <p class="field-error" id="login-id-err"></p>
        </div>
        <div class="field">
          <label for="login-name">이름 <span class="req" aria-hidden="true">*</span></label>
          <input id="login-name" name="name" autocomplete="name" placeholder="홍길동" value="${esc(prefill.name || "")}" aria-describedby="login-name-err" />
          <p class="field-error" id="login-name-err"></p>
        </div>
        <button class="btn" type="submit">로그인</button>
        <p class="login-hint">${esc(stu.loginHint || "")}</p>
      </form>
    </div>`;

  const renderStudent = () => {
    const box = $("#student");
    const me = session();
    if (!me) {
      box.innerHTML = loginHtml(store.read("lastApplicant", {}) || {});
      return;
    }
    box.innerHTML = `
      <div class="student-head">
        <div class="student-hello">
          <span class="avatar-sm" aria-hidden="true">${esc(me.name.charAt(0))}</span>
          <div><h3>${esc(me.name)} 님, 반가워요!</h3><p>학번 ${esc(me.studentId)}</p></div>
        </div>
        <button class="text-btn" data-action="logout">로그아웃</button>
      </div>
      <div class="student-grid">
        <div class="panel attendance-panel">
          <h4 class="panel-title">🙋 출석 체크</h4>
          <div class="att-now"></div>
          <div class="att-stats"></div>
          <div class="att-weeks" aria-label="주차별 출석 현황"></div>
        </div>
        <div class="panel submit-panel">
          <h4 class="panel-title">📤 과제 제출</h4>
          <div class="submit-area"></div>
          <h5 class="panel-sub">내 제출 기록</h5>
          <ul class="my-submissions"></ul>
        </div>
      </div>`;
    renderAttendance();
    renderSubmit();
  };

  const renderAttendance = () => {
    const me = session();
    const panel = $("#student .attendance-panel");
    if (!me || !panel) return;
    const rec = store.read(attKey(me.studentId), {}) || {};
    const cs = classState();
    let html = "";
    const todayRec = cs.week && rec[cs.week.no];
    const nextText = (w) => (w ? `다음 수업: <b>${fmtDate(w.date)} ${esc(w.startTime)}</b> · ${esc(w.label)} ${esc(w.title)}` : "이번 학기 수업이 모두 끝났어요.");
    if (todayRec) {
      html = `<div class="att-box done"><p class="att-big">${todayRec.status === "late" ? "⏰ 지각" : "✅ 출석"} 완료</p>
        <p>${esc(cs.week.label)} ${esc(cs.week.title)} · ${fmtTime(new Date(todayRec.time))}에 체크했어요.</p></div>`;
    } else if (cs.state === "none") {
      html = `<div class="att-box"><p class="att-big">오늘은 수업이 없어요</p><p>${nextText(cs.next)}</p></div>`;
    } else if (cs.state === "before") {
      html = `<div class="att-box"><p class="att-big">${esc(cs.week.label)} 수업 날이에요!</p>
        <p>출석 체크는 <b>${fmtTime(cs.open)}</b>부터 할 수 있어요. (${esc(cs.week.startTime)} 수업 시작)</p>
        <button class="btn" disabled>출석 체크하기</button></div>`;
    } else if (cs.state === "ontime" || cs.state === "late") {
      const isLate = cs.state === "late";
      html = `<div class="att-box ${isLate ? "warn" : "open"}"><p class="att-big">${esc(cs.week.label)} · ${esc(cs.week.title)}</p>
        <p>${isLate ? `수업 시작 ${Number(att.lateAfterMin) || 0}분이 지나 <b>지각</b>으로 기록돼요.` : "지금 출석 체크할 수 있어요."} (${esc(cs.week.location)})</p>
        <button class="btn" data-action="attend">${isLate ? "지각으로 출석 체크" : "출석 체크하기"}</button></div>`;
    } else {
      html = `<div class="att-box"><p class="att-big">오늘 수업이 끝났어요</p><p>${esc(cs.week.label)} 출석 체크가 마감되었습니다.<br />${nextText(cs.next)}</p></div>`;
    }
    $(".att-now", panel).innerHTML = html;

    // 주차별 현황과 출석률
    const n = now();
    let present = 0, late = 0, absent = 0;
    const chips = weeks.map((w) => {
      const r = rec[w.no];
      const ended = withTime(w.date, w.endTime) < n;
      let st = "upcoming", label = "예정";
      if (r) { st = r.status; label = r.status === "late" ? "지각" : "출석"; r.status === "late" ? late++ : present++; }
      else if (ended) { st = "absent"; label = "결석"; absent++; }
      else if (w.key === ymd(n)) { st = "today"; label = "오늘"; }
      return `<span class="att-chip ${st}" title="${esc(w.label)} ${fmtDate(w.date)} · ${label}"><b>${w.no}</b><small>${label}</small></span>`;
    });
    const counted = present + late + absent;
    const rate = counted ? Math.round(((present + late) / counted) * 100) : 0;
    $(".att-stats", panel).innerHTML = `
      <div class="att-rate"><span>출석률</span><b>${counted ? `${rate}%` : "-"}</b></div>
      <div class="bar"><span style="width:${rate}%"></span></div>
      <p class="att-counts"><span class="dot present"></span>출석 ${present} <span class="dot late"></span>지각 ${late} <span class="dot absent"></span>결석 ${absent}</p>`;
    $(".att-weeks", panel).innerHTML = chips.join("");
  };

  const renderSubmit = () => {
    const me = session();
    const area = $("#student .submit-area");
    if (!me || !area) return;
    const subs = store.read(subKey(me.studentId), {}) || {};
    if (!assignmentWeeks.length) {
      area.innerHTML = `<p>등록된 과제가 없어요.</p>`;
      return;
    }
    // 기본 선택: 넘어온 주차 → 아직 마감 전인 첫 과제 → 마지막 과제
    const sel = $("#submit-week", area);
    const current = pendingWeek
      || (sel && Number(sel.value))
      || (assignmentWeeks.find((w) => remaining(w.assignment.due).state !== "closed") || assignmentWeeks[assignmentWeeks.length - 1]).no;
    pendingWeek = null;
    const w = weeks.find((x) => x.no === current) || assignmentWeeks[0];
    const a = w.assignment;
    const closed = remaining(a.due).state === "closed";
    const prev = subs[w.no];

    area.innerHTML = `
      <form class="submit-form" novalidate>
        <div class="field">
          <label for="submit-week">과제 선택</label>
          <select id="submit-week">${list(assignmentWeeks, (x) =>
            `<option value="${x.no}" ${x.no === w.no ? "selected" : ""}>${esc(x.label)} · ${esc(x.assignment.title)}${subs[x.no] ? " (제출함)" : ""}</option>`)}</select>
        </div>
        <div class="submit-info">
          <p>${esc(a.description)}</p>
          <p class="submit-due">마감 <b>${fmtDate(a.due, true)} ${fmtTime(a.due)}</b>
            <span class="countdown" data-due="${a.due.getTime()}" data-kind="text"></span></p>
          ${prev ? `<p class="submit-prev">📎 제출함: <b>${esc(prev.fileName)}</b> (${fmtSize(prev.size)}) · ${fmtStamp(prev.time)}${prev.count > 1 ? ` · ${prev.count}번째 제출` : ""}</p>` : ""}
        </div>
        ${closed
          ? `<div class="submit-closed">⛔ 마감된 과제라 제출할 수 없어요.</div>`
          : `<label class="dropzone" for="submit-file">
              <input type="file" id="submit-file" accept="${esc(accept.join(","))}" aria-describedby="submit-file-err submit-file-help" />
              <span class="drop-icon" aria-hidden="true">📁</span>
              <span class="drop-text">파일을 끌어다 놓거나 <u>눌러서 선택</u>하세요</span>
              <span class="drop-file" id="submit-file-help">최대 ${Number(sub.maxFileMB) || 20}MB · ${esc(accept.join(" "))}</span>
            </label>
            <p class="field-error" id="submit-file-err"></p>
            <button class="btn" type="submit">${prev ? "다시 제출하기" : "제출하기"}</button>`}
        ${sub.demoNote && !API ? `<p class="submit-note">${esc(sub.demoNote)}</p>` : ""}
      </form>`;
    chosenFile = null;
    S.updateCountdowns(area);

    // 내 제출 기록
    const mine = assignmentWeeks.filter((x) => subs[x.no]);
    $("#student .my-submissions").innerHTML = mine.length
      ? list(mine, (x) => {
          const s = subs[x.no];
          const lateSub = s.time > x.assignment.due.getTime();
          return `<li><span class="sub-badge">${esc(x.label)}</span>
            <div><b>${esc(x.assignment.title)}</b><small>${esc(s.fileName)} · ${fmtSize(s.size)} · ${fmtStamp(s.time)}</small></div>
            <span class="sub-state ${lateSub ? "late" : ""}">${lateSub ? "지각 제출" : "제출 완료"}</span></li>`;
        })
      : `<li class="empty">아직 제출한 과제가 없어요.</li>`;
  };

  const fileError = (file) => {
    if (!file) return "제출할 파일을 선택해 주세요.";
    const ext = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
    if (accept.length && !accept.includes(ext)) return `${ext || "확장자 없는"} 파일은 제출할 수 없어요. (${accept.join(", ")})`;
    if (file.size > maxBytes) return `파일이 너무 커요. 최대 ${Number(sub.maxFileMB) || 20}MB까지 제출할 수 있어요. (현재 ${fmtSize(file.size)})`;
    if (file.size === 0) return "빈 파일은 제출할 수 없어요.";
    return "";
  };
  const showChosen = (file) => {
    chosenFile = file || null;
    const zone = $("#student .dropzone");
    const err = $("#submit-file-err");
    if (!zone) return;
    const msg = file ? fileError(file) : "";
    err.textContent = msg;
    zone.classList.toggle("has-file", !!file && !msg);
    zone.classList.toggle("invalid", !!msg);
    $(".drop-text", zone).innerHTML = file
      ? `<b>${esc(file.name)}</b> (${fmtSize(file.size)})`
      : `파일을 끌어다 놓거나 <u>눌러서 선택</u>하세요`;
  };

  // 학생 공간 이벤트
  const studentBox = $("#student");
  studentBox.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.classList.contains("login-form")) {
      const idEl = form.elements.namedItem("studentId");
      const nameEl = form.elements.namedItem("name");
      const id = idEl.value.trim();
      const name = nameEl.value.trim();
      const idErr = !id ? "학번을 입력해 주세요." : /^\d{10}$/.test(id) ? "" : "학번은 숫자 10자리로 입력해 주세요.";
      const nameErr = !name ? "이름을 입력해 주세요." : name.length < 2 ? "이름을 2글자 이상 입력해 주세요." : "";
      $("#login-id-err").textContent = idErr;
      $("#login-name-err").textContent = nameErr;
      idEl.setAttribute("aria-invalid", String(!!idErr));
      nameEl.setAttribute("aria-invalid", String(!!nameErr));
      if (idErr || nameErr) {
        (idErr ? idEl : nameEl).focus();
        return;
      }
      if (API) {
        // 서버 모드: 명단 확인과 기록 불러오기를 서버가 처리
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        api("/api/student/login", { method: "POST", body: { studentId: id, name } })
          .then((rec) => {
            store.write(attKey(id), rec.attendance || {});
            store.write(subKey(id), rec.submissions || {});
            store.write("session", { studentId: id, name, loginAt: Date.now() });
            toast(`${name} 님, 로그인되었어요.`, "success");
          })
          .catch((err) => {
            btn.disabled = false;
            $("#login-id-err").textContent = err.message;
            idEl.setAttribute("aria-invalid", "true");
            idEl.focus();
          });
        return;
      }
      // 관리자가 수강생 명단을 등록했다면 명단에 있는 학생만 로그인
      const roster = store.read("roster", []) || [];
      if (roster.length && !roster.some((r) => String(r.studentId) === id && String(r.name).trim() === name)) {
        $("#login-id-err").textContent = "수강생 명단에 없는 학번·이름이에요. 학번과 이름을 확인하거나 교수자에게 문의해 주세요.";
        idEl.setAttribute("aria-invalid", "true");
        idEl.focus();
        return;
      }
      store.write("knownStudents", { ...(store.read("knownStudents", {}) || {}), [id]: name });
      store.write("session", { studentId: id, name, loginAt: Date.now() });
      toast(`${name} 님, 로그인되었어요.`, "success");
      return;
    }
    if (form.classList.contains("submit-form")) {
      const me = session();
      const wNo = Number($("#submit-week").value);
      const w = weeks.find((x) => x.no === wNo);
      if (!me || !w) return;
      if (remaining(w.assignment.due).state === "closed") { renderSubmit(); return; }
      const msg = fileError(chosenFile);
      if (msg) {
        $("#submit-file-err").textContent = msg;
        $("#student .dropzone").classList.add("invalid");
        $("#submit-file").focus();
        return;
      }
      if (API) {
        // 서버 모드: 파일 본문을 그대로 올려 DB에 저장
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "올리는 중…";
        const q = new URLSearchParams({ studentId: me.studentId, name: me.name, week: String(wNo) });
        api(`/api/submissions?${q}`, {
          method: "POST",
          raw: chosenFile,
          headers: { "X-File-Name": encodeURIComponent(chosenFile.name), "Content-Type": chosenFile.type || "application/octet-stream" },
        })
          .then((rec) => {
            pendingWeek = wNo;
            store.write(attKey(me.studentId), rec.attendance || {});
            store.write(subKey(me.studentId), rec.submissions || {});
            toast(`${w.label} 과제를 제출했어요! 📮`, "success");
          })
          .catch((err) => {
            btn.disabled = false;
            btn.textContent = "다시 시도";
            $("#submit-file-err").textContent = err.message;
            if (err.status === 403) store.remove("session");
          });
        return;
      }
      const subs = { ...(store.read(subKey(me.studentId), {}) || {}) };
      const prev = subs[wNo];
      subs[wNo] = { fileName: chosenFile.name, size: chosenFile.size, time: now().getTime(), count: prev ? (prev.count || 1) + 1 : 1 };
      pendingWeek = wNo;
      store.write(subKey(me.studentId), subs);
      toast(`${w.label} 과제를 제출했어요! 📮`, "success");
    }
  });
  studentBox.addEventListener("click", (e) => {
    const act = e.target.closest("[data-action]");
    if (!act) return;
    const me = session();
    if (act.dataset.action === "logout") {
      store.remove("session");
      toast("로그아웃되었어요.");
    } else if (act.dataset.action === "attend" && me) {
      const cs = classState();
      if (API) {
        // 서버 모드: 출석·지각·마감 여부를 서버 시각으로 판단
        act.disabled = true;
        api("/api/attendance", { method: "POST", body: { studentId: me.studentId, name: me.name } })
          .then((rec) => {
            store.write(attKey(me.studentId), rec.attendance || {});
            toast(rec.status === "late" ? "지각으로 출석 처리되었어요." : "출석 완료! 오늘도 화이팅 💪", rec.status === "late" ? "warn" : "success");
          })
          .catch((err) => {
            toast(err.message, "warn");
            if (err.status === 403) store.remove("session"); else renderAttendance();
          });
        return;
      }
      if (cs.state !== "ontime" && cs.state !== "late") { renderAttendance(); return; }
      const rec = { ...(store.read(attKey(me.studentId), {}) || {}) };
      if (rec[cs.week.no]) return;
      rec[cs.week.no] = { status: cs.state === "late" ? "late" : "present", time: now().getTime() };
      store.write(attKey(me.studentId), rec);
      toast(cs.state === "late" ? "지각으로 출석 처리되었어요." : "출석 완료! 오늘도 화이팅 💪", cs.state === "late" ? "warn" : "success");
    }
  });
  studentBox.addEventListener("change", (e) => {
    if (e.target.id === "submit-week") { pendingWeek = Number(e.target.value); renderSubmit(); }
    if (e.target.id === "submit-file") showChosen(e.target.files[0]);
  });
  ["dragenter", "dragover"].forEach((t) => studentBox.addEventListener(t, (e) => {
    const zone = e.target.closest && e.target.closest(".dropzone");
    if (!zone) return;
    e.preventDefault();
    zone.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach((t) => studentBox.addEventListener(t, (e) => {
    const zone = e.target.closest && e.target.closest(".dropzone");
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove("drag");
    if (t === "drop" && e.dataTransfer.files.length) showChosen(e.dataTransfer.files[0]);
  }));

  // 커리큘럼·달력의 '과제 제출하기' → 학생 공간으로 이동
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".submit-btn[data-week]");
    if (!btn || btn.dataset.href || btn.classList.contains("is-disabled")) return;
    e.preventDefault();
    pendingWeek = Number(btn.dataset.week);
    if (session()) renderSubmit();
    else toast("로그인하면 바로 과제를 제출할 수 있어요.");
    scrollToEl($("#student"));
    setTimeout(() => {
      const target = session() ? $("#submit-file") || $("#submit-week") : $("#login-id");
      if (target) target.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 600);
  });

  // 로그인한 학번의 출석·제출 기록이 바뀌면(다른 탭 포함) 다시 그리기
  const watched = new Set();
  const ensureWatch = () => {
    const me = session();
    if (!me) return;
    [attKey(me.studentId), subKey(me.studentId)].forEach((k) => {
      if (watched.has(k)) return;
      watched.add(k);
      store.on(k, () => {
        const cur = session();
        if (!cur || !k.endsWith(`:${cur.studentId}`)) return;
        if (k.indexOf("attendance:") === 0) renderAttendance(); else renderSubmit();
      });
    });
  };
  store.on("session", () => { ensureWatch(); renderStudent(); });
  // 수강 신청을 마치면 로그인 칸에 학번·이름을 미리 채움
  store.on("lastApplicant", () => { if (!session()) renderStudent(); });
  ensureWatch();
  renderStudent();
  // 서버 모드: 이미 로그인한 상태라면 서버에서 내 기록을 새로 불러옴
  if (API && session()) {
    const me = session();
    api(`/api/student/records?${new URLSearchParams({ studentId: me.studentId, name: me.name })}`)
      .then((rec) => {
        store.write(attKey(me.studentId), rec.attendance || {});
        store.write(subKey(me.studentId), rec.submissions || {});
      })
      .catch((err) => { if (err.status === 403) store.remove("session"); });
  }
  // 출석 가능 시간·남은 시간이 바뀌므로 30초마다 갱신
  setInterval(() => { if (session()) renderAttendance(); }, 30000);

  /* =====================================================================
   *  수강 신청서
   * ===================================================================== */
  const A = C.apply || { fields: [] };
  const fieldId = (f) => `apply-${f.name}`;
  const req = (f) => (f.required ? ` <span class="req" aria-hidden="true">*</span>` : "");
  const fieldHtml = (f) => {
    const id = fieldId(f);
    const common = `id="${id}" name="${esc(f.name)}" aria-describedby="${id}-err" ${f.required ? 'aria-required="true"' : ""}`;
    let control = "";
    if (f.type === "select") {
      control = `<select ${common}><option value="">선택해 주세요</option>${list(f.options, (o) => `<option>${esc(o)}</option>`)}</select>`;
    } else if (f.type === "textarea") {
      control = `<textarea ${common} rows="4" placeholder="${esc(f.placeholder || "")}"></textarea>
        ${f.minLength ? `<span class="char-count" id="${id}-count">0 / ${f.minLength}자 이상</span>` : ""}`;
    } else if (f.type === "radio") {
      return `<fieldset class="field${f.full ? " full" : ""}" id="${id}" data-field="${esc(f.name)}" aria-describedby="${id}-err">
        <legend>${esc(f.label)}${req(f)}</legend>
        <div class="choice-row">${list(f.options, (o, i) => `<label class="choice"><input type="radio" name="${esc(f.name)}" value="${esc(o)}" ${i === 0 ? `id="${id}-0"` : ""} /><span>${esc(o)}</span></label>`)}</div>
        <p class="field-error" id="${id}-err"></p>
      </fieldset>`;
    } else if (f.type === "checkbox") {
      return `<div class="field full" data-field="${esc(f.name)}">
        <label class="check"><input type="checkbox" ${common} /><span>${esc(f.label)}${req(f)}</span></label>
        <p class="field-error" id="${id}-err"></p>
      </div>`;
    } else {
      control = `<input type="${f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}" ${common}
        placeholder="${esc(f.placeholder || "")}" ${f.inputmode ? `inputmode="${esc(f.inputmode)}"` : ""} ${f.autocomplete ? `autocomplete="${esc(f.autocomplete)}"` : ""} />`;
    }
    return `<div class="field${f.full ? " full" : ""}" data-field="${esc(f.name)}">
      <label for="${id}">${esc(f.label)}${req(f)}</label>
      ${control}
      <p class="field-error" id="${id}-err"></p>
    </div>`;
  };

  const applyFormHtml = () => `
    <form class="apply-form" novalidate>
      <div class="form-summary" role="alert" tabindex="-1" hidden></div>
      <div class="form-grid">${list(A.fields, fieldHtml)}</div>
      <div class="form-actions">
        <p class="form-help"><span class="req">*</span> 표시는 필수 항목입니다.</p>
        <button class="btn" type="submit">${esc(A.submitLabel || "제출하기")}</button>
      </div>
    </form>`;

  $("#apply").innerHTML =
    sectionHead(A.title || "수강 신청서", A.subtitle, A.eyebrow || "Application") +
    `<div class="card apply-card reveal">
      ${A.period ? `<p class="apply-period">🗓️ ${esc(A.period)}</p>` : ""}
      <div class="apply-body">${applyFormHtml()}</div>
    </div>`;

  const valueOf = (form, f) => {
    if (f.type === "radio") { const c = form.querySelector(`input[name="${f.name}"]:checked`); return c ? c.value : ""; }
    if (f.type === "checkbox") return form.elements.namedItem(f.name).checked;
    return form.elements.namedItem(f.name).value.trim();
  };
  const validate = (form, f) => {
    const v = valueOf(form, f);
    const empty = f.type === "checkbox" ? !v : v === "";
    if (empty) {
      if (!f.required) return "";
      if (f.requiredMessage) return f.requiredMessage;
      if (f.type === "checkbox") return "필수 동의 항목에 체크해 주세요.";
      if (f.type === "select" || f.type === "radio") return `${josa(f.label, "을", "를")} 선택해 주세요.`;
      return `${josa(f.label, "을", "를")} 입력해 주세요.`;
    }
    if (f.pattern && typeof v === "string" && !new RegExp(f.pattern).test(v)) return f.patternMessage || `${f.label} 형식을 확인해 주세요.`;
    if (f.minLength && typeof v === "string" && v.length < f.minLength) return `${f.minLength}자 이상 입력해 주세요. (현재 ${v.length}자)`;
    if (f.name === "studentId" && !API) { // 서버 모드에서는 서버가 중복을 확인
      const apps = store.read("applications", []) || [];
      if (apps.some((ap) => ap.studentId === v)) return "이미 신청서를 제출한 학번입니다.";
    }
    return "";
  };
  const markField = (form, f, msg) => {
    const wrap = form.querySelector(`[data-field="${f.name}"]`);
    wrap.classList.toggle("invalid", !!msg);
    $(".field-error", wrap).textContent = msg;
    $$("input, select, textarea", wrap).forEach((el) => el.setAttribute("aria-invalid", String(!!msg)));
  };
  const focusField = (form, f) => {
    const el = f.type === "radio" ? form.querySelector(`input[name="${f.name}"]`) : form.elements.namedItem(f.name);
    if (el) { el.focus({ preventScroll: true }); el.closest(".field").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); }
  };

  const applyBody = $("#apply .apply-body");
  let triedSubmit = false;
  applyBody.addEventListener("input", (e) => {
    const form = e.target.form;
    if (!form || !form.classList.contains("apply-form")) return;
    const f = A.fields.find((x) => x.name === e.target.name);
    if (!f) return;
    if (f.type === "textarea" && f.minLength) {
      const c = $(`#${fieldId(f)}-count`);
      const len = e.target.value.trim().length;
      c.textContent = `${len} / ${f.minLength}자 이상`;
      c.classList.toggle("ok", len >= f.minLength);
    }
    if (triedSubmit) {
      markField(form, f, validate(form, f));
      updateSummary(form);
    }
  });
  applyBody.addEventListener("focusout", (e) => {
    const form = e.target.form;
    if (!form || !form.classList.contains("apply-form") || !triedSubmit) return;
    const f = A.fields.find((x) => x.name === e.target.name);
    if (f) { markField(form, f, validate(form, f)); updateSummary(form); }
  });

  const updateSummary = (form, focus) => {
    const errs = A.fields.map((f) => ({ f, msg: validate(form, f) })).filter((x) => x.msg);
    const box = $(".form-summary", form);
    if (!errs.length) { box.hidden = true; box.innerHTML = ""; return errs; }
    box.hidden = false;
    box.innerHTML = `<p class="summary-title">⚠️ 빠졌거나 확인이 필요한 항목이 <b>${errs.length}개</b> 있어요.</p>
      <ul>${list(errs, (x) => `<li><button type="button" data-goto="${esc(x.f.name)}"><b>${esc(x.f.type === "checkbox" ? "개인정보 동의" : x.f.label)}</b> — ${esc(x.msg)}</button></li>`)}</ul>`;
    if (focus) box.focus();
    return errs;
  };

  applyBody.addEventListener("click", (e) => {
    const go = e.target.closest("[data-goto]");
    if (go) {
      const form = go.closest("form");
      focusField(form, A.fields.find((f) => f.name === go.dataset.goto));
      return;
    }
    const act = e.target.closest("[data-apply]");
    if (!act) return;
    if (act.dataset.apply === "again") {
      triedSubmit = false;
      applyBody.innerHTML = applyFormHtml();
      scrollToEl($("#apply"));
    } else if (act.dataset.apply === "login") {
      scrollToEl($("#student"));
      setTimeout(() => { const b = $("#student .login-form button[type=submit]"); if (b) b.focus({ preventScroll: true }); }, reduceMotion ? 0 : 600);
    }
  });

  applyBody.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    triedSubmit = true;
    A.fields.forEach((f) => markField(form, f, validate(form, f)));
    const errs = updateSummary(form, true);
    if (errs.length) {
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      return;
    }
    const data = {};
    A.fields.forEach((f) => (data[f.name] = valueOf(form, f)));
    if (API) {
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      api("/api/applications", { method: "POST", body: { data } })
        .then((d) => showApplySuccess(data, d.receipt))
        .catch((err) => {
          btn.disabled = false;
          const idField = A.fields.find((f) => f.name === "studentId");
          if (err.status === 409 && idField) { markField(form, idField, err.message); focusField(form, idField); }
          else toast(err.message, "warn");
        });
      return;
    }
    const apps = store.read("applications", []) || [];
    const receipt = `AI26-${String(apps.length + 1).padStart(4, "0")}`;
    store.write("applications", [...apps, { ...data, receipt, submittedAt: Date.now() }]);
    showApplySuccess(data, receipt);
  });

  function showApplySuccess(data, receipt) {
    if (data.studentId && data.name) store.write("lastApplicant", { studentId: data.studentId, name: data.name });
    applyBody.innerHTML = `
      <div class="apply-success" tabindex="-1">
        <span class="success-emoji" aria-hidden="true">🎉</span>
        <h3>${esc(A.successTitle || "신청이 접수되었습니다!")}</h3>
        <p class="receipt">접수번호 <b>${receipt}</b></p>
        <dl class="success-summary">
          ${data.name ? `<div><dt>이름</dt><dd>${esc(data.name)}</dd></div>` : ""}
          ${data.studentId ? `<div><dt>학번</dt><dd>${esc(data.studentId)}</dd></div>` : ""}
          ${data.email ? `<div><dt>이메일</dt><dd>${esc(data.email)}</dd></div>` : ""}
        </dl>
        <p>${esc(A.successText || "")}</p>
        <div class="success-actions">
          ${session() ? "" : `<button class="btn" data-apply="login">학생 공간에서 로그인하기</button>`}
          <button class="btn btn-secondary" data-apply="again">새 신청서 작성</button>
        </div>
      </div>`;
    $(".apply-success", applyBody).focus({ preventScroll: true });
    scrollToEl($("#apply"));
    confetti({ bursts: 2, cannons: false });
    toast("수강 신청서가 제출되었어요! 🌿", "success");
  }

  /* =====================================================================
   *  폭죽 효과 (꽃잎 + 색종이)
   * ===================================================================== */
  function confetti({ bursts = 3, cannons = true } = {}) {
    if (reduceMotion) return;
    const cv = document.createElement("canvas");
    cv.className = "confetti-canvas";
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#7d8f6c", "#a3b392", "#cfd8c4", "#4f5f46", "#c9a27e", "#e8d8c3", "#d9b45f", "#fbf9f4"];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const parts = [];
    const make = (x, y, vx, vy, delay) => parts.push({
      x, y, vx, vy, delay,
      w: rnd(6, 11), h: rnd(8, 14), r: rnd(0, Math.PI), vr: rnd(-0.25, 0.25),
      color: colors[(Math.random() * colors.length) | 0], petal: Math.random() < 0.4, life: 0,
    });
    // 위쪽에서 터지는 폭죽
    for (let b = 0; b < bursts; b++) {
      const cx = W * rnd(0.2, 0.8), cy = H * rnd(0.18, 0.4), delay = b * 18;
      for (let i = 0; i < 70; i++) {
        const ang = (Math.PI * 2 * i) / 70 + rnd(-0.05, 0.05);
        const sp = rnd(3, 8.5);
        make(cx, cy, Math.cos(ang) * sp, Math.sin(ang) * sp, delay);
      }
    }
    // 양쪽 아래에서 쏘아 올리는 색종이
    if (cannons) {
      for (let i = 0; i < 90; i++) {
        const left = i % 2 === 0;
        make(left ? -10 : W + 10, H * rnd(0.7, 0.9), (left ? 1 : -1) * rnd(4, 11), -rnd(10, 18), (i % 30));
      }
    }
    const DURATION = 220; // 프레임 수 (~3.7초)
    let frame = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        if (frame < p.delay) continue;
        p.life++;
        p.vy += 0.22;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        const fade = Math.max(0, 1 - Math.max(0, frame - DURATION * 0.65) / (DURATION * 0.35));
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        if (p.petal) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.w * 0.6, p.h * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 4, p.w, p.h / 2);
        }
        ctx.restore();
      }
      if (frame < DURATION) requestAnimationFrame(tick);
      else cv.remove();
    };
    requestAnimationFrame(tick);
  }

  /* =====================================================================
   *  수강 신청 안내 팝업 ('오늘 하루 보지 않기')
   * ===================================================================== */
  const pop = C.popup || {};
  const hideKey = "popupHideUntil";
  const adminActive = () => { try { return sessionStorage.getItem("aiweb:admin") === "1"; } catch (e) { return false; } };
  const shouldShowPopup = () => pop.enabled !== false && !adminActive() && Date.now() > (Number(store.read(hideKey, 0)) || 0);

  const openPopup = () => {
    if ($(".modal-backdrop")) return;
    const lastFocus = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="popup-title" aria-describedby="popup-text">
        <button class="modal-x" data-popup="close" aria-label="팝업 닫기">×</button>
        <div class="modal-art" aria-hidden="true">🌿</div>
        ${pop.badge ? `<span class="hero-badge modal-badge">${esc(pop.badge)}</span>` : ""}
        <h3 id="popup-title">${esc(pop.title || "")}</h3>
        <p id="popup-text">${esc(pop.text || "")}</p>
        ${pop.period ? `<p class="modal-period">🗓️ ${esc(pop.period)}</p>` : ""}
        <a class="btn modal-cta" href="#${esc(pop.target || "apply")}" data-popup="go">${esc(pop.buttonLabel || "자세히 보기")}</a>
        <div class="modal-foot">
          <button data-popup="today">${esc(pop.hideTodayLabel || "오늘 하루 보지 않기")}</button>
          <button data-popup="close">닫기</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => wrap.classList.add("show"));
    $(".modal-cta", wrap).focus({ preventScroll: true });

    const close = () => {
      wrap.classList.remove("show");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(() => wrap.remove(), reduceMotion ? 0 : 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") { // 팝업 안에서만 포커스 이동
        const f = $$("a[href], button", wrap);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) { close(); return; }
      const b = e.target.closest("[data-popup]");
      if (!b) return;
      if (b.dataset.popup === "today") {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        store.write(hideKey, end.getTime());
        toast("오늘은 이 안내를 다시 띄우지 않을게요.");
        close();
      } else if (b.dataset.popup === "go") {
        e.preventDefault();
        close();
        scrollToEl(document.getElementById(pop.target || "apply"));
      } else close();
    });
  };

  /* =====================================================================
   *  첫 방문: 폭죽 + 환영 인사, 잠시 뒤 안내 팝업
   * ===================================================================== */
  const W = C.welcome || {};
  const firstVisit = !store.read("visited", false);
  if (firstVisit) {
    store.write("visited", true);
    setTimeout(() => {
      if (W.confetti !== false) confetti();
      if (W.message) toast(W.message, "success");
    }, 400);
  }
  if (shouldShowPopup()) setTimeout(openPopup, (Number(pop.delaySeconds) || 2) * 1000 + (firstVisit ? 1200 : 0));

  S.observeReveal($("#participate"));
  S.observeReveal($("#apply"));
  // 다른 곳에서도 쓸 수 있게 공개 (예: 콘솔에서 SiteFeatures.confetti())
  window.SiteFeatures = { store, toast, confetti, openPopup, api, API };
})();
