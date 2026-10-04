/* 관리자 화면: 자물쇠 → 비밀번호 확인 → 공지 · 수강생 명단 · 신청/출석/과제 내역(엑셀 CSV) · 사이트 편집 · 설정 파일 저장/불러오기
 * main.js, features.js 다음에 불러와야 합니다. */
(function () {
  "use strict";

  const S = window.SiteCore;
  const F = window.SiteFeatures;
  if (!S || !F) return;
  const { $, $$, esc, list, fmtDate, fmtTime, withTime, ymd, now, weeks } = S;
  const { store, toast } = F;
  const C = window.SITE_CONFIG;
  const DEFAULT = window.SITE_CONFIG_DEFAULT || C;

  /* =====================================================================
   *  SHA-256 (비밀번호를 원문 대신 해시로 비교)
   * ===================================================================== */
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const encoder = new TextEncoder();
  const sha256hex = (str) => {
    const bytes = encoder.encode(str);
    const len = bytes.length;
    const total = ((len + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(total);
    m.set(bytes);
    m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, (len * 8) >>> 0);
    dv.setUint32(total - 8, Math.floor((len * 8) / 4294967296));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(off + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H, (x) => x.toString(16).padStart(8, "0")).join("");
  };
  // 솔트를 붙여 여러 번 반복 해시 (무차별 대입을 느리게)
  const hashPassword = (pw, salt, iterations) => {
    let h = sha256hex(salt + pw);
    for (let i = 1; i < iterations; i++) h = sha256hex(h + salt);
    return h;
  };
  const randomSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

  /* ----- 관리자 로그인 상태 (이 탭을 닫으면 해제) ----- */
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* 무시 */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* 무시 */ } },
  };
  const isAdmin = () => ss.get("aiweb:admin") === "1";
  const lockBtn = $(".admin-lock");
  const syncLock = () => {
    lockBtn.classList.toggle("unlocked", isAdmin());
    lockBtn.setAttribute("aria-label", isAdmin() ? "관리자 화면 열기 (로그인됨)" : "관리자 로그인");
  };

  /* ----- 공통 도우미 ----- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const saveOverride = (cfg) => store.write("configOverride", cfg);
  const download = (filename, text, type) => {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  // 엑셀에서 한글이 깨지지 않도록 BOM을 붙인 CSV
  const csvCell = (v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+@\t\r]/.test(s) || (/^-/.test(s) && !/^-?\d/.test(s))) s = "'" + s; // 수식 주입 방지
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const downloadCsv = (name, rows) => {
    const stamp = ymd(new Date());
    download(`${name}_${stamp}.csv`, "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
    toast("CSV 파일을 내려받았어요. 엑셀에서 바로 열 수 있어요.", "success");
  };
  const stampText = (ms) => { if (!ms) return ""; const d = new Date(ms); return `${ymd(d)} ${fmtTime(d)}`; };

  /* ----- 기록 모으기 ----- */
  const getRoster = () => store.read("roster", []) || [];
  const getApps = () => store.read("applications", []) || [];
  const knownName = (sid) => {
    const r = getRoster().find((x) => String(x.studentId) === sid);
    if (r) return r.name;
    const a = getApps().find((x) => String(x.studentId) === sid);
    if (a) return a.name;
    return (store.read("knownStudents", {}) || {})[sid] || "";
  };
  const idsFrom = (prefix) => store.keys(prefix).map((k) => k.slice(prefix.length));
  const studentIds = () => {
    const ids = new Set(getRoster().map((r) => String(r.studentId)));
    idsFrom("attendance:").forEach((i) => ids.add(i));
    idsFrom("submissions:").forEach((i) => ids.add(i));
    return [...ids].sort();
  };
  const attendanceRows = () => {
    const n = now();
    return studentIds().map((sid) => {
      const rec = store.read(`attendance:${sid}`, {}) || {};
      let present = 0, late = 0, absent = 0;
      const cells = weeks.map((w) => {
        const r = rec[w.no];
        if (r) { r.status === "late" ? late++ : present++; return { s: r.status, t: r.time }; }
        if (withTime(w.date, w.endTime) < n) { absent++; return { s: "absent" }; }
        return { s: "" };
      });
      const counted = present + late + absent;
      return { sid, name: knownName(sid), cells, present, late, absent, rate: counted ? Math.round(((present + late) / counted) * 100) : null };
    });
  };
  const submissionRows = () => {
    const rows = [];
    studentIds().forEach((sid) => {
      const subs = store.read(`submissions:${sid}`, {}) || {};
      Object.keys(subs).forEach((no) => {
        const w = weeks.find((x) => x.no === Number(no));
        if (!w || !w.assignment) return;
        const s = subs[no];
        rows.push({ sid, name: knownName(sid), w, s, late: s.time > w.assignment.due.getTime() });
      });
    });
    return rows.sort((a, b) => a.w.no - b.w.no || a.sid.localeCompare(b.sid));
  };
  const statusLabel = { present: "출석", late: "지각", absent: "결석", "": "" };

  /* =====================================================================
   *  비밀번호 입력 창
   * ===================================================================== */
  const openLogin = () => {
    if ($(".modal-backdrop")) return;
    const lastFocus = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal admin-login" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
        <button class="modal-x" data-x aria-label="닫기">×</button>
        <div class="modal-art" aria-hidden="true">🔐</div>
        <h3 id="admin-login-title">관리자 로그인</h3>
        <p>관리자 비밀번호를 입력해 주세요.</p>
        <form class="admin-login-form" novalidate>
          <div class="field">
            <label for="admin-pw" class="sr-only">비밀번호</label>
            <div class="pw-row">
              <input id="admin-pw" type="password" autocomplete="current-password" placeholder="비밀번호" aria-describedby="admin-pw-err" />
              <button type="button" class="pw-toggle" aria-label="비밀번호 보기" aria-pressed="false">👁</button>
            </div>
            <p class="field-error" id="admin-pw-err" role="alert"></p>
          </div>
          <button class="btn" type="submit">들어가기</button>
        </form>
        <div class="modal-foot"><button data-x>취소</button></div>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => wrap.classList.add("show"));
    const input = $("#admin-pw", wrap);
    input.focus();
    const close = () => {
      wrap.classList.remove("show");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(() => wrap.remove(), 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-x]")) close();
      const t = e.target.closest(".pw-toggle");
      if (t) {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        t.setAttribute("aria-pressed", String(show));
        t.setAttribute("aria-label", show ? "비밀번호 숨기기" : "비밀번호 보기");
        input.focus();
      }
    });
    $(".admin-login-form", wrap).addEventListener("submit", (e) => {
      e.preventDefault();
      const err = $("#admin-pw-err", wrap);
      const lockedUntil = Number(ss.get("aiweb:adminLockUntil")) || 0;
      if (Date.now() < lockedUntil) {
        err.textContent = `여러 번 틀려서 잠시 잠겼어요. ${Math.ceil((lockedUntil - Date.now()) / 1000)}초 뒤에 다시 시도해 주세요.`;
        return;
      }
      const pw = input.value;
      if (!pw) { err.textContent = "비밀번호를 입력해 주세요."; input.focus(); return; }
      const a = C.admin || {};
      const ok = a.passwordHash && hashPassword(pw, a.salt || "", Number(a.iterations) || 1) === a.passwordHash;
      if (!ok) {
        const fails = (Number(ss.get("aiweb:adminFails")) || 0) + 1;
        ss.set("aiweb:adminFails", String(fails));
        if (fails >= 5) {
          ss.set("aiweb:adminLockUntil", String(Date.now() + 30000));
          ss.set("aiweb:adminFails", "0");
          err.textContent = "5번 틀려서 30초 동안 잠겼어요.";
        } else {
          err.textContent = `비밀번호가 맞지 않아요. (${fails}/5)`;
        }
        input.setAttribute("aria-invalid", "true");
        input.select();
        return;
      }
      ss.set("aiweb:admin", "1");
      ss.set("aiweb:adminFails", "0");
      syncLock();
      close();
      openPanel("dashboard");
    });
  };

  /* =====================================================================
   *  관리자 화면 틀
   * ===================================================================== */
  const TABS = [
    { id: "dashboard", icon: "🏠", label: "대시보드" },
    { id: "notices", icon: "📢", label: "공지 관리" },
    { id: "roster", icon: "👥", label: "수강생 명단" },
    { id: "applications", icon: "📝", label: "수강 신청 내역" },
    { id: "attendance", icon: "🙋", label: "출석 현황" },
    { id: "submissions", icon: "📤", label: "과제 제출 현황" },
    { id: "editor", icon: "✏️", label: "사이트 편집" },
    { id: "files", icon: "💾", label: "설정 파일" },
    { id: "password", icon: "🔑", label: "비밀번호 변경" },
  ];
  let panel = null;
  let currentTab = "dashboard";

  const openPanel = (tab = "dashboard", opts = {}) => {
    if (!isAdmin()) { openLogin(); return; }
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "admin-overlay";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "관리자 화면");
      panel.innerHTML = `
        <header class="admin-top">
          <h2>🌿 관리자 화면</h2>
          <div class="admin-top-actions">
            <button class="text-btn" data-admin="close">사이트로 돌아가기</button>
            <button class="text-btn" data-admin="logout">🔒 잠그기</button>
          </div>
        </header>
        <div class="admin-body">
          <nav class="admin-nav" aria-label="관리자 메뉴">${list(TABS, (t) =>
            `<button data-tab="${t.id}"><span aria-hidden="true">${t.icon}</span>${esc(t.label)}</button>`)}</nav>
          <main class="admin-main" tabindex="-1"></main>
        </div>`;
      document.body.appendChild(panel);
      panel.addEventListener("click", onPanelClick);
      panel.addEventListener("input", onPanelInput);
      panel.addEventListener("change", onPanelChange);
      panel.addEventListener("submit", onPanelSubmit);
      document.addEventListener("keydown", onPanelKey);
    }
    document.body.classList.add("modal-open");
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("show"));
    showTab(tab, opts);
  };
  const closePanel = () => {
    if (!panel) return;
    panel.classList.remove("show");
    panel.hidden = true;
    document.body.classList.remove("modal-open");
    lockBtn.focus({ preventScroll: true });
  };
  const onPanelKey = (e) => {
    if (e.key === "Escape" && panel && !panel.hidden && !$(".modal-backdrop")) closePanel();
  };
  const main = () => $(".admin-main", panel);

  const showTab = (tab, opts = {}) => {
    currentTab = tab;
    $$(".admin-nav button", panel).forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("active", on);
      b.setAttribute("aria-current", on ? "page" : "false");
    });
    const render = RENDER[tab] || RENDER.dashboard;
    main().innerHTML = render(opts);
    main().scrollTop = 0;
    if (tab === "editor") renderEditorSection();
    const activeBtn = $(".admin-nav button.active", panel);
    if (activeBtn && activeBtn.scrollIntoView) activeBtn.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const head = (title, desc, actions = "") =>
    `<div class="admin-head"><div><h3>${esc(title)}</h3>${desc ? `<p>${desc}</p>` : ""}</div>${actions ? `<div class="admin-actions">${actions}</div>` : ""}</div>`;
  const table = (headers, rows, empty) => rows.length
    ? `<div class="table-wrap"><table class="admin-table"><thead><tr>${list(headers, (h) => `<th scope="col">${esc(h)}</th>`)}</tr></thead>
        <tbody>${rows.join("")}</tbody></table></div>`
    : `<p class="admin-empty">${esc(empty)}</p>`;

  /* =====================================================================
   *  탭별 화면
   * ===================================================================== */
  const RENDER = {};

  RENDER.dashboard = () => {
    const attRows = attendanceRows();
    const todayW = weeks.find((w) => w.key === ymd(now()));
    const todayCount = todayW ? attRows.filter((r) => r.cells[todayW.no - 1].s === "present" || r.cells[todayW.no - 1].s === "late").length : null;
    const subs = submissionRows();
    const poll = C.poll || { options: [] };
    const pollLocal = store.read(`poll:${poll.id || "default"}`, {}) || {};
    const pollRows = poll.options.map((o) => ({ label: o.label, n: (Number(o.seed) || 0) + (Number(pollLocal[o.id]) || 0) })).sort((a, b) => b.n - a.n);
    const card = (icon, label, value, tab) =>
      `<button class="stat-tile" data-tab="${tab}"><span aria-hidden="true">${icon}</span><b>${value}</b><small>${esc(label)}</small></button>`;
    return head("대시보드", "사이트 현황을 한눈에 확인해요.") +
      (window.SITE_CONFIG_OVERRIDDEN ? `<p class="admin-banner">✏️ 이 브라우저에서 고친 설정이 적용되어 있어요. 다른 방문자에게도 보이게 하려면 <button class="link-btn" data-tab="files">설정 파일</button>을 내려받아 config.js를 교체하세요.</p>` : "") +
      `<div class="tile-grid">
        ${card("📝", "수강 신청", getApps().length, "applications")}
        ${card("👥", "등록 수강생", getRoster().length, "roster")}
        ${card("🙋", todayW ? `오늘(${todayW.label}) 출석` : "오늘 수업 없음", todayCount == null ? "-" : todayCount, "attendance")}
        ${card("📤", "과제 제출", subs.length, "submissions")}
        ${card("📢", "공지", (C.notices || []).length, "notices")}
      </div>
      <div class="admin-card">
        <h4>📊 투표 결과 · ${esc(poll.title || "")}</h4>
        <ol class="mini-rank">${list(pollRows, (r) => `<li><span>${esc(r.label)}</span><b>${r.n}표</b></li>`)}</ol>
      </div>
      <p class="admin-note">데모 모드에서는 이 브라우저에 저장된 기록만 보입니다.</p>`;
  };

  /* ----- 공지 관리 ----- */
  let editingNotice = null;
  RENDER.notices = () => {
    const items = C.notices || [];
    const n = editingNotice != null ? items[editingNotice] : null;
    return head("공지 관리", "올린 공지는 사이트 맨 위 '공지사항'에 바로 나타나요.") +
      `<form class="admin-card admin-form" data-form="notice" novalidate>
        <h4>${n ? "공지 수정" : "새 공지 올리기"}</h4>
        <div class="field"><label for="nt-title">제목 <span class="req">*</span></label><input id="nt-title" name="title" value="${esc(n ? n.title : "")}" /></div>
        <div class="field"><label for="nt-body">내용</label><textarea id="nt-body" name="body" rows="4">${esc(n ? n.body : "")}</textarea></div>
        <div class="form-row">
          <div class="field"><label for="nt-date">날짜</label><input id="nt-date" name="date" type="date" value="${esc(n ? n.date : ymd(now()))}" /></div>
          <label class="check"><input type="checkbox" name="pinned" ${n && n.pinned ? "checked" : ""} /><span>📌 맨 위에 고정</span></label>
        </div>
        <p class="field-error" data-err></p>
        <div class="admin-actions">
          <button class="btn btn-sm" type="submit">${n ? "수정 저장" : "공지 올리기"}</button>
          ${n ? `<button class="text-btn" type="button" data-admin="notice-cancel">취소</button>` : ""}
        </div>
      </form>
      <h4 class="admin-sub">올린 공지 ${items.length}건</h4>
      ${table(["고정", "날짜", "제목", ""], items.map((it, i) => `<tr>
        <td>${it.pinned ? "📌" : ""}</td><td class="nowrap">${esc(it.date || "")}</td><td>${esc(it.title)}</td>
        <td class="row-actions"><button class="text-btn sm" data-admin="notice-edit" data-i="${i}">수정</button>
        <button class="text-btn sm danger" data-admin="notice-del" data-i="${i}">삭제</button></td></tr>`), "아직 올린 공지가 없어요.")}`;
  };
  const saveNotices = (items) => {
    C.notices = items;
    saveOverride(clone(C));
    window.SITE_CONFIG_OVERRIDDEN = true;
    S.renderNotices();
  };

  /* ----- 수강생 명단 ----- */
  RENDER.roster = () => {
    const roster = getRoster();
    return head("수강생 명단",
      `명단을 등록하면 <b>명단에 있는 학생만</b> 학생 공간에 로그인할 수 있어요. (비어 있으면 누구나 데모 로그인 가능)`,
      `<button class="text-btn" data-admin="roster-csv" ${roster.length ? "" : "disabled"}>⬇ 엑셀(CSV) 내려받기</button>`) +
      `<div class="admin-grid-2">
        <form class="admin-card admin-form" data-form="roster-one" novalidate>
          <h4>한 명씩 추가</h4>
          <div class="form-row">
            <div class="field"><label for="rs-id">학번 <span class="req">*</span></label><input id="rs-id" name="studentId" inputmode="numeric" placeholder="2024123456" /></div>
            <div class="field"><label for="rs-name">이름 <span class="req">*</span></label><input id="rs-name" name="name" placeholder="홍길동" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="rs-dept">학과</label><input id="rs-dept" name="department" /></div>
            <div class="field"><label for="rs-email">이메일</label><input id="rs-email" name="email" type="email" /></div>
          </div>
          <p class="field-error" data-err></p>
          <button class="btn btn-sm" type="submit">추가</button>
        </form>
        <form class="admin-card admin-form" data-form="roster-bulk" novalidate>
          <h4>여러 명 한꺼번에</h4>
          <p class="admin-note">한 줄에 한 명씩 <code>학번,이름,학과,이메일</code> 순서로 붙여 넣거나, 엑셀에서 저장한 CSV 파일을 고르세요.</p>
          <textarea name="bulk" rows="4" placeholder="2024123456,홍길동,통계학과,hong@korea.ac.kr&#10;2024123457,김수강,경영학과,"></textarea>
          <div class="admin-actions">
            <button class="btn btn-sm" type="submit">붙여 넣은 명단 추가</button>
            <label class="text-btn file-btn">CSV 파일 선택<input type="file" accept=".csv,.txt" data-admin-file="roster" /></label>
            <button class="text-btn" type="button" data-admin="roster-from-apps" ${getApps().length ? "" : "disabled"}>신청자 전원 추가</button>
          </div>
        </form>
      </div>
      <div class="admin-sub-row"><h4 class="admin-sub">등록된 수강생 ${roster.length}명</h4>
        ${roster.length ? `<button class="text-btn sm danger" data-admin="roster-clear">명단 전체 삭제</button>` : ""}</div>
      ${table(["학번", "이름", "학과", "이메일", ""], roster.map((r, i) => `<tr>
        <td class="nowrap">${esc(r.studentId)}</td><td>${esc(r.name)}</td><td>${esc(r.department || "")}</td><td>${esc(r.email || "")}</td>
        <td class="row-actions"><button class="text-btn sm danger" data-admin="roster-del" data-i="${i}">삭제</button></td></tr>`), "아직 등록된 수강생이 없어요.")}`;
  };
  const addToRoster = (people) => {
    const roster = getRoster();
    let added = 0, dup = 0, bad = 0;
    people.forEach((p) => {
      const id = String(p.studentId || "").trim();
      const name = String(p.name || "").trim();
      if (!/^\d{10}$/.test(id) || !name) { bad++; return; }
      if (roster.some((r) => String(r.studentId) === id)) { dup++; return; }
      roster.push({ studentId: id, name, department: String(p.department || "").trim(), email: String(p.email || "").trim() });
      added++;
    });
    roster.sort((a, b) => String(a.studentId).localeCompare(String(b.studentId)));
    store.write("roster", roster);
    return { added, dup, bad };
  };
  const parseCsvLines = (text) => text.replace(/^﻿/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    // 따옴표로 감싼 칸도 처리
    const cells = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === "," || ch === "\t") { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.map((c) => c.trim().replace(/^'/, ""));
  }).filter((cells) => /^\d/.test(cells[0] || "")); // 머리글 줄 건너뜀
  const bulkResult = (r) => toast(`${r.added}명 추가${r.dup ? ` · 중복 ${r.dup}명 제외` : ""}${r.bad ? ` · 형식 오류 ${r.bad}줄 제외` : ""}`, r.added ? "success" : "warn");

  /* ----- 수강 신청 내역 ----- */
  const applyFields = () => ((C.apply && C.apply.fields) || []).filter((f) => f.type !== "checkbox");
  RENDER.applications = () => {
    const apps = getApps();
    const fields = applyFields();
    return head("수강 신청 내역", `총 <b>${apps.length}</b>건`,
      `<input class="admin-search" type="search" placeholder="이름·학번 검색" aria-label="신청 내역 검색" data-filter="apps" />
       <button class="text-btn" data-admin="apps-csv" ${apps.length ? "" : "disabled"}>⬇ 엑셀(CSV) 내려받기</button>`) +
      table(["접수번호", "제출 일시", ...fields.map((f) => f.label), ""], apps.map((a, i) => `<tr data-search="${esc(`${a.name} ${a.studentId}`)}">
        <td class="nowrap">${esc(a.receipt || "")}</td><td class="nowrap">${esc(stampText(a.submittedAt))}</td>
        ${list(fields, (f) => `<td class="${f.type === "textarea" ? "wrap" : ""}">${esc(a[f.name] == null ? "" : a[f.name])}</td>`)}
        <td class="row-actions"><button class="text-btn sm danger" data-admin="app-del" data-i="${i}">삭제</button></td></tr>`), "아직 들어온 신청서가 없어요.");
  };

  /* ----- 출석 현황 ----- */
  const statusCell = { present: '<span class="st st-p">출</span>', late: '<span class="st st-l">지</span>', absent: '<span class="st st-a">결</span>', "": '<span class="st">·</span>' };
  RENDER.attendance = () => {
    const rows = attendanceRows();
    return head("출석 현황", `출 = 출석, 지 = 지각, 결 = 결석(수업이 끝났는데 기록 없음), · = 아직 수업 전`,
      `<button class="text-btn" data-admin="att-csv" ${rows.length ? "" : "disabled"}>⬇ 엑셀(CSV) 내려받기</button>`) +
      table(["학번", "이름", ...weeks.map((w) => `${w.no}주`), "출석", "지각", "결석", "출석률"], rows.map((r) => `<tr>
        <td class="nowrap">${esc(r.sid)}</td><td class="nowrap">${esc(r.name)}</td>
        ${list(r.cells, (c, i) => `<td class="center" title="${esc(`${weeks[i].label} ${fmtDate(weeks[i].date)} ${statusLabel[c.s]}${c.t ? ` · ${fmtTime(new Date(c.t))}` : ""}`)}">${statusCell[c.s]}</td>`)}
        <td class="center">${r.present}</td><td class="center">${r.late}</td><td class="center">${r.absent}</td><td class="center"><b>${r.rate == null ? "-" : `${r.rate}%`}</b></td></tr>`),
      "아직 출석 기록이나 등록된 수강생이 없어요.");
  };

  /* ----- 과제 제출 현황 ----- */
  RENDER.submissions = () => {
    const rows = submissionRows();
    const aw = weeks.filter((w) => w.assignment);
    const rosterN = getRoster().length;
    return head("과제 제출 현황", `총 <b>${rows.length}</b>건 제출`,
      `<button class="text-btn" data-admin="sub-csv" ${rows.length ? "" : "disabled"}>⬇ 엑셀(CSV) 내려받기</button>`) +
      `<div class="chip-row">${list(aw, (w) => {
        const n = rows.filter((r) => r.w.no === w.no).length;
        return `<span class="count-chip"><b>${esc(w.label)}</b> ${esc(w.assignment.title)} · ${n}${rosterN ? ` / ${rosterN}` : ""}명</span>`;
      })}</div>` +
      table(["주차", "과제", "학번", "이름", "파일", "크기", "제출 일시", "상태"], rows.map((r) => `<tr>
        <td class="nowrap">${esc(r.w.label)}</td><td>${esc(r.w.assignment.title)}</td><td class="nowrap">${esc(r.sid)}</td><td class="nowrap">${esc(r.name)}</td>
        <td class="wrap">${esc(r.s.fileName)}</td><td class="nowrap">${(r.s.size / 1024).toFixed(1)} KB</td><td class="nowrap">${esc(stampText(r.s.time))}</td>
        <td><span class="st ${r.late ? "st-l" : "st-p"} wide">${r.late ? "지각" : "제출"}</span></td></tr>`), "아직 제출된 과제가 없어요.");
  };

  /* ----- 설정 파일 ----- */
  RENDER.files = () => head("설정 파일", "사이트 설정(공지 포함)을 파일로 저장하거나 불러와요.") +
    `<p class="admin-banner ${window.SITE_CONFIG_OVERRIDDEN ? "" : "muted"}">${window.SITE_CONFIG_OVERRIDDEN
      ? "✏️ 지금은 <b>이 브라우저에서 고친 설정</b>이 적용되어 있어요."
      : "📄 지금은 <b>config.js 원본</b>이 그대로 적용되어 있어요."}</p>
    <div class="admin-grid-2">
      <div class="admin-card">
        <h4>💾 설정 파일로 저장</h4>
        <p class="admin-note">현재 설정을 <code>config.js</code> 파일로 내려받아요. 이 파일로 사이트 폴더의 config.js를 바꾸고 다시 배포하면 <b>모든 방문자</b>에게 반영돼요.</p>
        <button class="btn btn-sm" data-admin="export">config.js 내려받기</button>
      </div>
      <div class="admin-card">
        <h4>📂 설정 파일 불러오기</h4>
        <p class="admin-note">관리자 화면에서 내려받았던 config.js(또는 .json) 파일을 고르면 이 브라우저에 바로 적용돼요.</p>
        <label class="btn btn-sm btn-secondary file-btn">파일 선택<input type="file" accept=".js,.json" data-admin-file="config" /></label>
        <div class="import-preview"></div>
      </div>
    </div>
    <div class="admin-card danger-zone">
      <h4>↩️ 원래대로 되돌리기</h4>
      <p class="admin-note">이 브라우저에서 고친 설정을 지우고 config.js 원본으로 돌아가요. (수강생 명단·신청·출석 기록은 지워지지 않아요)</p>
      <button class="text-btn danger" data-admin="reset" ${window.SITE_CONFIG_OVERRIDDEN ? "" : "disabled"}>고친 설정 지우기</button>
    </div>`;
  let pendingImport = null;

  /* ----- 비밀번호 변경 ----- */
  RENDER.password = () => head("비밀번호 변경", "새 비밀번호는 해시값으로만 저장돼요.") +
    `<form class="admin-card admin-form narrow" data-form="password" novalidate>
      <div class="field"><label for="pw-cur">현재 비밀번호</label><input id="pw-cur" name="cur" type="password" autocomplete="current-password" /></div>
      <div class="field"><label for="pw-new">새 비밀번호 (8자 이상)</label><input id="pw-new" name="next" type="password" autocomplete="new-password" /></div>
      <div class="field"><label for="pw-new2">새 비밀번호 확인</label><input id="pw-new2" name="next2" type="password" autocomplete="new-password" /></div>
      <p class="field-error" data-err></p>
      <button class="btn btn-sm" type="submit">비밀번호 바꾸기</button>
      <p class="admin-note">바꾼 비밀번호는 이 브라우저에 먼저 적용돼요. 배포된 사이트에도 적용하려면 <b>설정 파일</b>에서 config.js를 내려받아 교체하세요.</p>
    </form>`;

  /* =====================================================================
   *  사이트 편집기 (설정의 모든 항목을 화면에서 수정)
   * ===================================================================== */
  const SECTIONS = [
    ["site", "기본 정보"], ["nav", "상단 메뉴"], ["hero", "첫 화면"], ["stats", "통계 카드"], ["about", "프로그램 소개"],
    ["schedule", "수업 일정"], ["curriculum", "커리큘럼"], ["calendar", "수업 달력"], ["participate", "참여하기"], ["poll", "투표"],
    ["student", "학생 공간"], ["tools", "AI 도구"], ["enroll", "수강 안내"], ["apply", "수강 신청서"], ["faq", "FAQ"],
    ["instructor", "교수자"], ["popup", "안내 팝업"], ["welcome", "첫 방문 환영"], ["footer", "푸터"],
  ];
  const LABELS = {
    university: "학교", department: "학과", courseName: "과목명", title: "제목", subtitle: "부제", description: "설명", text: "내용",
    label: "이름", value: "값", icon: "아이콘", url: "링크 주소", target: "이동할 섹션 id", style: "스타일(primary/secondary)", badge: "배지 문구",
    buttons: "버튼", quickInfo: "한눈에 보기", auto: "자동 값", suffix: "단위", slides: "슬라이드", autoplaySeconds: "자동 넘김 간격(초)",
    weeks: "주차", summary: "한 줄 요약", topics: "학습 내용", videos: "참고 영상", assignment: "과제", dueAfterDays: "마감(수업 후 며칠)",
    dueTime: "마감 시각", due: "마감 일시(직접 지정)", submitUrl: "제출 링크", submitLabel: "제출 버튼 문구", location: "장소", date: "날짜",
    startDate: "첫 수업일", startTime: "시작 시각", endTime: "종료 시각", holidays: "휴일", todayOverride: "테스트용 오늘 날짜", name: "이름",
    items: "항목", q: "질문", a: "답변", tag: "분류", preparation: "준비물", preparationTitle: "준비물 제목", grading: "평가 방법",
    gradingTitle: "평가 제목", percent: "비율(%)", notes: "유의 사항", notesTitle: "유의 사항 제목", info: "정보", role: "직함",
    photo: "사진 경로", bio: "소개", career: "약력", contacts: "연락처", href: "링크", links: "링크", demoNotice: "데모 안내 문구",
    id: "식별자(영문)", options: "선택지", seed: "시작 표 수", seedNote: "예시 표 안내", loginTitle: "로그인 제목", loginHint: "로그인 안내",
    attendance: "출석", openBeforeMin: "시작 몇 분 전부터 출석", lateAfterMin: "시작 몇 분 뒤부터 지각", submission: "과제 제출",
    maxFileMB: "최대 파일 크기(MB)", accept: "허용 확장자", demoNote: "데모 안내", period: "기간", submitLabelApply: "제출 버튼",
    successTitle: "완료 제목", successText: "완료 안내", fields: "입력 항목", type: "종류", required: "필수", placeholder: "예시 문구",
    autocomplete: "자동 완성", inputmode: "입력 키보드", pattern: "형식(정규식)", patternMessage: "형식 오류 문구", minLength: "최소 글자 수",
    full: "한 줄 전체 사용", enabled: "사용", delaySeconds: "몇 초 뒤에 띄울지", buttonLabel: "버튼 문구", hideTodayLabel: "오늘 하루 보지 않기 문구",
    confetti: "폭죽 효과", message: "환영 메시지", nav: "메뉴 항목", stats: "통계 카드", highlights: "강조 항목", tagline: "한 줄 소개", email: "이메일", office: "연구실", officeHours: "면담 시간",
  };
  const LONG = new Set(["description", "text", "bio", "a", "summary", "body", "demoNotice", "successText", "demoNote", "loginHint"]);
  let draft = null;
  let edSection = "site";
  let edDirty = false;

  const labelOf = (key) => (/^\d+$/.test(key) ? `#${Number(key) + 1}` : LABELS[key] || key);
  const getAt = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  const setAt = (obj, path, val) => {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((o, k) => o[k], obj);
    parent[last] = val;
  };
  const blankOf = (v) => {
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach((k) => (o[k] = blankOf(v[k]))); return o; }
    if (typeof v === "number") return 0;
    if (typeof v === "boolean") return false;
    return "";
  };
  // 새 항목 틀: 같은 위치의 첫 항목(없으면 기본 설정의 첫 항목)을 비운 모양
  const templateFor = (path, arr) => {
    if (arr.length) return blankOf(arr[0]);
    const generic = path.replace(/\.\d+(?=\.|$)/g, ".0");
    const def = getAt(DEFAULT, generic);
    return Array.isArray(def) && def.length ? blankOf(def[0]) : "";
  };
  const itemTitle = (v, i) => {
    if (v && typeof v === "object") {
      const t = v.title || v.label || v.name || v.q || v.week || v.date || "";
      return `${i + 1}. ${t}`;
    }
    return `${i + 1}`;
  };

  const inputFor = (path, key, val) => {
    const id = `ed-${path.replace(/\./g, "-")}`;
    const lab = `<label for="${id}">${esc(labelOf(key))}</label>`;
    if (typeof val === "boolean") {
      return `<label class="check ed-field"><input type="checkbox" id="${id}" data-path="${esc(path)}" data-type="bool" ${val ? "checked" : ""} /><span>${esc(labelOf(key))}</span></label>`;
    }
    if (typeof val === "number") {
      return `<div class="field ed-field">${lab}<input type="number" step="any" id="${id}" data-path="${esc(path)}" data-type="number" value="${esc(val)}" /></div>`;
    }
    const s = val == null ? "" : String(val);
    const long = LONG.has(key) || s.length > 70;
    return `<div class="field ed-field${long ? " full" : ""}">${lab}${long
      ? `<textarea id="${id}" data-path="${esc(path)}" rows="3">${esc(s)}</textarea>`
      : `<input id="${id}" data-path="${esc(path)}" value="${esc(s)}" />`}</div>`;
  };
  const renderNode = (path, key, val) => {
    if (Array.isArray(val)) return renderArray(path, key, val);
    if (val && typeof val === "object") {
      return `<fieldset class="ed-group"><legend>${esc(labelOf(key))}</legend><div class="ed-fields">${
        Object.keys(val).map((k) => renderNode(`${path}.${k}`, k, val[k])).join("")}</div></fieldset>`;
    }
    return inputFor(path, key, val);
  };
  const itemTools = (path, i, n) => `<span class="ed-tools">
      <button type="button" class="icon-btn" data-ed="up" data-path="${esc(path)}" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="위로">↑</button>
      <button type="button" class="icon-btn" data-ed="down" data-path="${esc(path)}" data-i="${i}" ${i === n - 1 ? "disabled" : ""} aria-label="아래로">↓</button>
      <button type="button" class="icon-btn danger" data-ed="del" data-path="${esc(path)}" data-i="${i}" aria-label="삭제">✕</button>
    </span>`;
  const renderArray = (path, key, arr) => {
    const objItems = arr.length ? arr.some((v) => v && typeof v === "object") : typeof templateFor(path, arr) === "object";
    return `<div class="ed-array full">
      <div class="ed-array-head"><span class="ed-array-title">${esc(labelOf(key))} <small>${arr.length}개</small></span>
        <button type="button" class="text-btn sm" data-ed="add" data-path="${esc(path)}">+ 추가</button></div>
      ${objItems
        ? list(arr, (v, i) => `<details class="ed-item" data-open-key="${esc(`${path}.${i}`)}">
            <summary><span class="ed-item-title">${esc(itemTitle(v, i))}</span>${itemTools(path, i, arr.length)}</summary>
            <div class="ed-fields">${v && typeof v === "object" ? Object.keys(v).map((k) => renderNode(`${path}.${i}.${k}`, k, v[k])).join("") : inputFor(`${path}.${i}`, String(i), v)}</div>
          </details>`)
        : list(arr, (v, i) => `<div class="ed-prim">${inputFor(`${path}.${i}`, String(i), v)}${itemTools(path, i, arr.length)}</div>`)}
    </div>`;
  };

  RENDER.editor = () => {
    if (!draft) { draft = clone(C); edDirty = false; }
    return head("사이트 편집", "항목을 고친 뒤 <b>저장하고 적용</b>을 누르면 사이트에 바로 반영돼요.",
      `<button class="text-btn" data-admin="ed-discard">고친 내용 취소</button>
       <button class="btn btn-sm" data-admin="ed-save">저장하고 적용</button>`) +
      `<div class="ed-tabs" role="tablist" aria-label="편집할 영역">${list(SECTIONS.filter(([k]) => draft[k] !== undefined), ([k, l]) =>
        `<button role="tab" data-ed-section="${k}" aria-selected="${k === edSection}">${esc(l)}</button>`)}
        <button role="tab" data-ed-section="__json" aria-selected="${edSection === "__json"}">{ } 고급(JSON)</button>
      </div>
      <p class="ed-dirty" ${edDirty ? "" : "hidden"}>● 저장하지 않은 변경 사항이 있어요.</p>
      <div class="ed-panel"></div>`;
  };
  const renderEditorSection = (keepOpen) => {
    const box = $(".ed-panel", panel);
    if (!box) return;
    const open = keepOpen ? $$("details.ed-item[open]", box).map((d) => d.dataset.openKey) : [];
    $$(".ed-tabs [data-ed-section]", panel).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.edSection === edSection)));
    if (edSection === "__json") {
      box.innerHTML = `<p class="admin-note">설정 전체를 JSON으로 직접 고칠 수 있어요. (예: 어떤 주차에 과제를 새로 추가할 때)</p>
        <textarea class="json-editor" spellcheck="false" aria-label="설정 JSON">${esc(JSON.stringify(draft, null, 2))}</textarea>
        <p class="field-error" data-err></p>
        <button class="btn btn-sm btn-secondary" data-admin="json-apply">JSON 내용을 편집 중인 설정에 반영</button>`;
      return;
    }
    const val = draft[edSection];
    box.innerHTML = `<div class="ed-fields">${val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val).map((k) => renderNode(`${edSection}.${k}`, k, val[k])).join("")
      : renderNode(edSection, edSection, val)}</div>`;
    open.forEach((k) => { const d = box.querySelector(`details[data-open-key="${CSS.escape(k)}"]`); if (d) d.open = true; });
  };
  const markDirty = () => { edDirty = true; const p = $(".ed-dirty", panel); if (p) p.hidden = false; };

  /* =====================================================================
   *  이벤트
   * ===================================================================== */
  function onPanelClick(e) {
    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) {
      if (currentTab === "editor" && edDirty && tabBtn.dataset.tab !== "editor" && !confirm("저장하지 않은 편집 내용이 있어요. 다른 메뉴로 이동할까요? (편집 내용은 그대로 남아 있어요)")) return;
      showTab(tabBtn.dataset.tab);
      return;
    }
    const sec = e.target.closest("[data-ed-section]");
    if (sec) { edSection = sec.dataset.edSection; renderEditorSection(); return; }

    const ed = e.target.closest("[data-ed]");
    if (ed) {
      e.preventDefault();
      const path = ed.dataset.path;
      const arr = getAt(draft, path);
      const i = Number(ed.dataset.i);
      if (ed.dataset.ed === "add") arr.push(templateFor(path, arr));
      if (ed.dataset.ed === "del") { if (!confirm(`${itemTitle(arr[i], i)} 항목을 삭제할까요?`)) return; arr.splice(i, 1); }
      if (ed.dataset.ed === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (ed.dataset.ed === "down" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      markDirty();
      renderEditorSection(true);
      if (ed.dataset.ed === "add") {
        const items = $$(`.ed-panel [data-open-key^="${CSS.escape(path)}."]`, panel).filter((d) => d.dataset.openKey.split(".").length === path.split(".").length + 1);
        const last = items[items.length - 1];
        if (last) { last.open = true; last.scrollIntoView({ block: "nearest" }); }
      }
      return;
    }

    const act = e.target.closest("[data-admin]");
    if (!act) return;
    const a = act.dataset.admin;
    const i = Number(act.dataset.i);
    if (a === "close") closePanel();
    else if (a === "logout") {
      ss.del("aiweb:admin");
      syncLock();
      closePanel();
      toast("관리자 화면을 잠갔어요.");
    }
    // 공지
    else if (a === "notice-edit") { editingNotice = i; showTab("notices"); $("#nt-title", panel).focus(); }
    else if (a === "notice-cancel") { editingNotice = null; showTab("notices"); }
    else if (a === "notice-del") {
      const items = [...(C.notices || [])];
      if (!confirm(`'${items[i].title}' 공지를 삭제할까요?`)) return;
      items.splice(i, 1);
      editingNotice = null;
      saveNotices(items);
      showTab("notices");
      toast("공지를 삭제했어요.");
    }
    // 명단
    else if (a === "roster-del") { const r = getRoster(); r.splice(i, 1); store.write("roster", r); showTab("roster"); }
    else if (a === "roster-clear") { if (confirm("수강생 명단을 모두 삭제할까요?")) { store.write("roster", []); showTab("roster"); } }
    else if (a === "roster-from-apps") { bulkResult(addToRoster(getApps())); showTab("roster"); }
    else if (a === "roster-csv") downloadCsv("수강생명단", [["학번", "이름", "학과", "이메일"], ...getRoster().map((r) => [r.studentId, r.name, r.department, r.email])]);
    // 신청 내역
    else if (a === "app-del") {
      const apps = getApps();
      if (!confirm(`${apps[i].name}(${apps[i].studentId}) 님의 신청서를 삭제할까요?`)) return;
      apps.splice(i, 1);
      store.write("applications", apps);
      showTab("applications");
    } else if (a === "apps-csv") {
      const fields = applyFields();
      downloadCsv("수강신청내역", [["접수번호", "제출 일시", ...fields.map((f) => f.label), "개인정보 동의"],
        ...getApps().map((ap) => [ap.receipt, stampText(ap.submittedAt), ...fields.map((f) => ap[f.name]), ap.agree ? "동의" : ""])]);
    }
    // 출석 · 제출
    else if (a === "att-csv") {
      downloadCsv("출석현황", [["학번", "이름", ...weeks.map((w) => `${w.label}(${ymd(w.date)})`), "출석", "지각", "결석", "출석률(%)"],
        ...attendanceRows().map((r) => [r.sid, r.name, ...r.cells.map((c) => statusLabel[c.s]), r.present, r.late, r.absent, r.rate == null ? "" : r.rate])]);
    } else if (a === "sub-csv") {
      downloadCsv("과제제출현황", [["주차", "과제", "학번", "이름", "파일명", "크기(KB)", "제출 일시", "마감 일시", "상태", "제출 횟수"],
        ...submissionRows().map((r) => [r.w.label, r.w.assignment.title, r.sid, r.name, r.s.fileName, (r.s.size / 1024).toFixed(1),
          stampText(r.s.time), stampText(r.w.assignment.due.getTime()), r.late ? "지각" : "제출", r.s.count || 1])]);
    }
    // 편집기
    else if (a === "ed-save") {
      saveOverride(draft);
      ss.set("aiweb:adminReopen", JSON.stringify({ tab: "editor", section: edSection }));
      draft = null;
      edDirty = false;
      location.reload();
    } else if (a === "ed-discard") {
      if (edDirty && !confirm("고친 내용을 모두 취소할까요?")) return;
      draft = clone(C);
      edDirty = false;
      showTab("editor");
    } else if (a === "json-apply") {
      const ta = $(".json-editor", panel);
      const err = $(".ed-panel [data-err]", panel);
      try {
        const parsed = JSON.parse(ta.value);
        if (!parsed || typeof parsed !== "object" || !parsed.site) throw new Error("site 항목이 없는 설정이에요.");
        draft = parsed;
        markDirty();
        err.textContent = "";
        toast("JSON 내용을 반영했어요. '저장하고 적용'을 눌러 마무리하세요.", "success");
      } catch (ex) {
        err.textContent = `JSON 형식 오류: ${ex.message}`;
      }
    }
    // 설정 파일
    else if (a === "export") {
      const d = new Date();
      const text = `/* 사이트 설정 파일 — 관리자 화면에서 내려받음 (${ymd(d)} ${fmtTime(d)})\n` +
        ` * 이 파일로 사이트 폴더의 config.js를 교체하면 모든 방문자에게 반영됩니다. */\n` +
        `window.SITE_CONFIG = ${JSON.stringify(C, null, 2)};\n`;
      download("config.js", text, "text/javascript;charset=utf-8");
      toast("config.js를 내려받았어요.", "success");
    } else if (a === "import-apply" && pendingImport) {
      saveOverride(pendingImport);
      pendingImport = null;
      ss.set("aiweb:adminReopen", JSON.stringify({ tab: "files" }));
      location.reload();
    } else if (a === "import-cancel") {
      pendingImport = null;
      $(".import-preview", panel).innerHTML = "";
    } else if (a === "reset") {
      if (!confirm("이 브라우저에서 고친 설정을 지우고 config.js 원본으로 되돌릴까요?")) return;
      store.remove("configOverride");
      ss.set("aiweb:adminReopen", JSON.stringify({ tab: "files" }));
      location.reload();
    }
  }

  function onPanelInput(e) {
    const el = e.target;
    if (el.dataset.path && draft && currentTab === "editor") {
      let v = el.value;
      if (el.dataset.type === "number") v = el.value === "" ? 0 : Number(el.value);
      if (el.dataset.type === "bool") v = el.checked;
      setAt(draft, el.dataset.path, v);
      markDirty();
      // 항목 제목이 바뀌면 접힌 제목도 갱신
      const det = el.closest("details.ed-item");
      if (det) {
        const key = det.dataset.openKey;
        const idx = Number(key.split(".").pop());
        $(".ed-item-title", det).textContent = itemTitle(getAt(draft, key), idx);
      }
      return;
    }
    if (el.dataset.filter === "apps") {
      const q = el.value.trim().toLowerCase();
      $$(".admin-table tbody tr", panel).forEach((tr) => { tr.hidden = q && !(tr.dataset.search || "").toLowerCase().includes(q); });
    }
  }

  function onPanelChange(e) {
    const el = e.target;
    if (el.dataset.type === "bool") { onPanelInput(e); return; }
    const kind = el.dataset.adminFile;
    if (!kind || !el.files || !el.files[0]) return;
    const file = el.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      if (kind === "roster") {
        bulkResult(addToRoster(parseCsvLines(text).map((c) => ({ studentId: c[0], name: c[1], department: c[2], email: c[3] }))));
        showTab("roster");
      } else if (kind === "config") {
        const box = $(".import-preview", panel);
        try {
          const start = text.indexOf("{");
          const end = text.lastIndexOf("}");
          if (start < 0 || end < start) throw new Error("설정 내용을 찾지 못했어요.");
          const parsed = JSON.parse(text.slice(start, end + 1));
          if (!parsed.site) throw new Error("사이트 설정 파일이 아니에요. (site 항목 없음)");
          pendingImport = parsed;
          const s = parsed.site;
          box.innerHTML = `<div class="import-ok">
            <p>✅ <b>${esc(file.name)}</b>을(를) 읽었어요.</p>
            <ul><li>과목: ${esc(`${s.university || ""} ${s.department || ""} 「${s.courseName || ""}」`)}</li>
              <li>주차 ${((parsed.curriculum && parsed.curriculum.weeks) || []).length}개 · 공지 ${(parsed.notices || []).length}건</li></ul>
            <div class="admin-actions"><button class="btn btn-sm" data-admin="import-apply">이 설정 적용하기</button>
              <button class="text-btn" data-admin="import-cancel">취소</button></div></div>`;
        } catch (ex) {
          pendingImport = null;
          box.innerHTML = `<p class="field-error">불러오지 못했어요: ${esc(ex.message)}<br />관리자 화면에서 내려받은 설정 파일인지 확인해 주세요.</p>`;
        }
      }
      el.value = "";
    };
    reader.readAsText(file, "utf-8");
  }

  function onPanelSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const kind = form.dataset.form;
    const err = $("[data-err]", form);
    const val = (n) => (form.elements.namedItem(n) ? String(form.elements.namedItem(n).value).trim() : "");
    if (kind === "notice") {
      const title = val("title");
      if (!title) { err.textContent = "제목을 입력해 주세요."; form.elements.namedItem("title").focus(); return; }
      const item = { title, body: val("body"), date: val("date") || ymd(now()), pinned: form.elements.namedItem("pinned").checked };
      const items = [...(C.notices || [])];
      if (editingNotice != null) items[editingNotice] = item; else items.unshift(item);
      const wasEdit = editingNotice != null;
      editingNotice = null;
      saveNotices(items);
      showTab("notices");
      toast(wasEdit ? "공지를 수정했어요." : "공지를 올렸어요! 사이트 맨 위에서 확인할 수 있어요.", "success");
    } else if (kind === "roster-one") {
      const id = val("studentId"), name = val("name");
      if (!/^\d{10}$/.test(id)) { err.textContent = "학번은 숫자 10자리로 입력해 주세요."; form.elements.namedItem("studentId").focus(); return; }
      if (!name) { err.textContent = "이름을 입력해 주세요."; form.elements.namedItem("name").focus(); return; }
      const r = addToRoster([{ studentId: id, name, department: val("department"), email: val("email") }]);
      if (r.dup) { err.textContent = "이미 명단에 있는 학번이에요."; return; }
      showTab("roster");
      toast(`${name} 님을 명단에 추가했어요.`, "success");
      $("#rs-id", panel).focus();
    } else if (kind === "roster-bulk") {
      const lines = parseCsvLines(val("bulk"));
      if (!lines.length) { toast("붙여 넣은 내용이 없거나 형식이 맞지 않아요.", "warn"); return; }
      bulkResult(addToRoster(lines.map((c) => ({ studentId: c[0], name: c[1], department: c[2], email: c[3] }))));
      showTab("roster");
    } else if (kind === "password") {
      const cur = form.elements.namedItem("cur").value;
      const next = form.elements.namedItem("next").value;
      const next2 = form.elements.namedItem("next2").value;
      const a = C.admin || {};
      if (hashPassword(cur, a.salt || "", Number(a.iterations) || 1) !== a.passwordHash) { err.textContent = "현재 비밀번호가 맞지 않아요."; return; }
      if (next.length < 8) { err.textContent = "새 비밀번호는 8자 이상이어야 해요."; return; }
      if (next !== next2) { err.textContent = "새 비밀번호 확인이 일치하지 않아요."; return; }
      const salt = randomSalt();
      const iterations = 20000;
      C.admin = { salt, iterations, passwordHash: hashPassword(next, salt, iterations) };
      saveOverride(clone(C));
      window.SITE_CONFIG_OVERRIDDEN = true;
      form.reset();
      err.textContent = "";
      toast("비밀번호를 바꿨어요. 배포본에 적용하려면 설정 파일을 내려받아 교체하세요.", "success");
    }
  }

  /* ----- 시작 ----- */
  lockBtn.addEventListener("click", () => (isAdmin() ? openPanel(currentTab) : openLogin()));
  syncLock();
  const reopen = ss.get("aiweb:adminReopen");
  if (reopen && isAdmin()) {
    ss.del("aiweb:adminReopen");
    try {
      const r = JSON.parse(reopen);
      if (r.section) edSection = r.section;
      openPanel(r.tab || "dashboard");
      toast("저장하고 사이트에 적용했어요.", "success");
    } catch (e) { /* 무시 */ }
  }
  // 콘솔 확인용 (비밀번호 해시 계산 등)
  window.SiteAdmin = { sha256hex, hashPassword, openPanel };
})();
