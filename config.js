/* =====================================================================
 *  사이트 설정 파일 (이 파일만 고치면 사이트 전체 내용이 바뀝니다)
 *
 *  - 문자열은 따옴표("...") 안에서만 수정하세요.
 *  - 항목을 추가할 때는 기존 항목 { ... } 하나를 복사해서 쉼표(,)로 이어 붙이면 됩니다.
 *  - 저장한 뒤 브라우저에서 index.html을 새로고침하면 바로 반영됩니다.
 * ===================================================================== */
window.SITE_CONFIG = {
  /* ---------- 기본 정보 ---------- */
  site: {
    university: "고려대학교",
    department: "○○학과",
    courseName: "○○○",                 // 「」 없이 과목명만 입력
  },

  /* ---------- 공지사항 (관리자 화면 > 공지 관리에서 올리는 것을 권장) ----------
   *  date: "YYYY-MM-DD", pinned: true면 맨 위에 고정 */
  notices: [
    {
      title: "첫 수업은 3월 3일(화) 14시, ○○관 000호에서 시작합니다",
      body: "첫 시간에는 실습 계정을 함께 만듭니다. 노트북과 Google 계정을 꼭 준비해 주세요.",
      date: "2026-02-25",
      pinned: true,
    },
  ],

  /* ---------- 관리자 비밀번호 ----------
   *  비밀번호 원문 대신 '해시값'만 저장합니다. 직접 고치지 말고
   *  관리자 화면 > 비밀번호 변경에서 바꾼 뒤 설정 파일을 내려받아 이 파일을 교체하세요. */
  admin: {
    salt: "c3d0c7c79ed375fe40ece535e84aa720",
    iterations: 20000,
    passwordHash: "e606cd31a81eb0b97145f9b4af23f997e0e11c621408f42071be93c43b88b717",
  },

  /* ---------- 상단 메뉴 (target은 섹션 id: about / curriculum / calendar / participate / tools / enroll / apply / faq / instructor) ---------- */
  nav: [
    { label: "프로그램 소개", target: "about" },
    { label: "커리큘럼", target: "curriculum" },
    { label: "수업 달력", target: "calendar" },
    { label: "참여하기", target: "participate" },
    { label: "수강 안내", target: "enroll" },
    { label: "FAQ", target: "faq" },
    { label: "교수자", target: "instructor" },
  ],

  /* ---------- 첫 화면 ---------- */
  hero: {
    badge: "2026 상반기 집중 프로그램",
    displayWord: "data",               // 첫 화면 사진 위에 크게 겹쳐 보이는 영문 단어 (짧을수록 예뻐요: 4~6글자)
    image: "",                         // 첫 화면 사진 경로 (예: "images/hero.jpg"). 비워두면 세이지 톤 그림 패널
    subtitle: "AI 기반 데이터 활용능력 배양",
    description:
      "생성형 AI를 활용해 데이터를 수집·정리·분석·시각화하는 전 과정을 직접 실습합니다. " +
      "코딩 경험이 없어도 괜찮습니다. 15주 동안 나만의 데이터 분석 결과물을 완성해 보세요.",
    // target: 페이지 안 섹션 id로 이동 / url: 외부 링크(예: 수강신청 사이트)로 이동
    buttons: [
      { label: "수강 신청하기", target: "apply", style: "primary" },
      { label: "커리큘럼 보기", target: "curriculum", style: "secondary" },
    ],
    // 첫 화면 아래 한눈에 보기
    quickInfo: [
      // auto: "schedule" → 아래 수업 일정(schedule)에서 기간을 자동 계산해 표시
      { icon: "📅", label: "일정", auto: "schedule" },
      { icon: "⏰", label: "시간", value: "매주 화요일 14:00 – 16:45" },
      { icon: "💻", label: "수업 방식", value: "대면 강의 + AI 도구 실습" },
      { icon: "🎓", label: "수강 대상", value: "전 학년 · 타과생 환영 (비전공자 가능)" },
    ],
  },

  /* ---------- 통계 카드 ----------
   *  value: 숫자 (스크롤하면 0부터 올라가는 효과)
   *  auto: "tools" 로 적으면 아래 AI 도구 개수가 자동으로 들어갑니다. */
  stats: [
    { value: 15, suffix: "주", label: "체계적인 과정" },
    { auto: "tools", suffix: "개", label: "실습 AI 도구" },
    { value: 12, suffix: "권", label: "교수자 저술" },
    { value: 20, suffix: "년+", label: "강의 경력" },
  ],

  /* ---------- 프로그램 소개 (장점 슬라이드) ---------- */
  about: {
    eyebrow: "Program",
    // 프로그램 소개 맨 위의 큰 문단 (title의 \n은 줄바꿈)
    intro: {
      title: "데이터를 읽는\n새로운 감각,\nAI와 함께",
      text: "복잡한 코드 대신 좋은 질문으로 시작합니다. 생성형 AI를 동료 삼아 데이터를 모으고, 다듬고, 읽어 내는 방법을 15주 동안 차근차근 익혀요. 결과를 그대로 믿지 않고 검증하는 습관까지 함께 기릅니다.",
      buttonLabel: "커리큘럼 살펴보기",
      target: "curriculum",
      image: "",                       // 오른쪽 사진 경로. 비워두면 그림 패널
    },
    title: "프로그램 소개",
    subtitle: "이 강의가 특별한 이유를 넘겨 보세요",
    autoplaySeconds: 5,                // 자동 넘김 간격(초). 0이면 자동 넘김 없음
    slides: [
      { icon: "🌿", title: "비전공자도 OK", text: "코딩 없이 대화형 AI만으로 데이터 분석을 시작합니다. 기초부터 차근차근 안내합니다." },
      { icon: "🛠️", title: "100% 실습 중심", text: "매주 실제 공공·기업 데이터를 가지고 AI 도구로 직접 분석해 봅니다." },
      { icon: "📊", title: "분석부터 시각화까지", text: "데이터 수집, 정제, 분석, 시각화, 보고서 작성까지 전 과정을 경험합니다." },
      { icon: "🤖", title: "최신 AI 도구 총망라", text: "ChatGPT, Claude, Gemini 등 현업에서 쓰는 AI 도구를 비교하며 익힙니다." },
      { icon: "🧭", title: "AI 윤리와 검증", text: "AI 결과를 그대로 믿지 않고 검증하는 방법, 책임 있는 활용법을 함께 배웁니다." },
      { icon: "🏆", title: "포트폴리오 완성", text: "학기 말 팀 프로젝트로 취업·진학에 활용할 수 있는 분석 결과물을 남깁니다." },
    ],
  },

  /* ---------- 수업 일정 (주차 날짜와 달력이 여기서 자동 계산됩니다) ----------
   *  - startDate부터 7일 간격(매주 같은 요일)으로 1주차, 2주차 ... 날짜가 정해집니다.
   *  - holidays에 있는 날은 수업을 건너뛰고, 이후 주차가 한 주씩 뒤로 밀립니다.
   *  - 날짜 형식: "YYYY-MM-DD", 시간 형식: "HH:MM" */
  schedule: {
    startDate: "2026-03-03",           // 1주차 수업일 (화요일)
    startTime: "14:00",
    endTime: "16:45",
    location: "○○관 000호",
    submitUrl: "",                     // 과제 제출 외부 링크(예: LMS). 비워두면 이 사이트의 '학생 공간'에서 제출합니다.
    holidays: [
      { date: "2026-05-05", name: "어린이날" },
    ],
    // 테스트용: 날짜를 적으면 그날을 '오늘'로 보고 마감 남은 시간·달력을 계산합니다. 평소에는 "" 로 두세요.
    // (주소 뒤에 ?today=2026-04-01 을 붙여도 같은 효과)
    todayOverride: "",
  },

  /* ---------- 커리큘럼 (주차별 펼쳐 보기) ----------
   *  각 주차에서 쓸 수 있는 항목
   *    title, summary(접혀 있을 때 보이는 한 줄), topics(학습 내용 목록), videos(참고 영상)
   *    location / startTime / endTime : 그 주만 다를 때 적기 (안 적으면 schedule 값 사용)
   *    date : 자동 계산 대신 날짜를 직접 지정할 때 ("YYYY-MM-DD")
   *    assignment : 과제가 있는 주에만 적기
   *      - dueAfterDays: 수업일로부터 며칠 뒤 마감인지 (6 = 다음 주 월요일), dueTime: 마감 시각
   *      - 또는 due: "2026-03-23 23:59" 처럼 마감 일시를 직접 지정
   *      - submitUrl: 제출 링크 (없으면 schedule.submitUrl 사용) */
  curriculum: {
    title: "커리큘럼",
    subtitle: "주차를 누르면 날짜·장소·학습 내용·과제를 볼 수 있어요",
    weeks: [
      {
        title: "오리엔테이션",
        summary: "강의 소개, AI와 데이터 리터러시의 이해, 실습 계정 준비",
        topics: ["강의 목표와 평가 방법 안내", "데이터 리터러시와 AI 리터러시란?", "실습용 Google · AI 서비스 계정 만들기"],
        videos: [{ title: "데이터 리터러시 입문", url: "https://www.youtube.com/results?search_query=데이터+리터러시+입문" }],
      },
      {
        title: "생성형 AI 기초",
        summary: "LLM의 원리와 한계, 주요 AI 서비스 비교",
        topics: ["대규모 언어 모델(LLM)의 작동 원리", "환각(hallucination)과 AI의 한계", "ChatGPT · Claude · Gemini 비교 체험"],
        videos: [{ title: "LLM은 어떻게 작동할까", url: "https://www.youtube.com/results?search_query=LLM+작동+원리+쉽게" }],
      },
      {
        title: "프롬프트 설계",
        summary: "목적에 맞는 질문법과 프롬프트 패턴 익히기",
        topics: ["역할 · 맥락 · 형식을 갖춘 프롬프트", "단계별 사고 유도와 예시 제시", "프롬프트 개선 실습"],
        videos: [{ title: "프롬프트 엔지니어링 기초", url: "https://www.youtube.com/results?search_query=프롬프트+엔지니어링+기초" }],
        assignment: {
          title: "과제 1 · 나만의 프롬프트 노트",
          description: "같은 질문을 프롬프트 3가지 방식으로 바꿔 AI에게 물어보고, 결과 차이를 비교한 노트를 제출하세요.",
          dueAfterDays: 6, dueTime: "23:59",
        },
      },
      {
        title: "데이터 수집",
        summary: "공공데이터 포털 활용, AI로 자료 조사·요약하기",
        topics: ["공공데이터포털 · 통계청 데이터 찾기", "CSV · 엑셀 파일 구조 이해", "AI로 자료 조사하고 출처 정리하기"],
        videos: [{ title: "공공데이터포털 사용법", url: "https://www.youtube.com/results?search_query=공공데이터포털+사용법" }],
      },
      {
        title: "데이터 정제",
        summary: "결측치·이상치 처리, 스프레드시트와 AI 함께 쓰기",
        topics: ["결측치와 이상치 찾기", "구글 시트 함수와 AI 도움 받기", "깔끔한 데이터(tidy data) 원칙"],
        videos: [{ title: "구글 시트 데이터 정리", url: "https://www.youtube.com/results?search_query=구글+시트+데이터+정리" }],
        assignment: {
          title: "과제 2 · 데이터 정제 리포트",
          description: "제공된 데이터의 문제점을 찾고 AI와 함께 정제한 과정과 결과 파일을 제출하세요.",
          dueAfterDays: 6, dueTime: "23:59",
        },
      },
      {
        title: "탐색적 분석 Ⅰ",
        summary: "기술통계와 분포 이해, AI에게 분석 요청하기",
        topics: ["평균 · 중앙값 · 분산의 의미", "분포와 상관관계 읽기", "AI에게 분석을 요청하는 좋은 질문"],
        videos: [{ title: "기술통계 쉽게 이해하기", url: "https://www.youtube.com/results?search_query=기술통계+쉽게" }],
      },
      {
        title: "탐색적 분석 Ⅱ",
        summary: "Colab에서 AI가 작성한 파이썬 코드 실행·검토",
        topics: ["Google Colab 시작하기", "AI가 쓴 pandas 코드 읽고 실행하기", "오류가 났을 때 AI와 함께 고치기"],
        videos: [{ title: "Google Colab 입문", url: "https://www.youtube.com/results?search_query=Google+Colab+입문" }],
        assignment: {
          title: "과제 3 · Colab 분석 노트북",
          description: "관심 있는 공공데이터 하나를 골라 Colab에서 탐색적 분석을 수행하고 노트북 링크를 제출하세요.",
          dueAfterDays: 6, dueTime: "23:59",
        },
      },
      {
        title: "중간 평가",
        summary: "주어진 데이터로 미니 분석 리포트 작성",
        topics: ["수업 시간 내 미니 리포트 작성 (AI 도구 사용 가능)", "사용한 프롬프트와 검증 과정 함께 제출"],
        videos: [],
      },
      {
        title: "데이터 시각화",
        summary: "목적에 맞는 차트 선택과 AI 기반 시각화",
        topics: ["목적에 맞는 차트 고르기", "좋은 차트 · 나쁜 차트 비교", "AI로 차트 만들고 다듬기"],
        videos: [{ title: "데이터 시각화 원칙", url: "https://www.youtube.com/results?search_query=데이터+시각화+원칙" }],
        assignment: {
          title: "과제 4 · 인포그래픽 만들기",
          description: "분석 결과 하나를 골라 한 장짜리 인포그래픽으로 만들어 제출하세요.",
          dueAfterDays: 6, dueTime: "23:59",
        },
      },
      {
        title: "문서·리서치 AI",
        summary: "NotebookLM, Perplexity로 자료 기반 인사이트 도출",
        topics: ["NotebookLM에 자료 올리고 질문하기", "Perplexity로 출처 있는 검색하기", "여러 자료를 종합해 인사이트 정리"],
        videos: [{ title: "NotebookLM 사용법", url: "https://www.youtube.com/results?search_query=NotebookLM+사용법" }],
        assignment: {
          title: "과제 5 · 리서치 브리프",
          description: "하나의 주제에 대해 AI 리서치 도구로 자료를 조사하고, 출처를 밝힌 1쪽 요약을 제출하세요.",
          dueAfterDays: 6, dueTime: "23:59",
        },
      },
      {
        title: "AI 결과 검증과 윤리",
        summary: "환각 확인, 출처 검증, 개인정보·저작권 이슈",
        topics: ["AI 답변을 검증하는 체크리스트", "개인정보 · 저작권 · 편향 문제", "책임 있는 AI 활용 사례 토론"],
        videos: [{ title: "AI 윤리 이야기", url: "https://www.youtube.com/results?search_query=AI+윤리+사례" }],
      },
      {
        title: "프로젝트 기획",
        summary: "팀 구성, 문제 정의, 데이터 확보 계획 수립",
        topics: ["팀 구성과 역할 나누기", "분석 질문 정의하기", "데이터 확보 계획과 일정 세우기"],
        videos: [{ title: "데이터 분석 프로젝트 기획", url: "https://www.youtube.com/results?search_query=데이터+분석+프로젝트+기획" }],
        assignment: {
          title: "팀 프로젝트 기획서",
          description: "팀별로 분석 주제, 질문, 사용할 데이터, 역할 분담, 일정을 담은 기획서를 제출하세요.",
          dueAfterDays: 6, dueTime: "23:59",
        },
      },
      {
        title: "프로젝트 수행",
        summary: "팀별 분석 진행 및 교수자 멘토링",
        topics: ["팀별 분석 작업", "교수자 · 조교 멘토링", "중간 점검 및 방향 조정"],
        videos: [],
      },
      {
        title: "최종 발표",
        summary: "팀 프로젝트 결과 발표 및 상호 피드백",
        location: "○○관 101호 (발표장)",
        topics: ["팀별 10분 발표 + 5분 질의응답", "동료 평가와 피드백"],
        videos: [{ title: "데이터 스토리텔링 발표법", url: "https://www.youtube.com/results?search_query=데이터+스토리텔링+발표" }],
        assignment: {
          title: "최종 보고서 제출",
          description: "발표 피드백을 반영한 최종 보고서와 발표 자료, 사용한 데이터를 함께 제출하세요.",
          dueAfterDays: 6, dueTime: "23:59",
        },
      },
      {
        title: "정리 및 회고",
        summary: "학기 내용 정리, 개인 포트폴리오 완성",
        topics: ["한 학기 돌아보기", "개인 포트폴리오 정리 방법", "앞으로의 AI 학습 로드맵"],
        videos: [],
      },
    ],
  },

  /* ---------- 수업 달력 ---------- */
  calendar: {
    title: "수업 달력",
    subtitle: "날짜를 누르면 그날의 수업 내용을 볼 수 있어요",
  },

  /* =====================================================================
   *  참여 기능 (투표 · 학생 공간 · 수강 신청서 · 팝업 · 환영 효과)
   *  현재는 '데모 모드'로, 입력한 내용은 각자의 브라우저에만 저장됩니다.
   *  (여러 학생이 실제로 공유하려면 features.js의 store를 Firebase 등으로 교체)
   * ===================================================================== */
  participate: {
    title: "참여하기",
    subtitle: "투표하고, 출석하고, 과제를 제출해요",
    demoNotice: "데모 모드: 입력한 내용은 이 브라우저에만 저장되며 다른 사람과 공유되지 않습니다.",
  },

  /* ---------- 실시간 투표 ----------
   *  id는 영어로 겹치지 않게, seed는 시작 표시용 예시 표 수(0으로 두면 빈 상태에서 시작) */
  poll: {
    id: "first-topic-2026",            // 질문을 바꾸면 이 id도 바꿔 주세요 (이전 투표와 섞이지 않게)
    title: "가장 먼저 배우고 싶은 주제는?",
    description: "하나를 골라 투표해 주세요. 결과가 바로 그래프에 반영됩니다.",
    options: [
      { id: "prompt", icon: "💬", label: "프롬프트 설계", seed: 14 },
      { id: "analysis", icon: "📊", label: "AI로 데이터 분석", seed: 21 },
      { id: "viz", icon: "🎨", label: "데이터 시각화", seed: 11 },
      { id: "research", icon: "🔎", label: "AI 리서치 · 문서 요약", seed: 9 },
      { id: "colab", icon: "🐍", label: "Colab 파이썬 맛보기", seed: 6 },
    ],
    seedNote: "예시 표 수가 포함되어 있습니다.",
  },

  /* ---------- 학생 공간: 로그인 · 출석 · 과제 제출 ---------- */
  student: {
    title: "학생 공간",
    loginTitle: "수강생 로그인",
    loginHint: "데모: 학번(숫자 10자리)과 이름을 입력하면 로그인됩니다.",
    attendance: {
      openBeforeMin: 10,               // 수업 시작 몇 분 전부터 출석 체크 가능
      lateAfterMin: 10,                // 수업 시작 몇 분 뒤부터 '지각' (수업 종료 후에는 체크 불가)
    },
    submission: {
      maxFileMB: 20,
      accept: [".pdf", ".docx", ".hwp", ".hwpx", ".pptx", ".xlsx", ".csv", ".ipynb", ".zip", ".png", ".jpg"],
      demoNote: "데모 모드에서는 파일 이름·크기·제출 시각만 기록되고, 파일 자체는 업로드되지 않습니다.",
    },
  },

  /* ---------- 수강 신청서 (수강 안내 섹션 아래에 표시) ----------
   *  type: text / email / tel / select / radio / textarea / checkbox
   *  required: 필수 여부, pattern: 형식 검사(정규식), minLength: 최소 글자 수, full: 한 줄 전체 사용 */
  apply: {
    title: "수강 신청서",
    subtitle: "모든 필수 항목(*)을 작성한 뒤 제출해 주세요",
    period: "신청 기간: 2026. 2. 16 (월) – 2. 27 (금)",
    submitLabel: "신청서 제출하기",
    successTitle: "수강 신청이 접수되었습니다!",
    successText: "확인 메일은 신청 기간이 끝난 뒤 순차적으로 발송됩니다.",
    fields: [
      { name: "name", label: "이름", type: "text", required: true, placeholder: "홍길동", autocomplete: "name" },
      { name: "studentId", label: "학번", type: "text", required: true, placeholder: "2024123456", inputmode: "numeric",
        pattern: "^\\d{10}$", patternMessage: "학번은 숫자 10자리로 입력해 주세요." },
      { name: "department", label: "소속 학과", type: "text", required: true, placeholder: "○○학과" },
      { name: "year", label: "학년", type: "select", required: true, options: ["1학년", "2학년", "3학년", "4학년", "대학원 · 기타"] },
      { name: "email", label: "이메일", type: "email", required: true, placeholder: "name@korea.ac.kr", autocomplete: "email",
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", patternMessage: "올바른 이메일 주소를 입력해 주세요." },
      { name: "phone", label: "연락처", type: "tel", required: true, placeholder: "010-1234-5678", autocomplete: "tel",
        pattern: "^01[016789]-?\\d{3,4}-?\\d{4}$", patternMessage: "010-1234-5678 형식으로 입력해 주세요." },
      { name: "experience", label: "AI 도구 사용 경험", type: "radio", required: true, options: ["처음이에요", "가끔 써 봤어요", "자주 써요"], full: true },
      { name: "motivation", label: "수강 동기", type: "textarea", required: true, minLength: 20, full: true,
        placeholder: "이 강의를 통해 배우고 싶은 점을 20자 이상 적어 주세요." },
      { name: "agree", label: "개인정보 수집·이용에 동의합니다. (수강 관리 목적, 학기 종료 후 파기)", type: "checkbox", required: true, full: true },
    ],
  },

  /* ---------- 수강 신청 안내 팝업 ---------- */
  popup: {
    enabled: true,
    delaySeconds: 2,                   // 사이트에 들어온 뒤 몇 초 뒤에 뜰지
    badge: "수강 신청 안내",
    title: "2026 상반기 수강 신청이 열렸어요!",
    text: "AI로 데이터를 다루는 15주, 지금 신청하고 함께 시작해요. 정원 40명으로 마감될 수 있습니다.",
    period: "신청 기간: 2026. 2. 16 (월) – 2. 27 (금)",
    buttonLabel: "수강 신청하러 가기",
    target: "apply",
    hideTodayLabel: "오늘 하루 보지 않기",
  },

  /* ---------- 첫 방문 환영 ---------- */
  welcome: {
    confetti: true,
    message: "처음 오셨군요! 환영합니다 🌿",
  },

  /* ---------- 실습 AI 도구 ---------- */
  tools: {
    title: "실습에 쓰는 AI 도구",
    subtitle: "현업에서 실제로 쓰이는 도구를 직접 다뤄 봅니다",
    items: [
      { icon: "💬", name: "ChatGPT", tag: "대화형 AI", text: "데이터 분석 요청, 코드 생성, 결과 해석에 활용합니다.", url: "https://chatgpt.com" },
      { icon: "✳️", name: "Claude", tag: "대화형 AI", text: "긴 문서 요약, 보고서 초안 작성, 분석 논리 점검에 활용합니다.", url: "https://claude.ai" },
      { icon: "✨", name: "Gemini", tag: "대화형 AI", text: "구글 문서·스프레드시트와 연계한 데이터 작업을 실습합니다.", url: "https://gemini.google.com" },
      { icon: "🔎", name: "Perplexity", tag: "리서치", text: "출처가 표시되는 검색으로 자료를 조사하고 검증합니다.", url: "https://www.perplexity.ai" },
      { icon: "📒", name: "NotebookLM", tag: "문서 분석", text: "업로드한 자료만을 근거로 질문하고 핵심을 정리합니다.", url: "https://notebooklm.google.com" },
      { icon: "🐍", name: "Google Colab", tag: "코드 실행", text: "AI가 작성한 파이썬 분석 코드를 브라우저에서 실행합니다.", url: "https://colab.research.google.com" },
      { icon: "📈", name: "Google Sheets", tag: "스프레드시트", text: "데이터 정리와 기본 집계, 차트 작성의 기본 도구입니다.", url: "https://sheets.google.com" },
      { icon: "🎨", name: "Napkin AI", tag: "시각화", text: "텍스트를 다이어그램과 인포그래픽으로 바꿔 발표 자료를 만듭니다.", url: "https://www.napkin.ai" },
    ],
  },

  /* ---------- 수강 안내 (준비물 · 평가 · 유의사항) ---------- */
  enroll: {
    title: "수강 안내",
    subtitle: "첫 수업 전에 아래 준비물을 확인해 주세요",
    preparationTitle: "수강 준비물",
    preparation: [
      { icon: "💻", title: "노트북", text: "매 수업 실습이 있으므로 노트북을 꼭 지참해 주세요. (태블릿 비권장)" },
      { icon: "🔑", title: "Google 계정", text: "Colab, Sheets, Gemini, NotebookLM 실습에 사용합니다." },
      { icon: "🤖", title: "AI 서비스 계정", text: "ChatGPT · Claude 등 무료 계정으로 충분합니다. 유료 결제는 필요 없습니다." },
      { icon: "📂", title: "실습 데이터", text: "수업에 쓰는 데이터는 매주 LMS에 올려 드립니다." },
      { icon: "📝", title: "기초 스프레드시트", text: "엑셀 또는 구글 시트의 기본 사용법을 알고 오면 좋습니다." },
      { icon: "🌱", title: "호기심", text: "AI에게 좋은 질문을 던지는 힘, 가장 중요한 준비물입니다." },
    ],
    gradingTitle: "평가 방법",
    grading: [
      { label: "주차별 실습 과제", percent: 30 },
      { label: "중간 평가 (미니 리포트)", percent: 20 },
      { label: "팀 프로젝트", percent: 35 },
      { label: "출석 · 참여", percent: 15 },
    ],
    notesTitle: "유의 사항",
    notes: [
      "수강 신청은 학교 포털 수강신청 기간에 진행합니다.",
      "AI로 작성한 결과물은 사용한 도구와 프롬프트를 함께 제출해야 합니다.",
      "개인정보나 민감한 데이터는 AI 서비스에 입력하지 않습니다.",
      "결석이 수업 일수의 1/4을 초과하면 성적이 부여되지 않습니다.",
    ],
  },

  /* ---------- FAQ ---------- */
  faq: {
    title: "자주 묻는 질문",
    subtitle: "궁금한 질문을 눌러 답변을 확인하세요",
    items: [
      { q: "코딩을 전혀 몰라도 수강할 수 있나요?", a: "네. 이 강의는 비전공자를 기준으로 설계되었습니다. 코드는 AI가 작성하고, 수강생은 그 결과를 읽고 검토하는 방법을 배웁니다." },
      { q: "유료 AI 서비스를 결제해야 하나요?", a: "아니요. 모든 실습은 무료 플랜으로 진행할 수 있도록 구성했습니다." },
      { q: "타과생도 수강할 수 있나요?", a: "네, 전 학년·전 학과 학생 모두 수강할 수 있습니다. 다양한 전공이 섞일수록 팀 프로젝트가 풍성해집니다." },
      { q: "과제에 AI를 써도 되나요?", a: "적극 권장합니다. 다만 사용한 도구와 프롬프트, 그리고 결과를 어떻게 검증했는지를 함께 제출해야 합니다." },
      { q: "팀 프로젝트 팀은 어떻게 정하나요?", a: "12주차에 희망 주제를 조사한 뒤 3~4명 단위로 구성합니다." },
      { q: "강의 자료는 어디에서 받을 수 있나요?", a: "모든 강의 자료, 실습 데이터, 공지는 학습관리시스템(LMS)에 올라갑니다." },
    ],
  },

  /* ---------- 교수자 (페이지 맨 아래 푸터에 표시) ---------- */
  instructor: {
    title: "교수자 소개",
    name: "홍길동",
    role: "고려대학교 ○○학과 교수",
    photo: "",                         // 예: "images/professor.jpg" (비워두면 이름 첫 글자 표시)
    bio: "데이터 분석과 AI 활용 교육을 연구하며, 20년 넘게 대학과 기업에서 강의해 왔습니다. 누구나 데이터를 다룰 수 있도록 돕는 수업을 지향합니다.",
    career: [
      "○○대학교 ○○학 박사",
      "저서 『AI와 함께하는 데이터 분석』 외 11권",
      "前 ○○연구소 책임연구원",
    ],
    contacts: [
      { icon: "✉️", label: "이메일", value: "professor@korea.ac.kr", href: "mailto:professor@korea.ac.kr" },
      { icon: "📞", label: "전화", value: "02-3290-0000", href: "tel:0232900000" },
      { icon: "🏛️", label: "연구실", value: "○○관 000호" },
      { icon: "🕑", label: "면담 시간", value: "화요일 17:00 – 18:00 (사전 예약)" },
    ],
  },

  /* ---------- 푸터 하단 ---------- */
  footer: {
    text: "© 2026 고려대학교 ○○학과",
    links: [
      { label: "고려대학교 홈페이지", url: "https://www.korea.ac.kr" },
    ],
  },
};
