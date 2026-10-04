/* 강의 소개 사이트 서버
 * - 정적 파일(index.html, style.css, *.js, images/) 제공
 * - 투표 · 수강 신청 · 학생 로그인 · 출석 · 과제 제출 · 수강생 명단 · 관리자 설정을 PostgreSQL에 저장
 * 환경 변수
 *   DATABASE_URL  PostgreSQL 연결 주소 (Railway에서 Postgres 서비스를 연결하면 자동으로 들어옴). 없으면 API 끔 → 데모 모드
 *   PORT          서버 포트 (Railway가 자동 지정)
 *   ADMIN_SECRET  관리자 로그인 토큰 서명용 비밀값 (없으면 서버가 켜질 때마다 새로 만들어짐 → 재시작 시 관리자 재로그인)
 *   PGSSL=true    외부(공개) 주소로 접속할 때 SSL 사용
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const ROOT = __dirname;
const KST = 9 * 3600e3;
const DAY = 864e5;

/* ---------- 설정 파일(config.js) 읽기 ---------- */
function loadDefaultConfig() {
  const code = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { timeout: 1000 });
  return sandbox.window.SITE_CONFIG;
}

/* ---------- 날짜 계산 (한국 시간 기준) ---------- */
const dayNum = (str) => {
  const [y, m, d] = String(str).trim().split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
const instant = (day, hhmm) => {
  const [h, mi] = String(hhmm || "00:00").split(":").map(Number);
  return day * DAY + (h || 0) * 36e5 + (mi || 0) * 6e4 - KST;
};
const kstDay = (ms) => Math.floor((ms + KST) / DAY);

function computeWeeks(cfg) {
  const sch = cfg.schedule || {};
  const holidays = new Set((sch.holidays || []).map((h) => dayNum(h.date)));
  let cursor = dayNum(sch.startDate);
  return ((cfg.curriculum && cfg.curriculum.weeks) || []).map((w, i) => {
    let day;
    if (w.date) day = dayNum(w.date);
    else {
      while (holidays.has(cursor)) cursor += 7;
      day = cursor;
    }
    cursor = day + 7;
    let due = null;
    if (w.assignment) {
      const a = w.assignment;
      if (a.due) {
        const [d, t] = String(a.due).trim().split(/[ T]+/);
        due = instant(dayNum(d), t || "23:59");
      } else {
        due = instant(day + (a.dueAfterDays == null ? 6 : Number(a.dueAfterDays)), a.dueTime || "23:59");
      }
    }
    return {
      no: i + 1,
      day,
      start: instant(day, w.startTime || sch.startTime),
      end: instant(day, w.endTime || sch.endTime),
      due,
    };
  });
}

// 테스트용 '지금' 덮어쓰기: 환경 변수 NOW_OVERRIDE 또는 config의 schedule.todayOverride
function nowMs(cfg) {
  const o = process.env.NOW_OVERRIDE || (cfg.schedule && cfg.schedule.todayOverride) || "";
  if (/^\d{4}-\d{1,2}-\d{1,2}[ T]\d{1,2}:\d{2}$/.test(o)) {
    const [d, t] = o.split(/[ T]+/);
    return instant(dayNum(d), t);
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(o)) return dayNum(o) * DAY + ((Date.now() + KST) % DAY) - KST;
  return Date.now();
}

function attendanceState(cfg, at) {
  const weeks = computeWeeks(cfg);
  const w = weeks.find((x) => x.day === kstDay(at));
  if (!w) return { state: "none" };
  const att = (cfg.student && cfg.student.attendance) || {};
  const open = w.start - (Number(att.openBeforeMin) || 0) * 6e4;
  const late = w.start + (Number(att.lateAfterMin) || 0) * 6e4;
  if (at < open) return { state: "before", week: w };
  if (at < late) return { state: "ontime", week: w };
  if (at <= w.end) return { state: "late", week: w };
  return { state: "ended", week: w };
}

/* ---------- 비밀번호 · 관리자 토큰 ---------- */
const sha256hex = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
function hashPassword(pw, salt, iterations) {
  let h = sha256hex(salt + pw);
  for (let i = 1; i < iterations; i++) h = sha256hex(h + salt);
  return h;
}
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/* ---------- DB 표 만들기 ---------- */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS poll_votes (
     poll_id TEXT NOT NULL, voter TEXT NOT NULL, option_id TEXT NOT NULL,
     voted_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (poll_id, voter))`,
  `CREATE TABLE IF NOT EXISTS applications (
     id SERIAL PRIMARY KEY, receipt TEXT, student_id TEXT NOT NULL UNIQUE,
     data JSONB NOT NULL, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS roster (
     student_id TEXT PRIMARY KEY, name TEXT NOT NULL, department TEXT, email TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS students (
     student_id TEXT PRIMARY KEY, name TEXT NOT NULL, last_login TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS attendance (
     student_id TEXT NOT NULL, week INTEGER NOT NULL, status TEXT NOT NULL,
     checked_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (student_id, week))`,
  `CREATE TABLE IF NOT EXISTS submissions (
     id SERIAL PRIMARY KEY, student_id TEXT NOT NULL, week INTEGER NOT NULL,
     file_name TEXT NOT NULL, mime TEXT, size INTEGER NOT NULL, content BYTEA NOT NULL,
     submit_count INTEGER NOT NULL DEFAULT 1, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (student_id, week))`,
  `CREATE TABLE IF NOT EXISTS site_config (
     id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
];

/* ---------- HTTP 도우미 ---------- */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
};
const PUBLIC_FILES = new Set(["index.html", "style.css", "main.js", "features.js", "admin.js", "config.js"]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "X-Content-Type-Options": "nosniff", ...headers });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on("data", (c) => {
      if (tooBig) return; // 나머지는 읽고 버려서 오류 응답이 정상적으로 전달되게 함
      size += c.length;
      if (size > limit) { tooBig = true; chunks.length = 0; return; }
      chunks.push(c);
    });
    req.on("end", () => (tooBig ? reject(new HttpError(413, "보낸 데이터가 너무 커요.")) : resolve(Buffer.concat(chunks))));
    req.on("error", reject);
  });
}
async function readJson(req, limit = 1024 * 1024) {
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString("utf8")); } catch (e) { throw new HttpError(400, "잘못된 요청 형식이에요."); }
}

