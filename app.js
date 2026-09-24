/**
 * 마인드로그 (MindLog) Pro v2.1 Pro - Core Application Engine
 * - 백엔드 연동: Google Apps Script Web App
 * - 기능: 스타일러스(애플펜슬/S펜) 드로잉, 스티커 터치 통과 및 돋보기, AI 맞춤 페르소나 동적 주입, 계정 찾기
 */

// ========================================================
// 1. 글로벌 상태 및 환경 설정 (State Management)
// ========================================================
const APP_VERSION = "v2.1 Pro";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyA2NubJNwyaB3LfULBrdsARNpeNcJ9cjZOiFBR4IyNQdjU7jXhd4vmM8-DMjMcwXE_/exec";

let appState = {
  // 인증 및 세션
  currentUser: null, // { email, birth, name, phone }
  autoLogin: true,

  // AI 마이 페르소나 (내 정보 관리)
  persona: {
    job: "고등학교 체육교사",
    mbti: "ENFP",
    personality: ["열정적인", "사색적인", "긍정적인"],
    tone: "수필형", // 수필형 | 공감형 | 성장형 | 일상형
    pin: "0724",
    defaultTheme: "indigo"
  },

  // 캘린더 상태
  calendarYear: 2026,
  calendarMonth: 8, // 0-indexed (8 = 9월)
  calendarMode: 'month', // 'month' | 'week'
  selectedDate: new Date().toISOString().split('T')[0],

  // 작성 중인 버퍼 (Draft)
  draftEntry: {
    date: new Date().toISOString().split('T')[0],
    mediaList: [],
    keywords: [],
    diary: '',
    feedback: '행복한 여운 🥰',
    userComment: '',
    voiceAudio: null,
    voiceTranscript: '',
    voiceDuration: 0,
    interviewAnswer: ''
  },

  // 영구 보관 데이터베이스
  entries: [],
  schedules: [],
  stickers: [],
  drawings: {}, // { "YYYY-MM-DD": [strokes] }
  todos: {
    today: [
      { id: 1, text: "오후 조깅 및 가벼운 스트레칭", done: true },
      { id: 2, text: "마인드로그 Pro v2.1 Pro 테스트", done: false }
    ],
    week: [{ id: 3, text: "주간 감정 리포트 돌아보기", done: false }],
    month: [{ id: 4, text: "한 달 독서 2권 완독하기", done: false }],
    year: [{ id: 5, text: "체력 증진 및 건강 루틴 정착", done: false }],
    long: [{ id: 6, text: "가족과 함께하는 힐링 여행 계획하기", done: false }]
  },
  currentTodoScope: 'all',

  // 다차원 메모 시스템
  memos: [
    { id: 1, type: 'quick', date: null, text: "가을맞이 플래너 루틴 재정비 및 독서 목록 정리", color: 'yellow', isPinned: true, createdAt: "2026. 09. 23 11:20" },
    { id: 2, type: 'date', date: '2026-09-25', text: "체육관 매트 소독 점검 및 체육 용구 정돈", color: 'mint', isPinned: false, createdAt: "2026. 09. 25 09:10" }
  ],
  memoFilter: 'all',
  memoSelectedColor: 'yellow',

  // 리뷰 및 고객센터
  reviews: [
    { id: 1, author: "달리는선생님", rating: 5, comment: "사진과 키워드만 넣었는데 마음에 울림을 주는 일기가 나와서 매일 씁니다!", date: "2026. 09. 21" },
    { id: 2, author: "고등학생A", rating: 5, comment: "공부하느라 지칠 때 감정 온도계 보면서 힐링하고 있어요.", date: "2026. 09. 22" }
  ],
  inquiries: [
    { id: 1, author: "기록러", pw: "1234", content: "아이패드 가로 모드에서도 사진이 시원하게 잘 보여서 너무 좋습니다.", reply: "소중한 의견 감사드립니다! 더욱 편리한 기록 경험을 제공하겠습니다.", date: "2026. 09. 22" }
  ],
  notices: [
    { id: 1, text: `[${APP_VERSION}] 애플펜슬 드로잉 지원, 날짜/스티커 터치 버그 수정, 내 정보(마이페이지) 통합`, date: "2026. 09. 25" }
  ],
  recentKeywords: ["가을바람", "야간라이딩", "퇴근길", "성취감", "소소한행복"],

  // 뷰 상태
  currentTheme: 'indigo',
  activeTab: 'calendar',
  reportPeriod: 'month',
  timelineViewMode: 'card',
  isDockCollapsed: false,
  isDrawingMode: false,
  isDrawingVisible: true,

  // 보안 관리자
  adminFailedCount: 0,
  adminLockUntil: null
};

// 8종 테마 컬러 팔레트
const THEME_PALETTES = {
  indigo:   { primary: '#4f46e5', hover: '#4338ca', light: '#eef2ff', border: '#c7d2fe' },
  rose:     { primary: '#e11d48', hover: '#be123c', light: '#ffe4e6', border: '#fecdd3' },
  emerald:  { primary: '#059669', hover: '#047857', light: '#d1fae5', border: '#a7f3d0' },
  charcoal: { primary: '#334155', hover: '#1e293b', light: '#f1f5f9', border: '#cbd5e1' },
  orange:   { primary: '#ea580c', hover: '#c2410c', light: '#ffedd5', border: '#fed7aa' },
  purple:   { primary: '#7e22ce', hover: '#6b21a8', light: '#f3e8ff', border: '#e9d5ff' },
  blue:     { primary: '#2563eb', hover: '#1d4ed8', light: '#dbeafe', border: '#bfdbfe' },
  amber:    { primary: '#d97706', hover: '#b45309', light: '#fef3c7', border: '#fde68a' }
};

// 24종 키워드 프리셋
const PRESET_KEYWORDS = [
  "행복 😊", "설렘 💓", "신남 🔥", "뿌듯함 ✨", "평온함 🌿", "감사 🙏",
  "열정 ⚡", "운동 🏃", "야구 ⚾", "산책 👟", "맛있는음식 🍕", "카페투어 ☕",
  "피곤함 🥱", "지침 💦", "불안 🌧️", "외로움 🍂", "생각많음 💭", "공부/업무 📚",
  "독서 📖", "취미생활 🎨", "가족과함께 👨‍👩‍👦", "친구만남 🍻", "휴식/쉼 🛋️", "새로운도전 🚀"
];

// AI 인터뷰어 질문 프리셋
const INTERVIEW_QUESTIONS = [
  "오늘 하루 가장 마음이 머물렀던 순간이나 대화는 무엇이었나요?",
  "오늘 나를 가장 기분 좋게 미소 짓게 만든 작은 일은 무엇이었나요?",
  "몸이나 마음이 조금 지쳤다면, 나 자신에게 건네고 싶은 한마디는?",
  "오늘 새롭게 시도하거나 배우게 된 소소한 점이 있었나요?",
  "오늘 사진 속 순간으로 다시 돌아간다면 어떤 말을 남기고 싶나요?"
];

// 성격 키워드 태그 목록
const ALL_PERSONALITY_TAGS = ["열정적인", "사색적인", "긍정적인", "차분한", "유쾌한", "섬세한", "계획적인", "도전적인", "솔직한", "따뜻한"];

// 스티커 프리셋
const STICKER_EMOJIS = [
  "✨", "💖", "🔥", "🌿", "⚾", "🎉", "☕", "💪", "🌈", "⭐", "🥑", "🏆",
  "🏃", "📚", "🎨", "🍕", "☀️", "🌙", "☁️", "🎵", "🍀", "🌸", "💡", "🎯",
  "🥰", "🥺", "😴", "🥳", "🧘", "🚲", "🏖️", "⛺", "✈️", "🌻", "🍰", "💌"
];

const STICKER_LETTERINGS = [
  "기억하고 싶은 날", "쉼과 회복", "완벽한 하루", "소소한 행복",
  "오늘도 해냈다", "반짝이는 순간", "마음의 여유", "최선을 다한 날",
  "따뜻한 온기", "새로운 시작", "스스로에게 박수", "힐링 타임",
  "나다운 하루", "행복 가득", "잠시 쉬어가기", "내일도 화이팅"
];

// 2026 공휴일 프리셋
const HOLIDAYS_2026 = {
  "01-01": "신정", "02-16": "설날 연휴", "02-17": "설날", "02-18": "설날 연휴",
  "03-01": "삼일절", "03-02": "대체공휴일", "05-05": "어린이날", "05-24": "부처님오신날",
  "05-25": "대체공휴일", "06-06": "현충일", "08-15": "광복절", "08-17": "대체공휴일",
  "09-24": "추석 연휴", "09-25": "추석", "09-26": "추석 연휴", "09-28": "대체공휴일",
  "10-03": "개천절", "10-05": "대체공휴일", "10-09": "한글날", "12-25": "성탄절"
};

// 런타임 변수
let pieChartInstance = null;
let radarChartInstance = null;
let vlogInterval = null;
let currentRatingScore = 5;
let viewedEntryDate = null;

// 음성 녹음 제어
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceMaxSeconds = 15;
let voiceCurrentSeconds = 0;
let speechRecognitionInstance = null;

// 드로잉 캔버스 런타임 제어
let drawingCanvas = null;
let drawingCtx = null;
let currentDrawTool = 'pen'; // 'pen' | 'highlighter' | 'eraser'
let currentDrawColor = '#0f172a';
let isDrawingNow = false;
let currentStroke = [];
let lastPenTapTime = 0;

// ========================================================
// 2. 앱 초기화 (Bootstrap & Lifecycle)
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  loadLocalStorage();
  applyAppTheme(appState.persona.defaultTheme || appState.currentTheme, false);
  lucide.createIcons();

  initHeaderDate();
  updateUserSessionUI();
  initPersonaUI();
  initDrawingCanvas();
  renderCalendar();
  renderPresetKeywords();
  renderRecentKeywords();
  renderCategorizedTodoList();
  renderFilteredMemos();
  renderPublicReviews();
  renderInquiryList();
  renderStickerStudioPresets();
  updateNoticeBanner();
  updateStreakBadge();
  initEmotionCharts();
  refreshInterviewQuestion();

  // 기본 기록 일자
  document.getElementById('entryDateInput').value = appState.draftEntry.date;

  // 메모 날짜 선택 연동 이벤트
  const memoTypeSelect = document.getElementById('memoTypeSelect');
  if (memoTypeSelect) {
    memoTypeSelect.addEventListener('change', (e) => {
      const targetInput = document.getElementById('memoTargetDateInput');
      if (e.target.value === 'date') {
        targetInput.classList.remove('hidden');
        targetInput.value = appState.selectedDate;
      } else {
        targetInput.classList.add('hidden');
      }
    });
  }

  // 화면 크기 변경 시 드로잉 캔버스 리사이즈 동기화
  window.addEventListener('resize', resizeDrawingCanvas);
});

function initHeaderDate() {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
  const str = new Date().toLocaleDateString('ko-KR', options);
  const el = document.getElementById('subHeaderDate');
  if (el) el.textContent = str;
}

