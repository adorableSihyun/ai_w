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

  /* ---------- 상단 메뉴 (target은 아래 섹션 id: about / curriculum / tools / enroll / faq / instructor) ---------- */
  nav: [
    { label: "프로그램 소개", target: "about" },
    { label: "커리큘럼", target: "curriculum" },
    { label: "수강 안내", target: "enroll" },
    { label: "FAQ", target: "faq" },
    { label: "교수자", target: "instructor" },
  ],

  /* ---------- 첫 화면 ---------- */
  hero: {
    badge: "2026 상반기 집중 프로그램",
    subtitle: "AI 기반 데이터 활용능력 배양",
    description:
      "생성형 AI를 활용해 데이터를 수집·정리·분석·시각화하는 전 과정을 직접 실습합니다. " +
      "코딩 경험이 없어도 괜찮습니다. 15주 동안 나만의 데이터 분석 결과물을 완성해 보세요.",
    // target: 페이지 안 섹션 id로 이동 / url: 외부 링크(예: 수강신청 사이트)로 이동
    buttons: [
      { label: "수강 신청하기", target: "enroll", style: "primary" },
      { label: "커리큘럼 보기", target: "curriculum", style: "secondary" },
    ],
    // 첫 화면 아래 한눈에 보기
    quickInfo: [
      { icon: "📅", label: "일정", value: "2026. 3. 3 – 6. 16 (15주)" },
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
    title: "프로그램 소개",
    subtitle: "이 강의가 특별한 이유를 넘겨 보세요",
    autoplaySeconds: 5,                // 자동 넘김 간격(초). 0이면 자동 넘김 없음
    slides: [
      { icon: "🌸", title: "비전공자도 OK", text: "코딩 없이 대화형 AI만으로 데이터 분석을 시작합니다. 기초부터 차근차근 안내합니다." },
      { icon: "🛠️", title: "100% 실습 중심", text: "매주 실제 공공·기업 데이터를 가지고 AI 도구로 직접 분석해 봅니다." },
      { icon: "📊", title: "분석부터 시각화까지", text: "데이터 수집, 정제, 분석, 시각화, 보고서 작성까지 전 과정을 경험합니다." },
      { icon: "🤖", title: "최신 AI 도구 총망라", text: "ChatGPT, Claude, Gemini 등 현업에서 쓰는 AI 도구를 비교하며 익힙니다." },
      { icon: "🧭", title: "AI 윤리와 검증", text: "AI 결과를 그대로 믿지 않고 검증하는 방법, 책임 있는 활용법을 함께 배웁니다." },
      { icon: "🏆", title: "포트폴리오 완성", text: "학기 말 팀 프로젝트로 취업·진학에 활용할 수 있는 분석 결과물을 남깁니다." },
    ],
  },

  /* ---------- 커리큘럼 ---------- */
  curriculum: {
    title: "커리큘럼",
    subtitle: "15주 동안 이렇게 진행됩니다",
    weeks: [
      { week: "1주", title: "오리엔테이션", text: "강의 소개, AI와 데이터 리터러시의 이해, 실습 계정 준비" },
      { week: "2주", title: "생성형 AI 기초", text: "LLM의 원리와 한계, 주요 AI 서비스 비교" },
      { week: "3주", title: "프롬프트 설계", text: "목적에 맞는 질문법과 프롬프트 패턴 익히기" },
      { week: "4주", title: "데이터 수집", text: "공공데이터 포털 활용, AI로 자료 조사·요약하기" },
      { week: "5주", title: "데이터 정제", text: "결측치·이상치 처리, 스프레드시트와 AI 함께 쓰기" },
      { week: "6주", title: "탐색적 분석 Ⅰ", text: "기술통계와 분포 이해, AI에게 분석 요청하기" },
      { week: "7주", title: "탐색적 분석 Ⅱ", text: "Colab에서 AI가 작성한 파이썬 코드 실행·검토" },
      { week: "8주", title: "중간 평가", text: "주어진 데이터로 미니 분석 리포트 작성" },
      { week: "9주", title: "데이터 시각화", text: "목적에 맞는 차트 선택과 AI 기반 시각화" },
      { week: "10주", title: "문서·리서치 AI", text: "NotebookLM, Perplexity로 자료 기반 인사이트 도출" },
      { week: "11주", title: "AI 결과 검증과 윤리", text: "환각 확인, 출처 검증, 개인정보·저작권 이슈" },
      { week: "12주", title: "프로젝트 기획", text: "팀 구성, 문제 정의, 데이터 확보 계획 수립" },
      { week: "13주", title: "프로젝트 수행", text: "팀별 분석 진행 및 교수자 멘토링" },
      { week: "14주", title: "최종 발표", text: "팀 프로젝트 결과 발표 및 상호 피드백" },
      { week: "15주", title: "정리 및 회고", text: "학기 내용 정리, 개인 포트폴리오 완성" },
    ],
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