/* ---------- 앱 ---------- */
function createApp({ pool, defaultConfig = loadDefaultConfig(), adminSecret = process.env.ADMIN_SECRET } = {}) {
  const secret = adminSecret || crypto.randomBytes(32).toString("hex");
  let override = null; // DB에 저장된 관리자 수정본
  const config = () => override || defaultConfig;
  const loginFails = new Map(); // ip → { count, until }

  async function init() {
    if (!pool) return;
    for (const sql of SCHEMA) await pool.query(sql);
    const r = await pool.query("SELECT data FROM site_config WHERE id = 1");
    override = r.rows[0] ? r.rows[0].data : null;
  }

  const signToken = (exp) => `${exp}.${crypto.createHmac("sha256", secret).update(`admin:${exp}`).digest("hex")}`;
  const requireAdmin = (req) => {
    const m = /^Bearer (\d+)\.([0-9a-f]{64})$/.exec(req.headers.authorization || "");
    if (!m || Number(m[1]) < Date.now() || !safeEqual(signToken(m[1]), `${m[1]}.${m[2]}`)) {
      throw new HttpError(401, "관리자 로그인이 필요해요.");
    }
  };
  const requireDb = () => { if (!pool) throw new HttpError(503, "데이터베이스가 연결되지 않았어요."); };

  const validId = (id) => /^\d{10}$/.test(String(id || ""));
  const cleanName = (n) => String(n || "").trim().slice(0, 40);

  async function pollCounts(pollId) {
    const r = await pool.query("SELECT option_id, COUNT(*)::int AS n FROM poll_votes WHERE poll_id = $1 GROUP BY option_id", [pollId]);
    const counts = {};
    r.rows.forEach((row) => (counts[row.option_id] = row.n));
    return counts;
  }

  async function studentRecords(sid) {
    const a = await pool.query("SELECT week, status, checked_at FROM attendance WHERE student_id = $1", [sid]);
    const s = await pool.query("SELECT week, file_name, size, submitted_at, submit_count FROM submissions WHERE student_id = $1", [sid]);
    const attendance = {};
    a.rows.forEach((r) => (attendance[r.week] = { status: r.status, time: new Date(r.checked_at).getTime() }));
    const submissions = {};
    s.rows.forEach((r) => (submissions[r.week] = { fileName: r.file_name, size: r.size, time: new Date(r.submitted_at).getTime(), count: r.submit_count }));
    return { attendance, submissions };
  }

  // 학번·이름이 로그인한 적 있는 학생인지 확인
  async function verifyStudent(sid, name) {
    if (!validId(sid) || !cleanName(name)) throw new HttpError(400, "학번과 이름을 확인해 주세요.");
    const r = await pool.query("SELECT name FROM students WHERE student_id = $1", [sid]);
    if (!r.rows[0] || r.rows[0].name !== cleanName(name)) throw new HttpError(403, "먼저 학생 공간에 다시 로그인해 주세요.");
  }

  function validateApplication(data) {
    const fields = (config().apply && config().apply.fields) || [];
    const out = {};
    for (const f of fields) {
      const v = data[f.name];
      if (f.type === "checkbox") {
        if (f.required && v !== true) throw new HttpError(400, `${f.label} 항목에 동의가 필요해요.`);
        out[f.name] = v === true;
        continue;
      }
      const s = String(v == null ? "" : v).trim().slice(0, 2000);
      if (f.required && !s) throw new HttpError(400, `${f.label} 항목을 입력해 주세요.`);
      if (s && f.pattern && !new RegExp(f.pattern).test(s)) throw new HttpError(400, f.patternMessage || `${f.label} 형식을 확인해 주세요.`);
      if (s && f.minLength && s.length < f.minLength) throw new HttpError(400, `${f.label}은(는) ${f.minLength}자 이상 입력해 주세요.`);
      if (s && (f.type === "select" || f.type === "radio") && Array.isArray(f.options) && !f.options.includes(s)) {
        throw new HttpError(400, `${f.label} 값을 확인해 주세요.`);
      }
      out[f.name] = s;
    }
    if (!validId(out.studentId)) throw new HttpError(400, "학번은 숫자 10자리로 입력해 주세요.");
    return out;
  }

  /* ----- API 라우터 ----- */
  async function api(req, res, url) {
    const p = url.pathname;
    const method = req.method;
    let m;

    if (p === "/api/health") return json(res, 200, { ok: true, db: !!pool });
    requireDb();

    // 투표
    if ((m = /^\/api\/poll\/([\w-]{1,64})$/.exec(p)) && method === "GET") {
      return json(res, 200, { counts: await pollCounts(m[1]) });
    }
    if ((m = /^\/api\/poll\/([\w-]{1,64})\/vote$/.exec(p))) {
      const body = await readJson(req);
      const voter = String(body.voter || "");
      if (!/^[\w-]{8,64}$/.test(voter)) throw new HttpError(400, "잘못된 투표 요청이에요.");
      if (method === "POST") {
        const poll = config().poll || {};
        if ((poll.id || "default") !== m[1] || !(poll.options || []).some((o) => o.id === body.optionId)) {
          throw new HttpError(400, "없는 선택지예요.");
        }
        await pool.query(
          `INSERT INTO poll_votes (poll_id, voter, option_id) VALUES ($1, $2, $3)
           ON CONFLICT (poll_id, voter) DO UPDATE SET option_id = EXCLUDED.option_id, voted_at = now()`,
          [m[1], voter, body.optionId]
        );
      } else if (method === "DELETE") {
        await pool.query("DELETE FROM poll_votes WHERE poll_id = $1 AND voter = $2", [m[1], voter]);
      } else throw new HttpError(405, "지원하지 않는 요청이에요.");
      return json(res, 200, { counts: await pollCounts(m[1]) });
    }

    // 수강 신청
    if (p === "/api/applications" && method === "POST") {
      const body = await readJson(req);
      const data = validateApplication(body.data || {});
      try {
        const r = await pool.query("INSERT INTO applications (student_id, data) VALUES ($1, $2) RETURNING id", [data.studentId, JSON.stringify(data)]);
        const receipt = `AI26-${String(r.rows[0].id).padStart(4, "0")}`;
        await pool.query("UPDATE applications SET receipt = $1 WHERE id = $2", [receipt, r.rows[0].id]);
        return json(res, 201, { receipt });
      } catch (e) {
        if (e.code === "23505" || /duplicate|unique/i.test(e.message)) throw new HttpError(409, "이미 신청서를 제출한 학번입니다.");
        throw e;
      }
    }

    // 학생 로그인 · 기록
    if (p === "/api/student/login" && method === "POST") {
      const body = await readJson(req);
      const sid = String(body.studentId || "");
      const name = cleanName(body.name);
      if (!validId(sid) || name.length < 2) throw new HttpError(400, "학번과 이름을 확인해 주세요.");
      const rc = await pool.query("SELECT COUNT(*)::int AS n FROM roster");
      if (rc.rows[0].n > 0) {
        const r = await pool.query("SELECT 1 FROM roster WHERE student_id = $1 AND name = $2", [sid, name]);
        if (!r.rows.length) throw new HttpError(403, "수강생 명단에 없는 학번·이름이에요. 학번과 이름을 확인하거나 교수자에게 문의해 주세요.");
      } else {
        // 명단이 없을 때: 같은 학번을 다른 이름으로 쓰는 것만 막음
        const r = await pool.query("SELECT name FROM students WHERE student_id = $1", [sid]);
        if (r.rows[0] && r.rows[0].name !== name) throw new HttpError(403, "이미 다른 이름으로 등록된 학번이에요. 교수자에게 문의해 주세요.");
      }
      await pool.query(
        `INSERT INTO students (student_id, name) VALUES ($1, $2)
         ON CONFLICT (student_id) DO UPDATE SET name = EXCLUDED.name, last_login = now()`,
        [sid, name]
      );
      return json(res, 200, await studentRecords(sid));
    }
    if (p === "/api/student/records" && method === "GET") {
      const sid = url.searchParams.get("studentId");
      await verifyStudent(sid, url.searchParams.get("name"));
      return json(res, 200, await studentRecords(sid));
    }

    // 출석 (서버 시각으로 출석·지각·마감 판단)
    if (p === "/api/attendance" && method === "POST") {
      const body = await readJson(req);
      const sid = String(body.studentId || "");
      await verifyStudent(sid, body.name);
      const cs = attendanceState(config(), nowMs(config()));
      if (cs.state === "none") throw new HttpError(409, "오늘은 수업이 없어요.");
      if (cs.state === "before") throw new HttpError(409, "아직 출석 체크 시간이 아니에요.");
      if (cs.state === "ended") throw new HttpError(409, "오늘 수업이 끝나 출석 체크가 마감되었어요.");
      const status = cs.state === "late" ? "late" : "present";
      await pool.query(
        "INSERT INTO attendance (student_id, week, status) VALUES ($1, $2, $3) ON CONFLICT (student_id, week) DO NOTHING",
        [sid, cs.week.no, status]
      );
      return json(res, 200, { ...(await studentRecords(sid)), status });
    }

    // 과제 제출 (파일 본문을 그대로 받음)
    if (p === "/api/submissions" && method === "POST") {
      const sid = url.searchParams.get("studentId");
      await verifyStudent(sid, url.searchParams.get("name"));
      const weekNo = Number(url.searchParams.get("week"));
      const cfg = config();
      const w = computeWeeks(cfg).find((x) => x.no === weekNo);
      if (!w || !w.due) throw new HttpError(400, "과제가 있는 주차가 아니에요.");
      if (nowMs(cfg) > w.due) throw new HttpError(409, "마감된 과제라 제출할 수 없어요.");
      let fileName = "";
      try { fileName = decodeURIComponent(req.headers["x-file-name"] || ""); } catch (e) { fileName = ""; }
      fileName = path.basename(fileName).slice(0, 200);
      if (!fileName) throw new HttpError(400, "파일 이름이 없어요.");
      const sub = (cfg.student && cfg.student.submission) || {};
      const accept = (sub.accept || []).map((x) => String(x).toLowerCase());
      const ext = (path.extname(fileName) || "").toLowerCase();
      if (accept.length && !accept.includes(ext)) throw new HttpError(400, `${ext || "확장자 없는"} 파일은 제출할 수 없어요.`);
      const maxBytes = (Number(sub.maxFileMB) || 20) * 1048576;
      const content = await readBody(req, maxBytes);
      if (!content.length) throw new HttpError(400, "빈 파일은 제출할 수 없어요.");
      const mime = String(req.headers["content-type"] || "application/octet-stream").slice(0, 100);
      await pool.query(
        `INSERT INTO submissions (student_id, week, file_name, mime, size, content) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, week) DO UPDATE SET file_name = EXCLUDED.file_name, mime = EXCLUDED.mime,
           size = EXCLUDED.size, content = EXCLUDED.content, submit_count = submissions.submit_count + 1, submitted_at = now()`,
        [sid, weekNo, fileName, mime, content.length, content]
      );
      return json(res, 200, await studentRecords(sid));
    }

    /* ----- 관리자 ----- */
    if (p === "/api/admin/login" && method === "POST") {
      const ip = req.headers["x-forwarded-for"] ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : req.socket.remoteAddress;
      const f = loginFails.get(ip) || { count: 0, until: 0 };
      if (f.until > Date.now()) throw new HttpError(429, `여러 번 틀려서 잠시 잠겼어요. ${Math.ceil((f.until - Date.now()) / 1000)}초 뒤에 다시 시도해 주세요.`);
      const body = await readJson(req);
      const a = config().admin || {};
      const ok = a.passwordHash && typeof body.password === "string" &&
        safeEqual(hashPassword(body.password, a.salt || "", Number(a.iterations) || 1), a.passwordHash);
      if (!ok) {
        f.count += 1;
        if (f.count >= 5) { f.until = Date.now() + 30000; f.count = 0; }
        loginFails.set(ip, f);
        throw new HttpError(401, f.until > Date.now() ? "5번 틀려서 30초 동안 잠겼어요." : `비밀번호가 맞지 않아요. (${f.count}/5)`);
      }
      loginFails.delete(ip);
      return json(res, 200, { token: signToken(Date.now() + 12 * 3600e3) });
    }

    if (p.startsWith("/api/admin/")) {
      requireAdmin(req);

      if (p === "/api/admin/data" && method === "GET") {
        const [apps, roster, students, att, subs] = await Promise.all([
          pool.query("SELECT id, receipt, data, submitted_at FROM applications ORDER BY id"),
          pool.query("SELECT student_id, name, department, email FROM roster ORDER BY student_id"),
          pool.query("SELECT student_id, name FROM students"),
          pool.query("SELECT student_id, week, status, checked_at FROM attendance"),
          pool.query("SELECT id, student_id, week, file_name, size, submitted_at, submit_count FROM submissions"),
        ]);
        const attendance = {};
        att.rows.forEach((r) => ((attendance[r.student_id] = attendance[r.student_id] || {})[r.week] = { status: r.status, time: new Date(r.checked_at).getTime() }));
        const submissions = {};
        subs.rows.forEach((r) => ((submissions[r.student_id] = submissions[r.student_id] || {})[r.week] = {
          id: r.id, fileName: r.file_name, size: r.size, time: new Date(r.submitted_at).getTime(), count: r.submit_count,
        }));
        const known = {};
        students.rows.forEach((r) => (known[r.student_id] = r.name));
        return json(res, 200, {
          applications: apps.rows.map((r) => ({ ...r.data, id: r.id, receipt: r.receipt, submittedAt: new Date(r.submitted_at).getTime() })),
          roster: roster.rows.map((r) => ({ studentId: r.student_id, name: r.name, department: r.department || "", email: r.email || "" })),
          students: known,
          attendance,
          submissions,
        });
      }
      if ((m = /^\/api\/admin\/applications\/(\d+)$/.exec(p)) && method === "DELETE") {
        await pool.query("DELETE FROM applications WHERE id = $1", [Number(m[1])]);
        return json(res, 200, { ok: true });
      }
      if (p === "/api/admin/roster" && method === "POST") {
        const body = await readJson(req, 4 * 1024 * 1024);
        let added = 0, dup = 0, bad = 0;
        for (const person of Array.isArray(body.people) ? body.people.slice(0, 5000) : []) {
          const sid = String(person.studentId || "").trim();
          const name = cleanName(person.name);
          if (!validId(sid) || !name) { bad++; continue; }
          const exists = await pool.query("SELECT 1 FROM roster WHERE student_id = $1", [sid]);
          if (exists.rows.length) { dup++; continue; }
          await pool.query(
            "INSERT INTO roster (student_id, name, department, email) VALUES ($1, $2, $3, $4) ON CONFLICT (student_id) DO NOTHING",
            [sid, name, String(person.department || "").trim().slice(0, 80), String(person.email || "").trim().slice(0, 120)]
          );
          added++;
        }
        return json(res, 200, { added, dup, bad });
      }
      if (p === "/api/admin/roster" && method === "DELETE") {
        await pool.query("DELETE FROM roster");
        return json(res, 200, { ok: true });
      }
      if ((m = /^\/api\/admin\/roster\/(\d{10})$/.exec(p)) && method === "DELETE") {
        await pool.query("DELETE FROM roster WHERE student_id = $1", [m[1]]);
        return json(res, 200, { ok: true });
      }
      if ((m = /^\/api\/admin\/submissions\/(\d+)\/file$/.exec(p)) && method === "GET") {
        const r = await pool.query("SELECT file_name, mime, content FROM submissions WHERE id = $1", [Number(m[1])]);
        if (!r.rows[0]) throw new HttpError(404, "파일을 찾지 못했어요.");
        const row = r.rows[0];
        return send(res, 200, row.content, {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,
          "Cache-Control": "no-store",
        });
      }
      if (p === "/api/admin/config" && method === "PUT") {
        const body = await readJson(req, 2 * 1024 * 1024);
        const cfg = body.config;
        if (!cfg || typeof cfg !== "object" || !cfg.site || !cfg.curriculum) throw new HttpError(400, "사이트 설정 형식이 아니에요.");
        await pool.query(
          `INSERT INTO site_config (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [JSON.stringify(cfg)]
        );
        override = cfg;
        return json(res, 200, { ok: true });
      }
      if (p === "/api/admin/config" && method === "DELETE") {
        await pool.query("DELETE FROM site_config WHERE id = 1");
        override = null;
        return json(res, 200, { ok: true });
      }
    }
    throw new HttpError(404, "없는 주소예요.");
  }

  /* ----- 요청 처리 ----- */
  async function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname.startsWith("/api/")) return await api(req, res, url);
      if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "지원하지 않는 요청이에요.");

      // 브라우저가 서버 모드인지 알 수 있게 하는 스크립트 + DB에 저장된 설정
      if (url.pathname === "/site-data.js") {
        const body = `window.SITE_API = ${JSON.stringify({ enabled: !!pool })};\nwindow.SITE_CONFIG_OVERRIDE = ${pool && override ? JSON.stringify(override) : "null"};\n`;
        return send(res, 200, body, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" });
      }

      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      const allowed = PUBLIC_FILES.has(rel) || /^images\/[\w\-./가-힣 ]+$/.test(rel);
      const file = path.join(ROOT, rel);
      if (!allowed || !file.startsWith(ROOT + path.sep) || rel.includes("..")) throw new HttpError(404, "페이지를 찾지 못했어요.");
      const data = await fs.promises.readFile(file).catch(() => { throw new HttpError(404, "페이지를 찾지 못했어요."); });
      return send(res, 200, req.method === "HEAD" ? "" : data, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": rel.endsWith(".html") ? "no-cache" : "public, max-age=300",
      });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      if (url.pathname.startsWith("/api/")) return json(res, status, { error: status === 500 ? "서버 오류가 발생했어요." : e.message });
      return send(res, status, status === 404 ? "404 Not Found" : "Error", { "Content-Type": "text/plain; charset=utf-8" });
    }
  }

  return { init, handle, server: http.createServer(handle) };
}

/* ---------- 실행 ---------- */
if (require.main === module) {
  let pool = null;
  if (process.env.DATABASE_URL) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  } else {
    console.warn("DATABASE_URL이 없어서 데모 모드(브라우저 저장)로 실행합니다.");
  }
  const app = createApp({ pool });
  app.init()
    .then(() => {
      const port = Number(process.env.PORT) || 8080;
      app.server.listen(port, "0.0.0.0", () => console.log(`서버 실행 중: http://localhost:${port} (DB ${pool ? "연결됨" : "없음"})`));
    })
    .catch((e) => {
      console.error("DB 초기화 실패:", e);
      process.exit(1);
    });
}

module.exports = { createApp, computeWeeks, attendanceState, hashPassword, nowMs };