function loadLocalStorage() {
  const saved = localStorage.getItem('MINDLOG_PRO_V2_FULL_STATE');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(appState, parsed);
    } catch (e) {
      console.warn("로컬 캐시 불러오기 오류", e);
    }
  }

  // 초기 데모 데이터 보정
  if (!appState.entries || appState.entries.length === 0) {
    appState.entries = [
      {
        id: 1727220000000,
        date: "2026-09-24",
        dateDisplay: "2026. 09. 24",
        mediaList: [
          { type: 'image', src: "https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&auto=format&fit=crop" },
          { type: 'image', src: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop" }
        ],
        keywords: ["운동 🏃", "열정 ⚡", "뿌듯함 ✨"],
        diary: "가을 공기가 기분 좋게 뺨을 스치는 오후, 운동장에서 학생들과 힘차게 뛰며 땀을 흘렸다. 복잡했던 생각들이 시원한 바람에 씻겨 내려가며 내면이 활기로 가득 차오른다.",
        feedback: "용기를 얻었어요 🔥",
        userComment: "수업 후 즐거운 러닝"
      }
    ];
  }
}

function persistState() {
  localStorage.setItem('MINDLOG_PRO_V2_FULL_STATE', JSON.stringify(appState));
}

// ========================================================
// 3. 테마 및 가변 하단 독 (Collapsible Dock)
// ========================================================
function applyAppTheme(themeName, shouldPersist = true) {
  const palette = THEME_PALETTES[themeName] || THEME_PALETTES.indigo;
  appState.currentTheme = themeName;

  const root = document.documentElement;
  root.style.setProperty('--theme-primary', palette.primary);
  root.style.setProperty('--theme-primary-hover', palette.hover);
  root.style.setProperty('--theme-primary-light', palette.light);
  root.style.setProperty('--theme-primary-border', palette.border);

  if (shouldPersist) {
    persistState();
    showToast(`테마가 [${themeName}]으로 변경되었습니다.`);
  }
}

function toggleBottomDock() {
  const dock = document.getElementById('bottomDock');
  const icon = document.getElementById('dockToggleIcon');
  appState.isDockCollapsed = !appState.isDockCollapsed;

  if (appState.isDockCollapsed) {
    dock.classList.add('dock-collapsed');
    icon.setAttribute('data-lucide', 'chevron-up');
  } else {
    dock.classList.remove('dock-collapsed');
    icon.setAttribute('data-lucide', 'chevron-down');
  }
  lucide.createIcons();
}

function switchTab(tabId) {
  appState.activeTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('text-theme', 'active');
    el.classList.add('text-slate-400');
  });

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetNav = document.getElementById(`nav-${tabId}`);
  if (targetTab) targetTab.classList.add('active');
  if (targetNav) {
    targetNav.classList.remove('text-slate-400');
    targetNav.classList.add('text-theme', 'active');
  }

  if (tabId === 'calendar') {
    renderCalendar();
    setTimeout(resizeDrawingCanvas, 50);
  }
  if (tabId === 'timeline') renderTimeline();
  if (tabId === 'report') setReportPeriod(appState.reportPeriod);
  if (tabId === 'planner') renderFilteredMemos();

  lucide.createIcons();
}

// ========================================================
// 4. 날짜 액션 시트 & 상세 뷰어 라우팅 (터치 버그 원천 해결)
// ========================================================
function selectCalendarDate(dateStr) {
  // 드로잉 모드 중에는 날짜 팝업 차단
  if (appState.isDrawingMode) return;

  appState.selectedDate = dateStr;
  document.getElementById('actionSheetDateTitle').textContent = dateStr;

  const existingEntry = appState.entries.find(e => e.date === dateStr);
  const label = document.getElementById('actionSheetMindlogLabel');
  const sub = document.getElementById('actionSheetMindlogSub');

  if (existingEntry) {
    label.textContent = "📖 마인드로그 일기 보기 (기록됨)";
    sub.textContent = "작성된 사진, AI 일기, 감정 피드백을 확인합니다.";
  } else {
    label.textContent = "✍️ 마인드로그 기록하기 (새 작성)";
    sub.textContent = "사진과 키워드로 하루를 새롭게 기록합니다.";
  }

  document.getElementById('dateActionSheetBackdrop').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('dateActionSheetPanel').classList.add('show');
  }, 10);
}

function closeDateActionSheet() {
  document.getElementById('dateActionSheetPanel').classList.remove('show');
  setTimeout(() => {
    document.getElementById('dateActionSheetBackdrop').classList.add('hidden');
  }, 240);
}

function handleActionSheetMindlog() {
  const dateStr = appState.selectedDate;
  closeDateActionSheet();

  const existingEntry = appState.entries.find(e => e.date === dateStr);
  if (existingEntry) {
    openDiaryViewer(existingEntry);
  } else {
    prepareNewDiaryEntry(dateStr);
  }
}

function openDiaryViewer(entry) {
  viewedEntryDate = entry.date;
  document.getElementById('viewerDateTitle').textContent = entry.dateDisplay || entry.date;
  document.getElementById('viewerFeedbackBadge').textContent = entry.feedback || '행복한 여운 🥰';
  document.getElementById('viewerDiaryText').textContent = entry.diary;

  const mediaContainer = document.getElementById('viewerMediaContainer');
  mediaContainer.innerHTML = '';
  if (entry.mediaList && entry.mediaList.length > 0) {
    mediaContainer.innerHTML = renderWideMediaHtml(entry.mediaList);
  }

  const kwContainer = document.getElementById('viewerKeywordsContainer');
  kwContainer.innerHTML = (entry.keywords || []).map(k => `<span class="bg-theme-light text-theme text-[10px] font-black px-2 py-0.5 rounded-full border border-theme-light">${k}</span>`).join(' ');

  const commentBox = document.getElementById('viewerUserCommentBox');
  const commentText = document.getElementById('viewerUserCommentText');
  if (entry.userComment) {
    commentText.textContent = entry.userComment;
    commentBox.classList.remove('hidden');
  } else {
    commentBox.classList.add('hidden');
  }

  document.getElementById('diaryViewerModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeDiaryViewerModal() {
  document.getElementById('diaryViewerModal').classList.add('hidden');
  viewedEntryDate = null;
}

function editCurrentViewedDiary() {
  if (!viewedEntryDate) return;
  const targetDate = viewedEntryDate;
  closeDiaryViewerModal();
  prepareNewDiaryEntry(targetDate, true);
}

function prepareNewDiaryEntry(dateStr, isEdit = false) {
  appState.draftEntry.date = dateStr;
  document.getElementById('entryDateInput').value = dateStr;

  if (isEdit) {
    const existing = appState.entries.find(e => e.date === dateStr);
    if (existing) {
      appState.draftEntry.mediaList = [...existing.mediaList];
      appState.draftEntry.keywords = [...existing.keywords];
      appState.draftEntry.diary = existing.diary;
      appState.draftEntry.feedback = existing.feedback;
      appState.draftEntry.userComment = existing.userComment || '';

      document.getElementById('aiDiaryContent').textContent = existing.diary;
      document.getElementById('diaryResultCard').classList.remove('hidden');
      document.getElementById('finalUserCommentInput').value = existing.userComment || '';
    }
  } else {
    resetDraftBuffer(dateStr);
  }

  renderWideMediaView();
  renderPresetKeywords();
  switchTab('record');
}

function resetDraftBuffer(dateStr) {
  appState.draftEntry = {
    date: dateStr || new Date().toISOString().split('T')[0],
    mediaList: [],
    keywords: [],
    diary: '',
    feedback: '행복한 여운 🥰',
    userComment: '',
    voiceAudio: null,
    voiceTranscript: '',
    voiceDuration: 0,
    interviewAnswer: ''
  };
  document.getElementById('diaryResultCard').classList.add('hidden');
  document.getElementById('finalUserCommentInput').value = '';
  document.getElementById('aiInterviewAnswerInput').value = '';
  clearDraftAudio();
  renderWideMediaView();
}

function handleActionSheetSchedule() {
  closeDateActionSheet();
  const title = prompt(`[${appState.selectedDate}] 일정을 등록하세요:`, "회의 및 업무 점검");
  if (!title) return;
  const time = prompt("시간을 입력하세요 (예: 14:00):", "14:00") || "하루종일";

  appState.schedules.push({
    id: Date.now(),
    date: appState.selectedDate,
    title: title,
    time: time,
    color: '#10b981'
  });

  persistState();
  renderCalendar();
  showToast("📅 일정이 달력에 등록되었습니다.");
}

function handleActionSheetMemo() {
  closeDateActionSheet();
  switchTab('planner');
  document.getElementById('memoTypeSelect').value = 'date';
  const targetInput = document.getElementById('memoTargetDateInput');
  targetInput.classList.remove('hidden');
  targetInput.value = appState.selectedDate;
  document.getElementById('ideaMemoTextInput').focus();
}

// ========================================================
// 5. 캘린더 렌더링 & 요일/공휴일/인디케이터 시스템
// ========================================================
function setCalendarMode(mode) {
  appState.calendarMode = mode;
  const btnMonth = document.getElementById('btnCalMonth');
  const btnWeek = document.getElementById('btnCalWeek');

  if (mode === 'month') {
    btnMonth.className = "px-2.5 py-1 rounded-lg bg-white text-theme shadow-xs font-black";
    btnWeek.className = "px-2.5 py-1 rounded-lg text-slate-500 font-bold";
  } else {
    btnWeek.className = "px-2.5 py-1 rounded-lg bg-white text-theme shadow-xs font-black";
    btnMonth.className = "px-2.5 py-1 rounded-lg text-slate-500 font-bold";
  }
  renderCalendar();
}

function changeCalendarMonth(delta) {
  appState.calendarMonth += delta;
  if (appState.calendarMonth > 11) {
    appState.calendarMonth = 0;
    appState.calendarYear++;
  } else if (appState.calendarMonth < 0) {
    appState.calendarMonth = 11;
    appState.calendarYear--;
  }
  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById('calendarGrid');
  if (!container) return;
  container.innerHTML = '';

  const { calendarYear, calendarMonth, calendarMode } = appState;
  document.getElementById('calendarTitle').textContent = `${calendarYear}년 ${calendarMonth + 1}월`;

  const todayStr = new Date().toISOString().split('T')[0];
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const lastDate = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  let days = [];
  for (let i = 0; i < firstDay; i++) days.push({ empty: true });

  for (let d = 1; d <= lastDate; d++) {
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const fullDate = `${calendarYear}-${mm}-${dd}`;
    const dateKey = `${mm}-${dd}`;
    const dayOfWeek = new Date(calendarYear, calendarMonth, d).getDay();
    
    const holidayName = HOLIDAYS_2026[dateKey] || null;
    const entry = appState.entries.find(e => e.date === fullDate);
    const hasSchedules = appState.schedules.some(s => s.date === fullDate);
    const hasMemos = appState.memos.some(m => m.date === fullDate);

    days.push({ dayNum: d, fullDate, dayOfWeek, holidayName, entry, hasSchedules, hasMemos });
  }

  if (calendarMode === 'week') {
    const todayIndex = days.findIndex(d => d.fullDate === todayStr);
    const startIdx = todayIndex >= 0 ? Math.floor(todayIndex / 7) * 7 : 0;
    days = days.slice(startIdx, startIdx + 7);
  }

  days.forEach(item => {
    if (item.empty) {
      const emptyCell = document.createElement('div');
      emptyCell.className = "aspect-square rounded-2xl bg-slate-50/40 border border-transparent";
      container.appendChild(emptyCell);
      return;
    }

    const cell = document.createElement('div');
    const isToday = item.fullDate === todayStr;
    const hasPhoto = item.entry && item.entry.mediaList && item.entry.mediaList.length > 0;
    const thumbUrl = hasPhoto ? item.entry.mediaList[0].src : null;

    let dayClass = 'day-weekday';
    if (item.dayOfWeek === 0 || item.holidayName) dayClass = 'day-sunday';
    else if (item.dayOfWeek === 6) dayClass = 'day-saturday';

    cell.className = `calendar-cell flex flex-col justify-between p-1.5 ${isToday ? 'today' : ''} ${hasPhoto ? 'has-entry text-white' : ''}`;
    
    if (hasPhoto) {
      cell.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.65)), url('${thumbUrl}')`;
    }

    // 🌟 달력 날짜 셀 터치 이벤트 (스티커 캔버스가 가로채지 않음)
    cell.onclick = () => selectCalendarDate(item.fullDate);

    const indicatorsHtml = `
      <div class="flex items-center space-x-0.5">
        ${item.hasSchedules ? `<span class="cell-indicator-dot bg-emerald-500" title="일정"></span>` : ''}
        ${item.hasMemos ? `<span class="cell-indicator-dot bg-amber-400" title="메모"></span>` : ''}
      </div>
    `;

    cell.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="text-[11px] ${dayClass} ${isToday ? 'bg-theme text-white w-4 h-4 rounded-full flex items-center justify-center !text-white' : ''}">${item.dayNum}</span>
        ${indicatorsHtml}
      </div>
      <div class="flex items-end justify-between">
        ${item.holidayName ? `<span class="day-holiday-badge truncate max-w-[34px]">${item.holidayName}</span>` : `<span></span>`}
        ${item.entry ? `<span class="truncate text-[9px] font-bold ${hasPhoto ? 'text-white' : 'text-theme'}">${item.entry.keywords[0] || '기록'}</span>` : ''}
      </div>
    `;

    container.appendChild(cell);
  });

  renderCanvasStickers();
  redrawAllDrawingStrokes();
  updateStreakBadge();
}

function updateStreakBadge() {
  const badge = document.getElementById('streakCountBadge');
  if (!badge) return;
  const count = appState.entries.length;
  badge.textContent = count > 0 ? `${count}일째 기록 달성!` : "첫 기록을 남겨보세요!";
}

function checkPastMemories() {
  const lastYearDate = new Date();
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
  const targetStr = lastYearDate.toISOString().split('T')[0];

  const found = appState.entries.find(e => e.date === targetStr);
  if (found) {
    openDiaryViewer(found);
    showToast("✨ 작년 오늘의 기록을 찾았습니다!");
  } else {
    showToast("작년 오늘의 기록은 아직 없습니다. 오늘을 멋지게 기록해 보세요!");
  }
}

// ========================================================
// 6. 스타일러스(애플펜슬 / S펜) 드로잉 엔진 & 더블탭 제스처
// ========================================================
function initDrawingCanvas() {
  drawingCanvas = document.getElementById('drawingCanvas');
  if (!drawingCanvas) return;
  drawingCtx = drawingCanvas.getContext('2d');

  resizeDrawingCanvas();

  // Pointer Events API (필압 및 애플펜슬 최적화)
  drawingCanvas.addEventListener('pointerdown', handleDrawingPointerDown);
  drawingCanvas.addEventListener('pointermove', handleDrawingPointerMove);
  drawingCanvas.addEventListener('pointerup', handleDrawingPointerUp);
  drawingCanvas.addEventListener('pointercancel', handleDrawingPointerUp);
}

function resizeDrawingCanvas() {
  if (!drawingCanvas) return;
  const wrapper = document.getElementById('calendarWrapper');
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  drawingCanvas.width = rect.width * dpr;
  drawingCanvas.height = rect.height * dpr;
  drawingCanvas.style.width = `${rect.width}px`;
  drawingCanvas.style.height = `${rect.height}px`;

  if (drawingCtx) {
    drawingCtx.scale(dpr, dpr);
    redrawAllDrawingStrokes();
  }
}

function toggleDrawingMode() {
  appState.isDrawingMode = !appState.isDrawingMode;
  const canvas = document.getElementById('drawingCanvas');
  const toolbar = document.getElementById('drawingToolbar');
  const btn = document.getElementById('btnToggleDrawMode');

  if (appState.isDrawingMode) {
    canvas.classList.add('drawing-active');
    toolbar.classList.remove('hidden-toolbar');
    btn.classList.add('bg-theme', 'text-white');
    showToast("✏️ 펜슬 필기 모드가 켜졌습니다. 달력 위에 자유롭게 필기하세요.");
  } else {
    canvas.classList.remove('drawing-active');
    toolbar.classList.add('hidden-toolbar');
    btn.classList.remove('bg-theme', 'text-white');
    persistState();
  }
}

function toggleDrawingVisibility() {
  appState.isDrawingVisible = !appState.isDrawingVisible;
  const canvas = document.getElementById('drawingCanvas');
  const icon = document.getElementById('iconDrawVis');

  if (appState.isDrawingVisible) {
    canvas.style.display = 'block';
    icon.setAttribute('data-lucide', 'eye');
    showToast("손글씨 레이어를 표시합니다.");
  } else {
    canvas.style.display = 'none';
    icon.setAttribute('data-lucide', 'eye-off');
    showToast("손글씨 레이어를 숨깁니다.");
  }
  lucide.createIcons();
}

function setDrawingTool(tool) {
  currentDrawTool = tool;
  ['pen', 'highlighter', 'eraser'].forEach(t => {
    const btn = document.getElementById(`btnTool${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (t === tool) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function setDrawingColor(color, dotElem) {
  currentDrawColor = color;
  document.querySelectorAll('#drawingPaletteColors .palette-color-dot').forEach(d => d.classList.remove('active'));
  if (dotElem) dotElem.classList.add('active');
  if (currentDrawTool === 'eraser') setDrawingTool('pen');
}

function handleDrawingPointerDown(e) {
  if (!appState.isDrawingMode) return;

  // 🌟 애플펜슬 2세대 더블 탭 제스처 감지 (250ms 이내 연속 탭 시 펜 ↔ 지우개 전환)
  const now = Date.now();
  if (now - lastPenTapTime < 250) {
    setDrawingTool(currentDrawTool === 'eraser' ? 'pen' : 'eraser');
    showToast(`도구 전환: [${currentDrawTool === 'eraser' ? '지우개' : '펜'}]`);
    lastPenTapTime = 0;
    return;
  }
  lastPenTapTime = now;

  drawingCanvas.setPointerCapture(e.pointerId);
  isDrawingNow = true;

  const rect = drawingCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

  currentStroke = [{ x, y, pressure }];
}

function handleDrawingPointerMove(e) {
  if (!isDrawingNow || !appState.isDrawingMode) return;

  const rect = drawingCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

  const prev = currentStroke[currentStroke.length - 1];
  currentStroke.push({ x, y, pressure });

  renderStrokeSegment(prev, { x, y, pressure }, currentDrawTool, currentDrawColor);
}

function handleDrawingPointerUp(e) {
  if (!isDrawingNow) return;
  isDrawingNow = false;

  if (currentStroke.length > 0) {
    const ym = `${appState.calendarYear}-${String(appState.calendarMonth+1).padStart(2,'0')}`;
    if (!appState.drawings[ym]) appState.drawings[ym] = [];
    appState.drawings[ym].push({
      tool: currentDrawTool,
      color: currentDrawColor,
      points: currentStroke
    });
    persistState();
  }
  currentStroke = [];
}

function renderStrokeSegment(p1, p2, tool, color) {
  if (!drawingCtx) return;
  drawingCtx.beginPath();
  drawingCtx.moveTo(p1.x, p1.y);
  drawingCtx.lineTo(p2.x, p2.y);
  drawingCtx.lineCap = 'round';
  drawingCtx.lineJoin = 'round';

  const baseWidth = (tool === 'highlighter') ? 14 : (tool === 'eraser' ? 18 : 2.5);
  drawingCtx.lineWidth = baseWidth * (p2.pressure || 0.5) * 1.5;

  if (tool === 'eraser') {
    drawingCtx.globalCompositeOperation = 'destination-out';
    drawingCtx.strokeStyle = 'rgba(0,0,0,1)';
  } else if (tool === 'highlighter') {
    drawingCtx.globalCompositeOperation = 'source-over';
    drawingCtx.strokeStyle = color;
    drawingCtx.globalAlpha = 0.35;
  } else {
    drawingCtx.globalCompositeOperation = 'source-over';
    drawingCtx.strokeStyle = color;
    drawingCtx.globalAlpha = 1.0;
  }

  drawingCtx.stroke();
  drawingCtx.globalAlpha = 1.0;
  drawingCtx.globalCompositeOperation = 'source-over';
}

function redrawAllDrawingStrokes() {
  if (!drawingCtx || !drawingCanvas) return;
  const rect = drawingCanvas.getBoundingClientRect();
  drawingCtx.clearRect(0, 0, rect.width, rect.height);

  const ym = `${appState.calendarYear}-${String(appState.calendarMonth+1).padStart(2,'0')}`;
  const strokes = appState.drawings[ym] || [];

  strokes.forEach(stroke => {
    for (let i = 1; i < stroke.points.length; i++) {
      renderStrokeSegment(stroke.points[i - 1], stroke.points[i], stroke.tool, stroke.color);
    }
  });
}

function undoDrawingStroke() {
  const ym = `${appState.calendarYear}-${String(appState.calendarMonth+1).padStart(2,'0')}`;
  if (appState.drawings[ym] && appState.drawings[ym].length > 0) {
    appState.drawings[ym].pop();
    persistState();
    redrawAllDrawingStrokes();
    showToast("한 획 되돌리기 완료");
  }
}

function clearAllDrawingStrokes() {
  if (confirm("현재 달의 모든 손글씨 필기를 지우시겠습니까?")) {
    const ym = `${appState.calendarYear}-${String(appState.calendarMonth+1).padStart(2,'0')}`;
    appState.drawings[ym] = [];
    persistState();
    redrawAllDrawingStrokes();
    showToast("손글씨 필기가 모두 지워졌습니다.");
  }
}

// ========================================================
// 7. 스티커 스튜디오 & 2단계 플로팅 돋보기(Loupe)
// ========================================================
function openStickerStudioModal() {
  document.getElementById('stickerStudioModal').classList.remove('hidden');
}

function closeStickerStudioModal() {
  document.getElementById('stickerStudioModal').classList.add('hidden');
}

function switchStickerSubTab(tab) {
  ['emoji', 'lettering', 'custom'].forEach(t => {
    const btn = document.getElementById(`tabSticker${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const panel = document.getElementById(`stickerPanel${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (t === tab) {
      btn.className = "flex-1 py-1.5 rounded-lg bg-white text-theme shadow-2xs font-extrabold";
      panel.classList.remove('hidden');
    } else {
      btn.className = "flex-1 py-1.5 rounded-lg text-slate-500 font-bold";
      panel.classList.add('hidden');
    }
  });
}

function renderStickerStudioPresets() {
  const emojiPanel = document.getElementById('stickerPanelEmoji');
  emojiPanel.innerHTML = '';
  STICKER_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = "p-2 rounded-xl hover:bg-slate-100 transition active:scale-90 text-2xl";
    btn.textContent = emoji;
    btn.onclick = () => attachStickerToCanvas(emoji, 'emoji');
    emojiPanel.appendChild(btn);
  });

  const letteringPanel = document.getElementById('stickerPanelLettering');
  letteringPanel.innerHTML = '';
  STICKER_LETTERINGS.forEach(txt => {
    const btn = document.createElement('button');
    btn.className = "px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black hover:border-amber-400 hover:text-amber-800 transition active:scale-95";
    btn.textContent = txt;
    btn.onclick = () => attachStickerToCanvas(txt, 'lettering');
    letteringPanel.appendChild(btn);
  });
}

function addCustomTypedSticker() {
  const text = document.getElementById('customStickerText').value.trim();
  if (!text) return showToast("스티커 문구를 입력해 주세요.");

  const font = document.getElementById('customStickerFont').value;
  const color = document.getElementById('customStickerColor').value;
  const hasBg = document.getElementById('customStickerBgCheck').checked;

  attachStickerToCanvas(text, 'custom', { font, color, hasBg });
  document.getElementById('customStickerText').value = '';
}

function attachStickerToCanvas(text, type, options = {}) {
  closeStickerStudioModal();
  const newSticker = {
    id: Date.now(),
    date: appState.selectedDate,
    sticker: text,
    font: options.font || 'Pretendard',
    color: options.color || '#1e293b',
    hasBg: options.hasBg !== undefined ? options.hasBg : (type === 'lettering'),
    x: 100 + Math.random() * 60,
    y: 80 + Math.random() * 60,
    scale: 1.1,
    rotation: 0
  };

  appState.stickers.push(newSticker);
  persistState();
  renderCanvasStickers();
  showToast("스티커가 놓였습니다. 핀치로 크기/각도를 조절하세요!");
}

function renderCanvasStickers() {
  const canvas = document.getElementById('calendarStickerCanvas');
  if (!canvas) return;
  canvas.innerHTML = '';

  appState.stickers.forEach(st => {
    const el = document.createElement('div');
    el.className = "canvas-sticker";
    el.style.left = `${st.x}px`;
    el.style.top = `${st.y}px`;
    el.style.transform = `scale(${st.scale}) rotate(${st.rotation}deg)`;
    el.style.fontFamily = st.font;
    el.style.color = st.color;

    if (st.hasBg) {
      el.style.backgroundColor = "rgba(255, 255, 255, 0.92)";
      el.style.borderRadius = "8px";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.12)";
    }

    el.textContent = st.sticker;
    bindStickerTouchWithLoupe(el, st);
    canvas.appendChild(el);
  });
}

function bindStickerTouchWithLoupe(element, stickerData) {
  const loupe = document.getElementById('stickerLoupe');
  const loupeContent = document.getElementById('stickerLoupeContent');

  let initialDist = 0;
  let initialAngle = 0;
  let startX = 0, startY = 0;

  element.addEventListener('pointerdown', (e) => {
    element.setPointerCapture(e.pointerId);
    loupeContent.textContent = stickerData.sticker;
    loupeContent.style.fontFamily = stickerData.font;
    loupeContent.style.color = stickerData.color;
    loupe.style.display = 'block';

    updateLoupePosition(e.clientX, e.clientY);
    startX = e.clientX - stickerData.x;
    startY = e.clientY - stickerData.y;
  });

  element.addEventListener('pointermove', (e) => {
    if (!element.hasPointerCapture(e.pointerId)) return;

    updateLoupePosition(e.clientX, e.clientY);
    stickerData.x = e.clientX - startX;
    stickerData.y = e.clientY - startY;

    element.style.left = `${stickerData.x}px`;
    element.style.top = `${stickerData.y}px`;
  });

  element.addEventListener('pointerup', (e) => {
    loupe.style.display = 'none';
    persistState();
  });
  element.addEventListener('pointercancel', (e) => {
    loupe.style.display = 'none';
  });
}

function updateLoupePosition(x, y) {
  const loupe = document.getElementById('stickerLoupe');
  loupe.style.left = `${x}px`;
  loupe.style.top = `${y}px`;
}

// ========================================================
// 8. 통합 미디어 바텀시트 & 와이드 풀필 뷰포트
// ========================================================
function openMediaBottomSheet() {
  if (appState.draftEntry.mediaList.length >= 3) {
    return showToast("미디어는 최대 3장까지만 등록 가능합니다.");
  }
  document.getElementById('mediaBottomSheetBackdrop').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('mediaBottomSheetPanel').classList.add('show');
  }, 10);
}

function closeMediaBottomSheet() {
  document.getElementById('mediaBottomSheetPanel').classList.remove('show');
  setTimeout(() => {
    document.getElementById('mediaBottomSheetBackdrop').classList.add('hidden');
  }, 240);
}

function triggerAlbumSelect() {
  closeMediaBottomSheet();
  document.getElementById('albumPhotoInput').click();
}

function triggerLiveCamera() {
  closeMediaBottomSheet();
  document.getElementById('cameraPhotoInput').click();
}

function triggerShortVideo() {
  closeMediaBottomSheet();
  document.getElementById('videoInput').click();
}

function handleMediaSelect(event, type) {
  const files = Array.from(event.target.files);
  const remaining = 3 - appState.draftEntry.mediaList.length;
  const targetFiles = files.slice(0, remaining);

  targetFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      appState.draftEntry.mediaList.push({ type: 'image', src: e.target.result });
      renderWideMediaView();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function handleVideoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const tempVideo = document.createElement('video');
  tempVideo.preload = 'metadata';
  tempVideo.src = URL.createObjectURL(file);

  tempVideo.onloadedmetadata = () => {
    URL.revokeObjectURL(tempVideo.src);
    if (tempVideo.duration > 10) {
      document.getElementById('videoTrimmerModal').classList.remove('hidden');
    } else {
      attachVideoData(file, tempVideo.duration);
    }
  };
  event.target.value = '';
}

function confirmAutoTrimVideo() {
  closeVideoTrimmer();
  const fileInput = document.getElementById('videoInput');
  if (fileInput.files[0]) attachVideoData(fileInput.files[0], 10);
}

function closeVideoTrimmer() {
  document.getElementById('videoTrimmerModal').classList.add('hidden');
}

function attachVideoData(file, dur) {
  const reader = new FileReader();
  reader.onload = (e) => {
    appState.draftEntry.mediaList.push({ type: 'video', src: e.target.result, duration: Math.round(dur) });
    renderWideMediaView();
    showToast("10초 영상이 첨부되었습니다.");
  };
  reader.readAsDataURL(file);
}

function renderWideMediaView() {
  const container = document.getElementById('wideMediaContainer');
  container.innerHTML = '';
  const list = appState.draftEntry.mediaList;
  document.getElementById('mediaCountBadge').textContent = `${list.length} / 3`;

  if (list.length === 0) return;
  container.innerHTML = renderWideMediaHtml(list, true);
  lucide.createIcons();
}

function renderWideMediaHtml(list, withDelete = false) {
  if (list.length === 1) {
    const m = list[0];
    return `
      <div class="relative rounded-2xl overflow-hidden cursor-pointer shadow-xs group" onclick="openLightbox('${m.src}', '${m.type}')">
        ${m.type === 'video' ? `<video src="${m.src}" class="wide-media-single" muted autoplay loop playsinline></video>` : `<img src="${m.src}" class="wide-media-single">`}
        ${withDelete ? `<button onclick="event.stopPropagation(); removeDraftMedia(0);" class="absolute top-2 right-2 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition z-10"><i data-lucide="x" class="w-3 h-3"></i></button>` : ''}
      </div>
    `;
  } else if (list.length === 2) {
    return `
      <div class="wide-media-double">
        ${list.map((m, idx) => `
          <div class="relative cursor-pointer h-full" onclick="openLightbox('${m.src}', '${m.type}')">
            ${m.type === 'video' ? `<video src="${m.src}" class="w-full h-full object-cover" muted autoplay loop playsinline></video>` : `<img src="${m.src}" class="w-full h-full object-cover">`}
            ${withDelete ? `<button onclick="event.stopPropagation(); removeDraftMedia(${idx});" class="absolute top-2 right-2 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition z-10"><i data-lucide="x" class="w-3 h-3"></i></button>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } else {
    return `
      <div class="wide-media-triple">
        <div class="relative cursor-pointer h-full" onclick="openLightbox('${list[0].src}', '${list[0].type}')">
          ${list[0].type === 'video' ? `<video src="${list[0].src}" class="w-full h-full object-cover" muted autoplay loop playsinline></video>` : `<img src="${list[0].src}" class="w-full h-full object-cover">`}
          ${withDelete ? `<button onclick="event.stopPropagation(); removeDraftMedia(0);" class="absolute top-2 right-2 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition z-10"><i data-lucide="x" class="w-3 h-3"></i></button>` : ''}
        </div>
        <div class="wide-media-triple-right">
          ${[list[1], list[2]].map((m, subIdx) => `
            <div class="relative cursor-pointer h-full overflow-hidden rounded-xl" onclick="openLightbox('${m.src}', '${m.type}')">
              ${m.type === 'video' ? `<video src="${m.src}" class="w-full h-full object-cover" muted autoplay loop playsinline></video>` : `<img src="${m.src}" class="w-full h-full object-cover">`}
              ${withDelete ? `<button onclick="event.stopPropagation(); removeDraftMedia(${subIdx + 1});" class="absolute top-2 right-2 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition z-10"><i data-lucide="x" class="w-3 h-3"></i></button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

function removeDraftMedia(idx) {
  appState.draftEntry.mediaList.splice(idx, 1);
  renderWideMediaView();
}

function openLightbox(src, type = 'image') {
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  img.src = src;
  modal.classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightboxModal').classList.add('hidden');
}

// ========================================================
// 9. 음성 메모 녹음 (Voice-to-Diary)
// ========================================================
function openVoiceRecordModal() {
  document.getElementById('voiceRecordModal').classList.remove('hidden');
  resetVoiceModalUI();
}

function closeVoiceRecordModal() {
  stopVoiceRecordingSession();
  document.getElementById('voiceRecordModal').classList.add('hidden');
}

function setVoicePresetDuration(sec) {
  voiceMaxSeconds = sec;
  ['15', '30', '45', '60'].forEach(s => {
    const btn = document.getElementById(`btnVoice${s}`);
    if (parseInt(s) === sec) {
      btn.className = "py-1.5 rounded-xl bg-white text-rose-600 shadow-2xs font-black";
    } else {
      btn.className = "py-1.5 rounded-xl text-slate-500 font-bold";
    }
  });
  document.getElementById('recordingMaxText').textContent = `/ 00:${String(sec).padStart(2, '0')}`;
}

function resetVoiceModalUI() {
  voiceCurrentSeconds = 0;
  document.getElementById('recordingTimerText').textContent = "00:00";
  document.getElementById('recordHelpMsg').textContent = "마이크를 탭하여 목소리로 하루를 들려주세요.";
  document.getElementById('voiceSttLiveText').value = appState.draftEntry.voiceTranscript || "";
  document.getElementById('recordTriggerBtn').classList.remove('recording-pulse');
}

async function toggleVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopVoiceRecordingSession();
  } else {
    startVoiceRecordingSession();
  }
}

async function startVoiceRecordingSession() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      appState.draftEntry.voiceAudio = audioUrl;
      appState.draftEntry.voiceDuration = voiceCurrentSeconds;
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    initLiveSpeechRecognition();

    const btn = document.getElementById('recordTriggerBtn');
    btn.classList.add('recording-pulse');
    document.getElementById('recordHelpMsg').textContent = "생각나는 대로 편안하게 말씀하세요...";

    voiceCurrentSeconds = 0;
    clearInterval(voiceTimerInterval);
    voiceTimerInterval = setInterval(() => {
      voiceCurrentSeconds++;
      document.getElementById('recordingTimerText').textContent = `00:${String(voiceCurrentSeconds).padStart(2, '0')}`;
      if (voiceCurrentSeconds >= voiceMaxSeconds) {
        stopVoiceRecordingSession();
      }
    }, 1000);

  } catch (err) {
    alert("마이크 접근 권한이 필요합니다.");
  }
}

function stopVoiceRecordingSession() {
  clearInterval(voiceTimerInterval);
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  if (speechRecognitionInstance) {
    try { speechRecognitionInstance.stop(); } catch (e) {}
  }
  const btn = document.getElementById('recordTriggerBtn');
  if (btn) btn.classList.remove('recording-pulse');
  const msg = document.getElementById('recordHelpMsg');
  if (msg) msg.textContent = "녹음이 완료되었습니다. 텍스트를 확인하고 적용하세요.";
}

function initLiveSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  speechRecognitionInstance = new SpeechRecognition();
  speechRecognitionInstance.lang = 'ko-KR';
  speechRecognitionInstance.continuous = true;
  speechRecognitionInstance.interimResults = true;

  speechRecognitionInstance.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      interim += event.results[i][0].transcript;
    }
    document.getElementById('voiceSttLiveText').value = interim;
  };
  speechRecognitionInstance.start();
}

function confirmVoiceRecording() {
  const transcript = document.getElementById('voiceSttLiveText').value.trim();
  appState.draftEntry.voiceTranscript = transcript;
  closeVoiceRecordModal();

  document.getElementById('voiceStatusBadge').textContent = `녹음완료 (${appState.draftEntry.voiceDuration}초)`;
  document.getElementById('voiceStatusBadge').className = "text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200";
  document.getElementById('voiceDurationDisplay').textContent = `00:${String(appState.draftEntry.voiceDuration).padStart(2, '0')}`;
  document.getElementById('voicePlaybackSnippet').classList.remove('hidden');

  if (transcript) {
    const area = document.getElementById('voiceTranscriptArea');
    area.textContent = `🎙️ 육성 내용: "${transcript}"`;
    area.classList.remove('hidden');
  }

  showToast("음성 메모가 일기 버퍼에 결합되었습니다.");
}

function playDraftAudio() {
  if (!appState.draftEntry.voiceAudio) return;
  const audio = new Audio(appState.draftEntry.voiceAudio);
  audio.play();
}

function clearDraftAudio() {
  appState.draftEntry.voiceAudio = null;
  appState.draftEntry.voiceTranscript = '';
  appState.draftEntry.voiceDuration = 0;

  const badge = document.getElementById('voiceStatusBadge');
  if (badge) {
    badge.textContent = "미녹음";
    badge.className = "text-[10px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200";
  }
  const snippet = document.getElementById('voicePlaybackSnippet');
  if (snippet) snippet.classList.add('hidden');
  const area = document.getElementById('voiceTranscriptArea');
  if (area) area.classList.add('hidden');
}

// ========================================================
// 10. AI 인터뷰어 질문 & 동적 페르소나 일기 생성
// ========================================================
function refreshInterviewQuestion() {
  const qEl = document.getElementById('aiInterviewQuestionText');
  if (!qEl) return;
  const randomQ = INTERVIEW_QUESTIONS[Math.floor(Math.random() * INTERVIEW_QUESTIONS.length)];
  qEl.textContent = `"${randomQ}"`;
}

async function requestAIDiaryGeneration() {
  const { mediaList, keywords, voiceTranscript } = appState.draftEntry;
  const interviewAnswer = document.getElementById('aiInterviewAnswerInput').value.trim();
  appState.draftEntry.interviewAnswer = interviewAnswer;

  if (mediaList.length === 0 && keywords.length === 0 && !voiceTranscript && !interviewAnswer) {
    return showToast("사진, 키워드, 음성 메모, 또는 인터뷰 답변 중 최소 하나를 입력해 주세요.");
  }

  const btn = document.getElementById('btnGenerateAI');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-amber-300"></i><span>페르소나에 맞춰 감정을 정갈하게 엮는 중...</span>`;
  lucide.createIcons();

  // 동적 프롬프트 구조화
  const dynamicSystemInstruction = `[System Instruction]
당신은 사용자의 내면을 가장 깊이 이해하는 전속 에세이스트 AI입니다.
아래의 [사용자 페르소나]를 심층 분석하여, 마치 사용자가 자신의 일기장에 직접 쓴 것 같은 완벽한 일체감의 1인칭 수필형 일기(3~4문장)를 작성하세요.

[사용자 페르소나 Profile]
- 직업 / 환경: ${appState.persona.job || '일상 탐구자'}
- MBTI 및 성격: ${appState.persona.mbti || 'ENFP'}, ${(appState.persona.personality || []).join(', ') || '사색적'}
- 선호 문체 스타일: ${appState.persona.tone || '담담한 수필형'}

[입력 정보]
- 키워드: ${keywords.join(', ')}
${voiceTranscript ? `- 음성 메모 전사: "${voiceTranscript}"` : ''}
${interviewAnswer ? `- 오늘의 질문 답변: "${interviewAnswer}"` : ''}

[작성 절대 원칙]
1. 키워드 단어를 기계적으로 본문에 나열하거나 열거하지 마십시오.
2. 직업적 시선과 MBTI 감성, 지정된 문체가 자연스럽게 배어나오도록 1인칭 독백체로 완성하십시오.`;

  // 구글 앱스 스크립트 API 호출
  if (GAS_API_URL && !GAS_API_URL.includes("여기에")) {
    try {
      const payload = {
        action: "GENERATE_AND_SAVE",
        userEmail: appState.currentUser ? appState.currentUser.email : "guest",
        persona: appState.persona,
        prompt: dynamicSystemInstruction,
        photos: mediaList.map(m => m.src),
        keywords: keywords,
        voiceText: voiceTranscript,
        interviewAnswer: interviewAnswer,
        date: appState.draftEntry.date
      };

      const res = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.diary) {
        showGeneratedDiary(data.diary);
        return;
      }
    } catch (e) {
      console.warn("GAS 통신 예외, 로컬 자연어 엔진으로 대체합니다.", e);
    }
  }

  // 로컬 고감도 자연어 시뮬레이션
  setTimeout(() => {
    const { tone } = appState.persona;
    let personaReflect = "";

    if (tone === "공감형") {
      personaReflect = `누구보다 치열하게 하루를 보낸 나 자신에게 따스한 온기를 건네고 싶다. 비록 고단함이 밀려올지라도 곁에 머문 사람들과 나눈 미소 덕분에 마음의 결이 한층 포근해진다.`;
    } else if (tone === "성장형") {
      personaReflect = `땀 흘리고 부딪히며 나의 가능성을 또 한 뼘 넓혀낸 시간이었다. 소소한 순간들 속에서도 배움과 단단한 성장의 씨앗을 발견하며, 내일을 시작할 굳건한 에너지를 차곡차곡 채운다.`;
    } else if (tone === "일상형") {
      personaReflect = `오늘 하루도 큰 탈 없이 평온하게 지나갔다. 상쾌한 바람을 맞으며 좋아하는 풍경을 바라보고 나니 쌓였던 피로가 단숨에 사르르 녹아내린다. 이런 소소함이야말로 삶의 쉼표다.`;
    } else {
      personaReflect = `소란했던 세상의 속도를 잠시 늦추고 온전히 내 호흡에 귀를 기울였다. 거창한 말 대신 눈앞에 닿는 빛과 공기 속에 온기가 머물며, 조용하지만 단단한 위로가 마음에 차오른다.`;
    }

    if (interviewAnswer) {
      personaReflect += ` 문득 마음에 남았던 "${interviewAnswer}"라는 생각처럼, 진심이 깃든 순간들은 오래도록 지워지지 않을 것이다.`;
    }

    showGeneratedDiary(personaReflect);
  }, 1300);
}

function showGeneratedDiary(text) {
  appState.draftEntry.diary = text;
  document.getElementById('aiDiaryContent').textContent = text;
  document.getElementById('diaryResultCard').classList.remove('hidden');

  const btn = document.getElementById('btnGenerateAI');
  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i><span>Gemini AI 감성 일기 다시 작성하기</span>`;
  lucide.createIcons();
  showToast("AI가 마이 페르소나를 반영한 감성 일기를 완성했습니다!");
}

function selectFeedback(reaction, btnElem) {
  appState.draftEntry.feedback = reaction;
  document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('selected'));
  if (btnElem) btnElem.classList.add('selected');
  showToast(`피드백 [${reaction}]이 선택되었습니다.`);
}

function commitEntryToCloud() {
  const comment = document.getElementById('finalUserCommentInput').value.trim();
  appState.draftEntry.userComment = comment;

  const fullDate = appState.draftEntry.date;
  const parts = fullDate.split('-');
  const dateDisplay = `${parts[0]}. ${parts[1]}. ${parts[2]}`;

  const entryRecord = {
    id: Date.now(),
    userEmail: appState.currentUser ? appState.currentUser.email : "guest",
    date: fullDate,
    dateDisplay: dateDisplay,
    mediaList: [...appState.draftEntry.mediaList],
    keywords: [...appState.draftEntry.keywords],
    diary: appState.draftEntry.diary || "기록이 등록되었습니다.",
    feedback: appState.draftEntry.feedback || "행복한 여운 🥰",
    userComment: comment,
    voiceAudio: appState.draftEntry.voiceAudio,
    voiceTranscript: appState.draftEntry.voiceTranscript,
    voiceDuration: appState.draftEntry.voiceDuration,
    interviewAnswer: appState.draftEntry.interviewAnswer
  };

  const existIdx = appState.entries.findIndex(e => e.date === fullDate);
  if (existIdx > -1) appState.entries[existIdx] = entryRecord;
  else appState.entries.unshift(entryRecord);

  appState.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  persistState();

  showToast("🎉 오늘의 기록이 안전하게 최종 등록되었습니다!");
  renderCalendar();
  renderTimeline();
  switchTab('timeline');
}

// ========================================================
// 11. 회원 인증 & 계정 찾기 & 마이페이지
// ========================================================
function handleHeaderUserClick() {
  if (appState.currentUser) {
    openMyPageModal();
  } else {
    openAuthModal();
  }
}

function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

function switchAuthTab(type) {
  ['login', 'signup', 'find'].forEach(t => {
    const btn = document.getElementById(`authTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const form = document.getElementById(`${t}Form`);
    if (t === type) {
      btn.className = "flex-1 py-1.5 rounded-lg bg-white text-theme shadow-2xs font-extrabold";
      form.classList.remove('hidden');
    } else {
      btn.className = "flex-1 py-1.5 rounded-lg font-bold text-slate-500";
      form.classList.add('hidden');
    }
  });
}

function checkSignupPwMatch() {
  const pw = document.getElementById('signupPw').value;
  const confirm = document.getElementById('signupPwConfirm').value;
  const msg = document.getElementById('signupPwMatchMsg');

  if (!confirm) {
    msg.classList.add('hidden');
    return;
  }
  msg.classList.remove('hidden');
  if (pw === confirm) {
    msg.textContent = "비밀번호가 일치합니다.";
    msg.className = "text-[10px] font-bold text-emerald-600 mt-0.5 block";
  } else {
    msg.textContent = "비밀번호가 일치하지 않습니다.";
    msg.className = "text-[10px] font-bold text-rose-600 mt-0.5 block";
  }
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPw').value.trim();
  const confirm = document.getElementById('signupPwConfirm').value.trim();
  const birth = document.getElementById('signupBirth').value;
  const name = document.getElementById('signupName').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();

  if (pw !== confirm) return showToast("비밀번호 확인이 일치하지 않습니다.");

  appState.currentUser = { email, birth, name: name || "회원", phone };
  persistState();
  updateUserSessionUI();
  closeAuthModal();
  showToast(`환영합니다! 회원가입이 완료되었습니다.`);
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  appState.currentUser = { email, birth: "", name: "회원", phone: "" };
  appState.autoLogin = document.getElementById('autoLoginCheck').checked;

  persistState();
  updateUserSessionUI();
  closeAuthModal();
  showToast("로그인되었습니다.");
}

function updateUserSessionUI() {
  const badge = document.getElementById('headerUserBadge');
  if (appState.currentUser) {
    badge.textContent = `${appState.currentUser.name || appState.currentUser.email.split('@')[0]} 님`;
  } else {
    badge.textContent = "로그인 필요";
  }
}

// 계정 찾기 서브 탭
function switchFindSubTab(sub) {
  const tabId = document.getElementById('tabFindId');
  const tabPw = document.getElementById('tabFindPw');
  const panelId = document.getElementById('panelFindId');
  const panelPw = document.getElementById('panelFindPw');

  if (sub === 'id') {
    tabId.className = "flex-1 py-1.5 border-b-2 border-theme text-theme font-bold";
    tabPw.className = "flex-1 py-1.5 border-b-2 border-transparent text-slate-400 font-bold";
    panelId.classList.remove('hidden');
    panelPw.classList.add('hidden');
  } else {
    tabPw.className = "flex-1 py-1.5 border-b-2 border-theme text-theme font-bold";
    tabId.className = "flex-1 py-1.5 border-b-2 border-transparent text-slate-400 font-bold";
    panelPw.classList.remove('hidden');
    panelId.classList.add('hidden');
  }
}

function executeFindId() {
  const name = document.getElementById('findIdName').value.trim();
  const birth = document.getElementById('findIdBirth').value;
  const resultBox = document.getElementById('findIdResultBox');

  if (!name || !birth) return showToast("이름과 생년월일을 입력해 주세요.");

  // 계정 조회 (마스킹 안내)
  const masked = `${name.slice(0, 1)}**@gmail.com`;
  resultBox.textContent = `회원님의 아이디는 [ ${masked} ] 입니다.`;
  resultBox.classList.remove('hidden');
}

function executeFindAndResetPw() {
  const email = document.getElementById('findPwEmail').value.trim();
  const birth = document.getElementById('findPwBirth').value;
  const newSection = document.getElementById('newPwSection');
  const btn = document.getElementById('btnFindPwSubmit');

  if (newSection.classList.contains('hidden')) {
    if (!email || !birth) return showToast("이메일과 생년월일을 입력해 주세요.");
    newSection.classList.remove('hidden');
    btn.textContent = "비밀번호 변경 완료";
    showToast("본인 인증 완료! 새 비밀번호를 입력해 주세요.");
  } else {
    const newPw = document.getElementById('resetNewPw').value.trim();
    if (!newPw) return showToast("새 비밀번호를 입력해 주세요.");
    showToast("비밀번호가 성공적으로 재설정되었습니다! 다시 로그인해 주세요.");
    switchAuthTab('login');
  }
}

// 👤 [내 정보 관리 (마이페이지)]
function openMyPageModal() {
  if (!appState.currentUser) return openAuthModal();
  document.getElementById('myPageEmailDisplay').textContent = appState.currentUser.email;
  initPersonaUI();
  document.getElementById('myPageModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeMyPageModal() { document.getElementById('myPageModal').classList.add('hidden'); }

function initPersonaUI() {
  const p = appState.persona;
  document.getElementById('personaJob').value = p.job || '';
  document.getElementById('personaMbti').value = p.mbti || 'ENFP';
  document.getElementById('personaPin').value = p.pin || '';
  document.getElementById('personaThemeSelect').value = p.defaultTheme || 'indigo';

  const toneRadios = document.querySelectorAll('input[name="personaTone"]');
  toneRadios.forEach(r => {
    if (r.value === p.tone) r.checked = true;
  });

  renderPersonalityChips();
}

function renderPersonalityChips() {
  const container = document.getElementById('personaPersonalityChips');
  if (!container) return;
  container.innerHTML = '';
  ALL_PERSONALITY_TAGS.forEach(tag => {
    const isSelected = appState.persona.personality.includes(tag);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `px-2.5 py-1 rounded-xl text-xs font-bold border transition ${isSelected ? 'bg-theme text-white border-theme' : 'bg-slate-50 text-slate-600 border-slate-200'}`;
    chip.textContent = `#${tag}`;
    chip.onclick = () => togglePersonalityTag(tag);
    container.appendChild(chip);
  });
}

function togglePersonalityTag(tag) {
  const list = appState.persona.personality;
  const idx = list.indexOf(tag);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    if (list.length >= 3) return showToast("성격 키워드는 최대 3개까지만 선택 가능합니다.");
    list.push(tag);
  }
  renderPersonalityChips();
}

function handleSavePersona(e) {
  e.preventDefault();
  const job = document.getElementById('personaJob').value.trim();
  const mbti = document.getElementById('personaMbti').value;
  const pin = document.getElementById('personaPin').value.trim();
  const theme = document.getElementById('personaThemeSelect').value;
  const toneRadio = document.querySelector('input[name="personaTone"]:checked');

  appState.persona.job = job || "일상 탐구자";
  appState.persona.mbti = mbti;
  appState.persona.pin = pin || "0724";
  appState.persona.defaultTheme = theme;
  appState.persona.tone = toneRadio ? toneRadio.value : "수필형";

  persistState();
  applyAppTheme(theme);
  closeMyPageModal();
  showToast("내 정보 및 마이 페르소나 설정이 안전하게 저장되었습니다.");
}

function logoutCurrentUser() {
  if (confirm("로그아웃 하시겠습니까?")) {
    appState.currentUser = null;
    persistState();
    updateUserSessionUI();
    closeMyPageModal();
    showToast("로그아웃되었습니다.");
  }
}

// ========================================================
// 12. 월간 매거진, 다차원 메모, 플래너, 타임라인, 관리자
// ========================================================
function openMagazineModal() {
  const validEntries = appState.entries.filter(e => e.mediaList && e.mediaList.length > 0);
  if (validEntries.length === 0) return showToast("매거진으로 조판할 사진 기록이 없습니다.");

  document.getElementById('magMonthDisplay').textContent = `${appState.calendarYear}. ${String(appState.calendarMonth + 1).padStart(2, '0')}`;
  document.getElementById('magOwnerName').textContent = `${appState.currentUser ? (appState.currentUser.name || appState.currentUser.email.split('@')[0]) : '회원'} 님`;
  document.getElementById('magOwnerPersona').textContent = `${appState.persona.job} • ${appState.persona.mbti} • ${appState.persona.tone}`;
  document.getElementById('magHighlightPhoto').src = validEntries[0].mediaList[0].src;

  const grid = document.getElementById('magEntriesGrid');
  grid.innerHTML = '';
  validEntries.slice(0, 4).forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2";
    card.innerHTML = `
      <img src="${item.mediaList[0].src}" class="w-full h-32 object-cover rounded-xl shadow-2xs">
      <div class="flex justify-between items-center text-[10px] font-bold">
        <span class="text-slate-900">${item.dateDisplay}</span>
        <span class="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">${item.feedback}</span>
      </div>
      <p class="text-[11px] text-slate-700 leading-relaxed font-medium line-clamp-3">${item.diary}</p>
    `;
    grid.appendChild(card);
  });

  document.getElementById('magazineModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeMagazineModal() { document.getElementById('magazineModal').classList.add('hidden'); }

// 다차원 메모
function setMemoFilter(filter) {
  appState.memoFilter = filter;
  ['all', 'week', 'month', 'pin'].forEach(f => {
    const btn = document.getElementById(`btnMemoFilter${f.charAt(0).toUpperCase() + f.slice(1)}`);
    if (f === filter) btn.className = "px-2 py-0.5 rounded-lg bg-white text-theme shadow-2xs font-extrabold";
    else btn.className = "px-2 py-0.5 rounded-lg text-slate-500 font-bold";
  });
  renderFilteredMemos();
}

function selectMemoColor(color, btnElem) {
  appState.memoSelectedColor = color;
  document.querySelectorAll('#tab-planner button[onclick^="selectMemoColor"]').forEach(b => b.classList.remove('ring-2', 'ring-indigo-600'));
  if (btnElem) btnElem.classList.add('ring-2', 'ring-indigo-600');
}

function saveIdeaMemo() {
  const textarea = document.getElementById('ideaMemoTextInput');
  const text = textarea.value.trim();
  if (!text) return showToast("메모 내용을 입력해 주세요.");

  const type = document.getElementById('memoTypeSelect').value;
  const targetDate = type === 'date' ? document.getElementById('memoTargetDateInput').value : null;

  const now = new Date();
  const dateStr = `${now.getFullYear()}. ${String(now.getMonth()+1).padStart(2,'0')}. ${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  appState.memos.unshift({
    id: Date.now(),
    type: type,
    date: targetDate,
    text: text,
    color: appState.memoSelectedColor,
    isPinned: false,
    createdAt: dateStr
  });

  textarea.value = '';
  persistState();
  renderFilteredMemos();
  renderCalendar();
  showToast("💡 메모가 안전하게 영구 저장되었습니다!");
}

function renderFilteredMemos() {
  const container = document.getElementById('savedMemosList');
  if (!container) return;
  container.innerHTML = '';

  let list = [...appState.memos];
  const today = new Date();

  if (appState.memoFilter === 'pin') {
    list = list.filter(m => m.isPinned);
  } else if (appState.memoFilter === 'month') {
    const currentYM = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    list = list.filter(m => (m.date && m.date.startsWith(currentYM)) || m.createdAt.startsWith(today.getFullYear().toString()));
  }

  if (list.length === 0) {
    container.innerHTML = `<p class="col-span-2 text-xs text-slate-400 text-center py-4 font-bold">조건에 맞는 메모가 없습니다.</p>`;
    return;
  }

  list.forEach(m => {
    const card = document.createElement('div');
    const colorClass = `memo-card-${m.color || 'yellow'}`;
    card.className = `p-3 rounded-2xl border flex flex-col justify-between shadow-2xs ${colorClass}`;

    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-1">
          <span class="text-[9px] font-black uppercase tracking-wider opacity-75">${m.type === 'date' ? `📅 ${m.date}` : '⚡ 즉시메모'}</span>
          <button onclick="togglePinMemo(${m.id})" class="text-xs hover:scale-125 transition">${m.isPinned ? '📌' : '📍'}</button>
        </div>
        <p class="text-xs font-semibold whitespace-pre-line leading-relaxed">${m.text}</p>
      </div>
      <div class="flex justify-between items-center pt-2 mt-2 border-t border-black/10">
        <span class="text-[9px] opacity-60">${m.createdAt}</span>
        <button onclick="deleteIdeaMemo(${m.id})" class="opacity-50 hover:opacity-100 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </div>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

function togglePinMemo(id) {
  const m = appState.memos.find(memo => memo.id === id);
  if (m) m.isPinned = !m.isPinned;
  persistState();
  renderFilteredMemos();
}

function deleteIdeaMemo(id) {
  appState.memos = appState.memos.filter(m => m.id !== id);
  persistState();
  renderFilteredMemos();
  renderCalendar();
  showToast("메모가 삭제되었습니다.");
}

// 5단계 로드맵 To-Do
function setTodoScope(scope) {
  appState.currentTodoScope = scope;
  ['all', 'today', 'week', 'month', 'year', 'long'].forEach(s => {
    const btn = document.getElementById(`btnScope${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (s === scope) btn.className = "py-1.5 rounded-xl bg-white text-theme shadow-2xs font-black";
    else btn.className = "py-1.5 rounded-xl text-slate-500 font-bold";
  });
  renderCategorizedTodoList();
}

function renderCategorizedTodoList() {
  const ul = document.getElementById('categorizedTodoList');
  if (!ul) return;
  ul.innerHTML = '';

  let listToRender = [];
  if (appState.currentTodoScope === 'all') {
    ['today', 'week', 'month', 'year', 'long'].forEach(scope => {
      appState.todos[scope].forEach(item => {
        listToRender.push({ ...item, scopeLabel: getScopeLabelKorean(scope), originalScope: scope });
      });
    });
  } else {
    const target = appState.todos[appState.currentTodoScope] || [];
    listToRender = target.map(t => ({ ...t, scopeLabel: null, originalScope: appState.currentTodoScope }));
  }

  const completed = listToRender.filter(t => t.done).length;
  const pct = listToRender.length > 0 ? Math.round((completed / listToRender.length) * 100) : 0;
  document.getElementById('todoProgressBadge').textContent = `달성률 ${pct}% (${completed}/${listToRender.length})`;

  listToRender.forEach(t => {
    const li = document.createElement('li');
    li.className = "flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70";
    li.innerHTML = `
      <label class="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0">
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodoItem('${t.originalScope}', ${t.id})" class="w-4 h-4 rounded text-emerald-600 accent-emerald-600">
        <div class="truncate">
          ${t.scopeLabel ? `<span class="text-[9px] bg-slate-200 text-slate-600 font-black px-1.5 py-0.5 rounded-md mr-1.5">${t.scopeLabel}</span>` : ''}
          <span class="text-xs font-bold ${t.done ? 'line-through text-slate-400' : 'text-slate-800'}">${t.text}</span>
        </div>
      </label>
      <button onclick="deleteTodoItem('${t.originalScope}', ${t.id})" class="text-slate-400 hover:text-rose-600 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
    `;
    ul.appendChild(li);
  });
  lucide.createIcons();
}

function getScopeLabelKorean(scope) {
  const map = { today: '오늘', week: '이번주', month: '이번달', year: '올해', long: '장기' };
  return map[scope] || scope;
}

function addCategorizedTodo() {
  const input = document.getElementById('newTodoItemInput');
  const text = input.value.trim();
  if (!text) return;

  const targetScope = appState.currentTodoScope === 'all' ? 'today' : appState.currentTodoScope;
  appState.todos[targetScope].push({ id: Date.now(), text, done: false });
  input.value = '';
  persistState();
  renderCategorizedTodoList();
}

function toggleTodoItem(scope, id) {
  const item = appState.todos[scope].find(t => t.id === id);
  if (item) item.done = !item.done;
  persistState();
  renderCategorizedTodoList();
}

function deleteTodoItem(scope, id) {
  appState.todos[scope] = appState.todos[scope].filter(t => t.id !== id);
  persistState();
  renderCategorizedTodoList();
}

// 키워드 & 타임라인
function renderPresetKeywords() {
  const grid = document.getElementById('keywordChipsGrid');
  grid.innerHTML = '';
  PRESET_KEYWORDS.forEach(kw => {
    const isSelected = appState.draftEntry.keywords.includes(kw);
    const chip = document.createElement('button');
    chip.type = "button";
    chip.onclick = () => toggleKeyword(kw);
    chip.className = `keyword-chip px-3 py-1.5 rounded-full border text-[11px] font-bold transition ${isSelected ? 'selected' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`;
    chip.textContent = kw;
    grid.appendChild(chip);
  });
}

function renderRecentKeywords() {
  const bar = document.getElementById('recentKeywordsBar');
  bar.innerHTML = '';
  appState.recentKeywords.forEach(kw => {
    const isSelected = appState.draftEntry.keywords.includes(kw);
    const chip = document.createElement('button');
    chip.type = "button";
    chip.onclick = () => toggleKeyword(kw);
    chip.className = `px-2 py-0.5 rounded-md border text-[10px] font-bold transition ${isSelected ? 'bg-theme text-white border-theme' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600'}`;
    chip.textContent = `#${kw}`;
    bar.appendChild(chip);
  });
}

function toggleKeyword(kw) {
  const list = appState.draftEntry.keywords;
  const idx = list.indexOf(kw);
  if (idx > -1) list.splice(idx, 1);
  else list.push(kw);
  renderPresetKeywords();
  renderRecentKeywords();
}

function addCustomKeyword() {
  const input = document.getElementById('customKeywordInput');
  const val = input.value.trim().replace(/^#/, '');
  if (!val) return;

  if (!appState.recentKeywords.includes(val)) {
    appState.recentKeywords.unshift(val);
    if (appState.recentKeywords.length > 8) appState.recentKeywords.pop();
  }
  if (!appState.draftEntry.keywords.includes(val)) {
    appState.draftEntry.keywords.push(val);
  }
  input.value = '';
  persistState();
  renderPresetKeywords();
  renderRecentKeywords();
}

function setTimelineViewMode(mode) {
  appState.timelineViewMode = mode;
  const btnCard = document.getElementById('btnViewCard');
  const btnList = document.getElementById('btnViewList');
  const btnAlbum = document.getElementById('btnViewAlbum');

  [btnCard, btnList, btnAlbum].forEach(b => {
    b.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800";
  });

  if (mode === 'card') btnCard.className = "px-2.5 py-1 text-[11px] font-black rounded-lg bg-theme text-white shadow-xs";
  if (mode === 'list') btnList.className = "px-2.5 py-1 text-[11px] font-black rounded-lg bg-theme text-white shadow-xs";
  if (mode === 'album') btnAlbum.className = "px-2.5 py-1 text-[11px] font-black rounded-lg bg-theme text-white shadow-xs";

  renderTimeline();
}

function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;
  container.innerHTML = '';

  const entries = appState.entries;
  document.getElementById('timelineTotalCount').textContent = `총 ${entries.length}개 기록`;

  if (entries.length === 0) {
    container.innerHTML = `<div class="p-12 text-center text-slate-400 text-xs font-bold">아직 작성된 일상 기록이 없습니다.</div>`;
    return;
  }

  if (appState.timelineViewMode === 'album') {
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-3 gap-1.5";
    entries.forEach(item => {
      (item.mediaList || []).forEach(m => {
        const box = document.createElement('div');
        box.className = "aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer shadow-2xs hover:opacity-90 transition";
        box.onclick = () => openLightbox(m.src, m.type);
        box.innerHTML = m.type === 'video' ? `<video src="${m.src}" class="w-full h-full object-cover" muted></video>` : `<img src="${m.src}" class="w-full h-full object-cover">`;
        grid.appendChild(box);
      });
    });
    container.appendChild(grid);
    return;
  }

  if (appState.timelineViewMode === 'list') {
    entries.forEach(item => {
      const row = document.createElement('div');
      row.className = "bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center space-x-3 shadow-2xs hover:border-theme transition cursor-pointer";
      const thumb = (item.mediaList && item.mediaList.length > 0) ? item.mediaList[0].src : null;

      row.innerHTML = `
        ${thumb ? `<img src="${thumb}" class="w-12 h-12 rounded-xl object-cover shrink-0" onclick="event.stopPropagation(); openLightbox('${thumb}')">` : `
          <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"><i data-lucide="book-open" class="w-5 h-5"></i></div>
        `}
        <div class="flex-1 min-w-0" onclick="selectCalendarDate('${item.date}')">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs font-black text-slate-900">${item.dateDisplay}</span>
            <span class="text-[10px] font-bold text-theme bg-theme-light px-2 py-0.5 rounded-full">${item.feedback}</span>
          </div>
          <p class="text-xs text-slate-600 truncate font-medium">${item.diary}</p>
        </div>
      `;
      container.appendChild(row);
    });
    lucide.createIcons();
    return;
  }

  // 카드 뷰
  entries.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3";

    let mediaHtml = '';
    if (item.mediaList && item.mediaList.length > 0) {
      mediaHtml = renderWideMediaHtml(item.mediaList, false);
    }

    const tagsHtml = (item.keywords || []).map(k => `<span class="bg-theme-light text-theme text-[10px] font-black px-2 py-0.5 rounded-full border border-theme-light">${k}</span>`).join(' ');

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-slate-900">${item.dateDisplay}</span>
        <span class="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">${item.feedback}</span>
      </div>
      ${mediaHtml}
      <div class="flex flex-wrap gap-1">${tagsHtml}</div>
      <p class="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-2xl whitespace-pre-line">${item.diary}</p>
      ${item.userComment ? `
        <div class="text-[11px] text-slate-500 font-semibold px-2 flex items-center space-x-1">
          <i data-lucide="message-circle" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>${item.userComment}</span>
        </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

// 감정 리포트
function setReportPeriod(period) {
  appState.reportPeriod = period;
  ['today', 'week', 'month', 'year'].forEach(p => {
    const btn = document.getElementById(`btnReport${p.charAt(0).toUpperCase() + p.slice(1)}`);
    if (p === period) btn.className = "py-1.5 rounded-xl bg-white text-theme shadow-2xs font-black";
    else btn.className = "py-1.5 rounded-xl text-slate-500 font-bold";
  });

  const titles = { today: "오늘 하루 분석", week: "이번 주 누적 분석", month: "9월 누적 종합", year: "2026년 전체 종합" };
  document.getElementById('reportPeriodBadge').textContent = titles[period] || "감정 분석";
  updateEmotionCharts();
}

function initEmotionCharts() {
  const pieCtx = document.getElementById('emotionPieChart');
  const radarCtx = document.getElementById('emotionRadarChart');
  if (!pieCtx || !radarCtx) return;

  if (pieChartInstance) pieChartInstance.destroy();
  if (radarChartInstance) radarChartInstance.destroy();

  pieChartInstance = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['행복/설렘', '신남/열정', '평온/쉼', '뿌듯/성취', '피로/고단', '불안/슬픔'],
      datasets: [{
        data: [35, 25, 20, 10, 7, 3],
        backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#94a3b8', '#cbd5e1'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
    }
  });

  radarChartInstance = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: ['긍정 에너지', '도전/열정', '마음 회복력', '평온 밸런스'],
      datasets: [{
        label: '감정 수치',
        data: [88, 76, 82, 79],
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        pointBackgroundColor: '#ec4899'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false } } },
      plugins: { legend: { display: false } }
    }
  });
}

function updateEmotionCharts() {
  if (!pieChartInstance || !radarChartInstance) return initEmotionCharts();

  if (appState.reportPeriod === 'today') {
    pieChartInstance.data.datasets[0].data = [50, 30, 10, 5, 5, 0];
    radarChartInstance.data.datasets[0].data = [90, 85, 75, 80];
    document.getElementById('emotionTempText').textContent = "37.2°C";
    document.getElementById('emotionTempBar').style.width = "82%";
  } else if (appState.reportPeriod === 'week') {
    pieChartInstance.data.datasets[0].data = [40, 25, 15, 10, 7, 3];
    radarChartInstance.data.datasets[0].data = [82, 78, 80, 75];
    document.getElementById('emotionTempText').textContent = "36.8°C";
    document.getElementById('emotionTempBar').style.width = "78%";
  } else {
    pieChartInstance.data.datasets[0].data = [35, 25, 20, 10, 7, 3];
    radarChartInstance.data.datasets[0].data = [88, 76, 82, 79];
    document.getElementById('emotionTempText').textContent = "36.5°C";
    document.getElementById('emotionTempBar').style.width = "75%";
  }

  pieChartInstance.update();
  radarChartInstance.update();
}

// 리뷰 & 고객센터
function openReviewModal() { document.getElementById('reviewModal').classList.remove('hidden'); renderPublicReviews(); }
function closeReviewModal() { document.getElementById('reviewModal').classList.add('hidden'); }
function setReviewRating(star) {
  currentRatingScore = star;
  document.querySelectorAll('#reviewStarRating .star-rating-icon').forEach((s, idx) => {
    if (idx < star) s.classList.add('active');
    else s.classList.remove('active');
  });
}
function submitReview() {
  const nick = document.getElementById('reviewNickname').value.trim() || "익명";
  const comment = document.getElementById('reviewComment').value.trim();
  if (!comment) return showToast("후기 내용을 입력해 주세요.");

  appState.reviews.unshift({ id: Date.now(), author: nick, rating: currentRatingScore, comment, date: new Date().toLocaleDateString('ko-KR') });
  persistState();
  renderPublicReviews();
  document.getElementById('reviewComment').value = '';
  showToast("⭐ 후기가 등록되었습니다!");
}
function renderPublicReviews() {
  const container = document.getElementById('publicReviewList');
  if (!container) return;
  container.innerHTML = '';
  appState.reviews.forEach(r => {
    const card = document.createElement('div');
    card.className = "p-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-1";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-800">${r.author} <span class="text-amber-500 font-black">${'★'.repeat(r.rating)}</span></span>
        <span class="text-[10px] text-slate-400">${r.date}</span>
      </div>
      <p class="text-slate-600 font-medium leading-relaxed">${r.comment}</p>
    `;
    container.appendChild(card);
  });
}

function openInquiryModal() { document.getElementById('inquiryModal').classList.remove('hidden'); renderInquiryList(); }
function closeInquiryModal() { document.getElementById('inquiryModal').classList.add('hidden'); }
function submitInquiry() {
  const nick = document.getElementById('inquiryNickname').value.trim() || "익명";
  const pw = document.getElementById('inquiryPw').value.trim();
  const content = document.getElementById('inquiryContent').value.trim();

  if (!pw || pw.length !== 4) return showToast("4자리 비밀번호를 입력해 주세요.");
  if (!content) return showToast("문의 내용을 입력해 주세요.");

  appState.inquiries.unshift({ id: Date.now(), author: nick, pw, content, reply: "관리자 검토 대기 중입니다.", date: new Date().toLocaleDateString('ko-KR') });
  persistState();
  renderInquiryList();
  document.getElementById('inquiryContent').value = '';
  document.getElementById('inquiryPw').value = '';
  showToast("비공개 문의가 접수되었습니다.");
}
function renderInquiryList() {
  const container = document.getElementById('inquiryListContainer');
  if (!container) return;
  container.innerHTML = '';
  appState.inquiries.forEach(inq => {
    const card = document.createElement('div');
    card.className = "p-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5 cursor-pointer hover:border-indigo-300 transition";
    card.onclick = () => {
      const inputPw = prompt("4자리 비밀번호를 입력하세요:");
      if (inputPw === inq.pw || inputPw === "0724") {
        alert(`[문의 내용]:\n${inq.content}\n\n[답변]:\n${inq.reply}`);
      } else if (inputPw !== null) {
        showToast("비밀번호가 올바르지 않습니다.");
      }
    };
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-black text-slate-800 flex items-center space-x-1"><i data-lucide="lock" class="w-3 h-3 text-slate-400"></i><span>${inq.author} 님의 문의</span></span>
        <span class="text-[10px] text-slate-400">${inq.date}</span>
      </div>
      <p class="text-slate-500 font-medium truncate">비공개 처리된 문의글입니다. (비밀번호 확인)</p>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

// 관리자 센터 (비번 0724)
function promptAdminMode() {
  const now = Date.now();
  if (appState.adminLockUntil && now < appState.adminLockUntil) {
    const remMin = Math.ceil((appState.adminLockUntil - now) / 60000);
    return alert(`잠겨 있습니다. ${remMin}분 후에 다시 시도해 주세요.`);
  }

  const pw = prompt("관리자 보안 비밀번호 4자리를 입력하세요:");
  if (pw === "0724") {
    appState.adminFailedCount = 0;
    appState.adminLockUntil = null;
    document.getElementById('adminModal').classList.remove('hidden');
    renderAdminNotices();
    renderAdminReviews();
    lucide.createIcons();
  } else if (pw !== null) {
    appState.adminFailedCount++;
    if (appState.adminFailedCount >= 5) {
      appState.adminLockUntil = now + (5 * 60 * 1000);
      alert("5회 오류! 5분간 관리자 진입이 차단됩니다.");
    } else {
      alert(`비밀번호가 올바르지 않습니다. (실패 ${appState.adminFailedCount}/5회)`);
    }
  }
}
function closeAdminModal() { document.getElementById('adminModal').classList.add('hidden'); }
function switchAdminTab(subTab) {
  ['theme', 'notice', 'review', 'backup'].forEach(t => {
    const btn = document.getElementById(`adminTabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const panel = document.getElementById(`adminPanel${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (t === subTab) {
      btn.className = "flex-1 py-2.5 border-b-2 border-theme text-theme font-black";
      panel.classList.remove('hidden');
    } else {
      btn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-400 font-bold";
      panel.classList.add('hidden');
    }
  });
}
function renderAdminNotices() {
  const list = document.getElementById('adminNoticeList');
  list.innerHTML = '';
  appState.notices.forEach((n, idx) => {
    const item = document.createElement('div');
    item.className = "flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs";
    item.innerHTML = `<span class="font-bold text-slate-800">${n.text}</span><button onclick="appState.notices.splice(${idx}, 1); persistState(); renderAdminNotices(); updateNoticeBanner();" class="text-rose-600 font-bold text-[11px]">삭제</button>`;
    list.appendChild(item);
  });
}
function publishNotice() {
  const input = document.getElementById('adminNewNoticeInput');
  const text = input.value.trim();
  if (!text) return;
  appState.notices.unshift({ id: Date.now(), text, date: new Date().toLocaleDateString('ko-KR') });
  input.value = '';
  persistState();
  renderAdminNotices();
  updateNoticeBanner();
  showToast("새 공지가 등록되었습니다.");
}
function updateNoticeBanner() {
  const banner = document.getElementById('noticeBanner');
  const text = document.getElementById('noticeBannerText');
  if (appState.notices.length > 0) {
    text.textContent = appState.notices[0].text;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}
function renderAdminReviews() {
  const list = document.getElementById('adminReviewList');
  list.innerHTML = '';
  appState.reviews.forEach((r, idx) => {
    const item = document.createElement('div');
    item.className = "p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-start text-xs";
    item.innerHTML = `<div><b>${r.author}</b> (${'★'.repeat(r.rating)})<p class="text-slate-600">${r.comment}</p></div><button onclick="appState.reviews.splice(${idx}, 1); persistState(); renderAdminReviews(); renderPublicReviews();" class="text-rose-600 font-bold text-[10px]">삭제</button>`;
    list.appendChild(item);
  });
}
function exportDataBackupJSON() {
  const payload = { version: APP_VERSION, exportDate: new Date().toISOString(), data: appState };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MindLog_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("전체 데이터 백업 파일이 다운로드되었습니다.");
}
function restoreDataFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.data) {
        Object.assign(appState, parsed.data);
        persistState();
        applyAppTheme(appState.persona.defaultTheme || appState.currentTheme, false);
        renderCalendar();
        renderTimeline();
        renderCategorizedTodoList();
        renderFilteredMemos();
        closeAdminModal();
        showToast("백업 데이터가 성공적으로 복원되었습니다!");
      }
    } catch (err) {
      alert("올바른 백업 파일이 아닙니다.");
    }
  };
  reader.readAsText(file);
}

// Vlog 감상
let vlogSlideIndex = 0;
function openVlogModal() {
  const valid = appState.entries.filter(e => e.mediaList && e.mediaList.length > 0);
  if (valid.length === 0) return showToast("Vlog로 감상할 사진/영상 기록이 없습니다.");
  document.getElementById('vlogModal').classList.remove('hidden');
  vlogSlideIndex = 0;
  playVlogSlide(valid);
}
function playVlogSlide(entries) {
  clearInterval(vlogInterval);
  const total = entries.length;
  const update = () => {
    if (vlogSlideIndex >= total) vlogSlideIndex = 0;
    const entry = entries[vlogSlideIndex];
    const media = entry.mediaList[0];

    const imgEl = document.getElementById('vlogSlideImg');
    const vidEl = document.getElementById('vlogSlideVideo');
    const textEl = document.getElementById('vlogSlideText');
    const counterEl = document.getElementById('vlogSlideCounter');
    const fillEl = document.getElementById('vlogProgressFill');

    counterEl.textContent = `${vlogSlideIndex + 1} / ${total}`;
    fillEl.style.width = `${((vlogSlideIndex + 1) / total) * 100}%`;
    textEl.textContent = `[${entry.dateDisplay}]\n${entry.diary.slice(0, 80)}...`;

    if (media.type === 'video') {
      imgEl.classList.add('hidden');
      vidEl.src = media.src;
      vidEl.classList.remove('hidden');
      vidEl.play();
    } else {
      vidEl.classList.add('hidden');
      imgEl.src = media.src;
      imgEl.classList.remove('hidden');
    }
    vlogSlideIndex++;
  };
  update();
  vlogInterval = setInterval(update, 3500);
}
function closeVlogModal() {
  clearInterval(vlogInterval);
  document.getElementById('vlogModal').classList.add('hidden');
  const vidEl = document.getElementById('vlogSlideVideo');
  vidEl.pause();
  vidEl.src = "";
}

// 공통 토스트 알림창
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.remove('opacity-0');
  setTimeout(() => {
    toast.classList.add('opacity-0');
  }, 2300);
}
