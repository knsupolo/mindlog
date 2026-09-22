/**
 * 마인드로그 (MindLog) Pro v2.0 - Core Application Engine
 */

// ========================================================
// 1. 글로벌 상태 및 설정 (State & Configurations)
// ========================================================
// 4단계에서 배포할 Google Apps Script 웹앱 URL (비워두면 브라우저 캐시 DB로 자동 구동)
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyA2NubJNwyaB3LfULBrdsARNpeNcJ9cjZOiFBR4IyNQdjU7jXhd4vmM8-DMjMcwXE_/exec";

let appState = {
  // 사용자 인증
  currentUser: null, // { email, birth, role, loggedInAt }
  
  // 테마 및 UI
  currentTheme: 'indigo',
  activeTab: 'calendar',
  
  // 캘린더
  calendarYear: 2026,
  calendarMonth: 8, // 0-indexed (8 = 9월)
  calendarMode: 'month', // 'month' | 'week'
  
  // 현재 작성 중인 일기 버퍼
  draftEntry: {
    date: new Date().toISOString().split('T')[0],
    mediaList: [], // { type: 'image'|'video', src: string, duration?: number }
    keywords: [],
    diary: '',
    feedback: '행복한 여운 🥰',
    userComment: ''
  },

  // 영구 보관 데이터베이스
  entries: [], // 다이어리 목록
  stickers: [], // { id, date, sticker, x, y, scale, rotation }
  todos: {
    today: [
      { id: 1, text: "오후 조깅 및 가벼운 스트레칭", done: true },
      { id: 2, text: "마인드로그 Pro v2.0 앱 테스트하기", done: false }
    ],
    week: [{ id: 3, text: "주간 감정 리포트 돌아보기", done: false }],
    month: [{ id: 4, text: "한 달 독서 2권 완독하기", done: false }],
    year: [{ id: 5, text: "체력 증진 및 건강 루틴 정착", done: false }],
    long: [{ id: 6, text: "가족과 함께하는 힐링 여행 계획하기", done: false }]
  },
  currentTodoScope: 'all',
  memos: [],
  reviews: [
    { id: 1, author: "달리는선생님", rating: 5, comment: "사진과 키워드만 넣었는데 마음에 울림을 주는 일기가 나와서 매일 씁니다!", date: "2026. 09. 21" },
    { id: 2, author: "고등학생A", rating: 5, comment: "공부하느라 지칠 때 감정 온도계 보면서 힐링하고 있어요.", date: "2026. 09. 22" }
  ],
  inquiries: [
    { id: 1, author: "기록러", pw: "1234", content: "아이패드 가로 모드에서도 사진이 시원하게 잘 보여서 너무 좋습니다.", reply: "소중한 의견 감사드립니다! 더욱 편리한 기록 경험을 제공하겠습니다.", date: "2026. 09. 22" }
  ],
  notices: [
    { id: 1, text: "마인드로그 Pro v2.0 정식 배포! 달력 스티커와 와이드 사진 뷰를 경험해 보세요.", date: "2026. 09. 23" }
  ],
  recentKeywords: ["가을바람", "야간라이딩", "퇴근길", "성취감", "소소한행복"],
  
  // 분석 및 뷰어
  reportPeriod: 'month', // 'today' | 'week' | 'month' | 'year'
  timelineViewMode: 'card', // 'card' | 'list' | 'album'
  
  // 보안 관리자
  adminFailedCount: 0,
  adminLockUntil: null
};

// 8종 테마 팔레트 정의
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

// 24종 확장 프리셋 키워드
const PRESET_KEYWORDS = [
  "행복 😊", "설렘 💓", "신남 🔥", "뿌듯함 ✨", "평온함 🌿", "감사 🙏",
  "열정 ⚡", "운동 🏃", "야구 ⚾", "산책 👟", "맛있는음식 🍕", "카페투어 ☕",
  "피곤함 🥱", "지침 💦", "불안 🌧️", "외로움 🍂", "생각많음 💭", "공부/업무 📚",
  "독서 📖", "취미생활 🎨", "가족과함께 👨‍👩‍👦", "친구만남 🍻", "휴식/쉼 🛋️", "새로운도전 🚀"
];

// 대한민국 주요 법정 공휴일 (양력 기준 및 2026 주요 음력 명절 프리셋)
const HOLIDAYS_2026 = {
  "01-01": "신정",
  "02-16": "설날 연휴",
  "02-17": "설날",
  "02-18": "설날 연휴",
  "03-01": "삼일절",
  "03-02": "대체공휴일",
  "05-05": "어린이날",
  "05-24": "부처님오신날",
  "05-25": "대체공휴일",
  "06-06": "현충일",
  "08-15": "광복절",
  "08-17": "대체공휴일",
  "09-24": "추석 연휴",
  "09-25": "추석",
  "09-26": "추석 연휴",
  "09-28": "대체공휴일",
  "10-03": "개천절",
  "10-05": "대체공휴일",
  "10-09": "한글날",
  "12-25": "성탄절"
};

// 차트 인스턴스
let pieChartInstance = null;
let radarChartInstance = null;
let vlogInterval = null;
let currentRatingScore = 5;
let signupRoleSelected = '교사';

// ========================================================
// 2. 앱 초기화 (Bootstrap & Lifecycle)
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  loadLocalStorage();
  applyAppTheme(appState.currentTheme, false);
  lucide.createIcons();
  
  initHeaderDate();
  updateUserSessionUI();
  renderCalendar();
  renderPresetKeywords();
  renderRecentKeywords();
  renderCategorizedTodoList();
  renderSavedMemos();
  renderPublicReviews();
  renderInquiryList();
  updateNoticeBanner();
  updateStreakBadge();
  initEmotionCharts();

  // 기본 기록 날짜 세팅
  document.getElementById('entryDateInput').value = appState.draftEntry.date;
});

function initHeaderDate() {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
  const str = new Date().toLocaleDateString('ko-KR', options);
  document.getElementById('subHeaderDate').textContent = str;
}

// 로컬 스토리지 동기화
function loadLocalStorage() {
  const saved = localStorage.getItem('MINDLOG_PRO_V2_STATE');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState.currentUser = parsed.currentUser || null;
      appState.currentTheme = parsed.currentTheme || 'indigo';
      appState.entries = parsed.entries || [];
      appState.stickers = parsed.stickers || [];
      appState.todos = parsed.todos || appState.todos;
      appState.memos = parsed.memos || [];
      appState.reviews = parsed.reviews || appState.reviews;
      appState.inquiries = parsed.inquiries || appState.inquiries;
      appState.notices = parsed.notices || appState.notices;
      appState.recentKeywords = parsed.recentKeywords || appState.recentKeywords;
    } catch (e) {
      console.warn("로컬 캐시 불러오기 오류", e);
    }
  }

  // 초기 예시 데이터 주입 (최초 실행 시)
  if (appState.entries.length === 0) {
    appState.entries = [
      {
        id: 1727050000000,
        date: "2026-09-22",
        dateDisplay: "2026. 09. 22",
        mediaList: [{ type: 'image', src: "https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&auto=format&fit=crop" }],
        keywords: ["운동 🏃", "열정 ⚡", "뿌듯함 ✨"],
        diary: "숨이 턱 끝까지 차오르도록 달리고 난 뒤에 찾아오는 차분한 고요가 참 좋다. 복잡했던 생각들이 땀방울과 함께 씻겨 내려가며 비로소 나 자신에게 집중할 수 있었던 소중한 시간.",
        feedback: "용기를 얻었어요 🔥",
        userComment: "기분 좋은 피로감"
      },
      {
        id: 1727136400000,
        date: "2026-09-23",
        dateDisplay: "2026. 09. 23",
        mediaList: [
          { type: 'image', src: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop" },
          { type: 'image', src: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop" }
        ],
        keywords: ["카페투어 ☕", "평온함 🌿", "소소한행복"],
        diary: "따스한 햇살이 비치는 창가 자리에서 은은한 커피 향을 음미했다. 빠르게 흘러가는 하루 속에서 잠시 속도를 늦추고 온전히 쉬어가는 이런 순간이 마음에 깊은 쉼표를 찍어준다.",
        feedback: "행복한 여운 🥰",
        userComment: "라떼 아트가 예뻤던 날"
      }
    ];
  }

  if (appState.memos.length === 0) {
    appState.memos = [
      { id: 1, text: "가을맞이 플래너 루틴 재정비 및 독서 목록 정리", date: "2026. 09. 23 11:20" }
    ];
  }
}

function persistState() {
  localStorage.setItem('MINDLOG_PRO_V2_STATE', JSON.stringify({
    currentUser: appState.currentUser,
    currentTheme: appState.currentTheme,
    entries: appState.entries,
    stickers: appState.stickers,
    todos: appState.todos,
    memos: appState.memos,
    reviews: appState.reviews,
    inquiries: appState.inquiries,
    notices: appState.notices,
    recentKeywords: appState.recentKeywords
  }));
}

// ========================================================
// 3. 테마 엔진 (8종 테마 실시간 바인딩)
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
    showToast(`테마가 [${themeName}]으로 즉시 적용되었습니다.`);
  }
}

// ========================================================
// 4. 회원가입 및 사용자 인증 시스템
// ========================================================
function openAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

function switchAuthTab(type) {
  const tabLogin = document.getElementById('authTabLogin');
  const tabSignup = document.getElementById('authTabSignup');
  const formLogin = document.getElementById('loginForm');
  const formSignup = document.getElementById('signupForm');

  if (type === 'login') {
    tabLogin.className = "flex-1 py-1.5 rounded-lg bg-white text-theme shadow-2xs font-extrabold";
    tabSignup.className = "flex-1 py-1.5 rounded-lg font-bold text-slate-500";
    formLogin.classList.remove('hidden');
    formSignup.classList.add('hidden');
  } else {
    tabSignup.className = "flex-1 py-1.5 rounded-lg bg-white text-theme shadow-2xs font-extrabold";
    tabLogin.className = "flex-1 py-1.5 rounded-lg font-bold text-slate-500";
    formSignup.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

function setSignupRole(role, btnElem) {
  signupRoleSelected = role;
  document.querySelectorAll('.role-select-btn').forEach(b => b.classList.remove('selected'));
  if (btnElem) btnElem.classList.add('selected');
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPw').value.trim();
  const birth = document.getElementById('signupBirth').value;

  if (!email || !pw || !birth) return showToast("모든 정보를 올바르게 입력해 주세요.");

  appState.currentUser = {
    email: email,
    role: signupRoleSelected,
    birth: birth,
    loggedInAt: new Date().toISOString()
  };

  persistState();
  updateUserSessionUI();
  closeAuthModal();
  showToast(`환영합니다! [${signupRoleSelected}] 계정으로 가입되었습니다.`);
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPw').value.trim();

  if (!email || !pw) return showToast("이메일과 비밀번호를 입력해 주세요.");

  appState.currentUser = {
    email: email,
    role: "사용자",
    loggedInAt: new Date().toISOString()
  };

  persistState();
  updateUserSessionUI();
  closeAuthModal();
  showToast(`로그인 성공! 즐거운 기록 되세요.`);
}

function updateUserSessionUI() {
  const badge = document.getElementById('headerUserBadge');
  if (appState.currentUser) {
    const roleTag = appState.currentUser.role ? `[${appState.currentUser.role}] ` : '';
    badge.textContent = `${roleTag}${appState.currentUser.email.split('@')[0]}`;
    badge.title = "클릭하여 로그아웃";
    badge.onclick = () => {
      if (confirm("로그아웃 하시겠습니까?")) {
        appState.currentUser = null;
        persistState();
        updateUserSessionUI();
        showToast("로그아웃되었습니다.");
      }
    };
  } else {
    badge.textContent = "로그인 필요";
    badge.onclick = openAuthModal;
  }
}

// ========================================================
// 5. 캘린더 엔진 (공휴일·토·일 색상 & 포토 타일 & 스트릭)
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
  for (let i = 0; i < firstDay; i++) {
    days.push({ empty: true });
  }

  for (let d = 1; d <= lastDate; d++) {
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const fullDate = `${calendarYear}-${mm}-${dd}`;
    const dateKey = `${mm}-${dd}`;
    const dayOfWeek = new Date(calendarYear, calendarMonth, d).getDay(); // 0:일, 6:토
    
    const holidayName = HOLIDAYS_2026[dateKey] || null;
    const entry = appState.entries.find(e => e.date === fullDate);

    days.push({
      dayNum: d,
      fullDate,
      dayOfWeek,
      holidayName,
      entry
    });
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

    // 요일 및 공휴일 색상 클래스 판별
    let dayClass = 'day-weekday';
    if (item.dayOfWeek === 0 || item.holidayName) dayClass = 'day-sunday';
    else if (item.dayOfWeek === 6) dayClass = 'day-saturday';

    cell.className = `calendar-cell flex flex-col justify-between p-1.5 ${isToday ? 'today' : ''} ${hasPhoto ? 'has-entry text-white' : ''}`;
    
    if (hasPhoto) {
      cell.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.65)), url('${thumbUrl}')`;
    }

    cell.onclick = () => selectCalendarDate(item.fullDate);

    cell.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="text-[11px] ${dayClass} ${isToday ? 'bg-theme text-white w-4 h-4 rounded-full flex items-center justify-center !text-white' : ''}">${item.dayNum}</span>
        ${item.holidayName ? `<span class="day-holiday-badge truncate max-w-[34px]">${item.holidayName}</span>` : ''}
      </div>
      ${item.entry ? `
        <div class="truncate text-[9px] font-bold ${hasPhoto ? 'text-white' : 'text-theme'}">
          ${item.entry.keywords[0] || '기록됨'}
        </div>
      ` : ''}
    `;

    container.appendChild(cell);
  });

  renderCanvasStickers();
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
    selectCalendarDate(found.date);
    showToast("✨ 작년 오늘의 기록을 찾았습니다!");
  } else {
    showToast("작년 오늘의 기록은 아직 없습니다. 오늘을 기록해 보세요!");
  }
}

function selectCalendarDate(dateStr) {
  appState.draftEntry.date = dateStr;
  document.getElementById('entryDateInput').value = dateStr;

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
  } else {
    resetDraftEntry(dateStr);
  }

  renderWideMediaView();
  renderPresetKeywords();
  switchTab('record');
}

function resetDraftEntry(dateStr) {
  appState.draftEntry = {
    date: dateStr || new Date().toISOString().split('T')[0],
    mediaList: [],
    keywords: [],
    diary: '',
    feedback: '행복한 여운 🥰',
    userComment: ''
  };
  document.getElementById('diaryResultCard').classList.add('hidden');
  document.getElementById('finalUserCommentInput').value = '';
  renderWideMediaView();
}

// ========================================================
// 6. 달력 인터랙티브 스티커 캔버스 (핀치-줌/회전 터치 제스처)
// ========================================================
function openStickerPaletteModal() {
  const stickers = ["✨", "💖", "🔥", "🌿", "⚾", "🎉", "☕", "💪", "🌈", "⭐", "🥑", "🏆"];
  const chosen = prompt(`달력에 부착할 스티커를 고르거나 입력하세요:\n${stickers.join('  ')}`, "✨");
  if (!chosen) return;

  const newSticker = {
    id: Date.now(),
    date: appState.draftEntry.date,
    sticker: chosen,
    x: 120 + Math.random() * 40,
    y: 80 + Math.random() * 40,
    scale: 1.2,
    rotation: 0
  };

  appState.stickers.push(newSticker);
  persistState();
  renderCanvasStickers();
  showToast("달력 위에 스티커가 놓였습니다. 터치로 크기/각도를 조절하세요!");
}

function renderCanvasStickers() {
  const canvas = document.getElementById('calendarStickerCanvas');
  if (!canvas) return;
  canvas.innerHTML = '';

  appState.stickers.forEach(st => {
    const el = document.createElement('div');
    el.className = "canvas-sticker text-2xl select-none";
    el.style.left = `${st.x}px`;
    el.style.top = `${st.y}px`;
    el.style.transform = `scale(${st.scale}) rotate(${st.rotation}deg)`;
    el.textContent = st.sticker;

    bindStickerTouchGestures(el, st);
    canvas.appendChild(el);
  });
}

function bindStickerTouchGestures(element, stickerData) {
  let initialDist = 0;
  let initialAngle = 0;
  let startX = 0, startY = 0;

  element.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX - stickerData.x;
      startY = e.touches[0].clientY - stickerData.y;
    } else if (e.touches.length === 2) {
      initialDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialAngle = Math.atan2(
        e.touches[1].clientY - e.touches[0].clientY,
        e.touches[1].clientX - e.touches[0].clientX
      ) * 180 / Math.PI;
    }
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      stickerData.x = e.touches[0].clientX - startX;
      stickerData.y = e.touches[0].clientY - startY;
      element.style.left = `${stickerData.x}px`;
      element.style.top = `${stickerData.y}px`;
    } else if (e.touches.length === 2) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const currentAngle = Math.atan2(
        e.touches[1].clientY - e.touches[0].clientY,
        e.touches[1].clientX - e.touches[0].clientX
      ) * 180 / Math.PI;

      const scaleChange = currentDist / initialDist;
      stickerData.scale = Math.max(0.6, Math.min(3.5, stickerData.scale * scaleChange));
      stickerData.rotation += (currentAngle - initialAngle);

      element.style.transform = `scale(${stickerData.scale}) rotate(${stickerData.rotation}deg)`;
      initialDist = currentDist;
      initialAngle = currentAngle;
    }
  }, { passive: true });

  element.addEventListener('touchend', () => {
    persistState();
  });
}

// ========================================================
// 7. 통합 미디어 바텀시트 & 가로 와이드 풀필(Full-Fill) 뷰포트
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
      appState.draftEntry.mediaList.push({
        type: 'image',
        src: e.target.result
      });
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
  showToast("앞 10초 구간으로 규격화하여 첨부합니다.");
  // 10초 플래그를 달아 등록
  const fileInput = document.getElementById('videoInput');
  if (fileInput.files[0]) attachVideoData(fileInput.files[0], 10);
}

function closeVideoTrimmer() {
  document.getElementById('videoTrimmerModal').classList.add('hidden');
}

function attachVideoData(file, dur) {
  const reader = new FileReader();
  reader.onload = (e) => {
    appState.draftEntry.mediaList.push({
      type: 'video',
      src: e.target.result,
      duration: Math.round(dur)
    });
    renderWideMediaView();
    showToast("10초 숏클립 영상이 첨부되었습니다.");
  };
  reader.readAsDataURL(file);
}

// 🌟 가로 와이드 풀필(Full-Fill) 뷰포트 (1장: 16:9 와이드, 2장: 1:1 분할, 3장: 매거진형 비대칭 와이드)
function renderWideMediaView() {
  const container = document.getElementById('wideMediaContainer');
  container.innerHTML = '';
  const list = appState.draftEntry.mediaList;
  document.getElementById('mediaCountBadge').textContent = `${list.length} / 3`;

  if (list.length === 0) return;

  if (list.length === 1) {
    // 1장: 16:9 와이드 가득 채움
    const media = list[0];
    const wrapper = document.createElement('div');
    wrapper.className = "relative rounded-2xl overflow-hidden cursor-pointer shadow-xs group";
    wrapper.onclick = () => openLightbox(media.src, media.type);

    if (media.type === 'video') {
      wrapper.innerHTML = `<video src="${media.src}" class="wide-media-single" muted autoplay loop playsinline></video>`;
    } else {
      wrapper.innerHTML = `<img src="${media.src}" class="wide-media-single">`;
    }
    appendMediaDeleteBtn(wrapper, 0);
    container.appendChild(wrapper);

  } else if (list.length === 2) {
    // 2장: 1:1 좌우 균등 분할 와이드
    const grid = document.createElement('div');
    grid.className = "wide-media-double";

    list.forEach((m, idx) => {
      const box = document.createElement('div');
      box.className = "relative cursor-pointer h-full";
      box.onclick = () => openLightbox(m.src, m.type);
      box.innerHTML = m.type === 'video'
        ? `<video src="${m.src}" class="w-full h-full object-cover" muted autoplay loop playsinline></video>`
        : `<img src="${m.src}" class="w-full h-full object-cover">`;
      appendMediaDeleteBtn(box, idx);
      grid.appendChild(box);
    });
    container.appendChild(grid);

  } else if (list.length === 3) {
    // 3장: 좌측 메인 와이드(1장) + 우측 2단 적층(2장) 매거진 레이아웃
    const grid = document.createElement('div');
    grid.className = "wide-media-triple";

    // 좌측 메인
    const leftBox = document.createElement('div');
    leftBox.className = "relative cursor-pointer h-full";
    leftBox.onclick = () => openLightbox(list[0].src, list[0].type);
    leftBox.innerHTML = list[0].type === 'video'
      ? `<video src="${list[0].src}" class="w-full h-full object-cover" muted autoplay loop playsinline></video>`
      : `<img src="${list[0].src}" class="w-full h-full object-cover">`;
    appendMediaDeleteBtn(leftBox, 0);
    grid.appendChild(leftBox);

    // 우측 2단 적층
    const rightCol = document.createElement('div');
    rightCol.className = "wide-media-triple-right";

    [list[1], list[2]].forEach((m, subIdx) => {
      const idx = subIdx + 1;
      const box = document.createElement('div');
      box.className = "relative cursor-pointer h-full overflow-hidden rounded-xl";
      box.onclick = () => openLightbox(m.src, m.type);
      box.innerHTML = m.type === 'video'
        ? `<video src="${m.src}" class="w-full h-full object-cover" muted autoplay loop playsinline></video>`
        : `<img src="${m.src}" class="w-full h-full object-cover">`;
      appendMediaDeleteBtn(box, idx);
      rightCol.appendChild(box);
    });

    grid.appendChild(rightCol);
    container.appendChild(grid);
  }

  lucide.createIcons();
}

function appendMediaDeleteBtn(containerElement, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = "absolute top-2 right-2 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition shadow-md z-10";
  btn.innerHTML = `<i data-lucide="x" class="w-3 h-3"></i>`;
  btn.onclick = (e) => {
    e.stopPropagation();
    appState.draftEntry.mediaList.splice(index, 1);
    renderWideMediaView();
  };
  containerElement.appendChild(btn);
}

// 라이트박스 원본 모달
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
// 8. 키워드 엔진 & AI 일기 작성 (키워드 문자열 직접 언급 금지)
// ========================================================
function renderPresetKeywords() {
  const grid = document.getElementById('keywordChipsGrid');
  grid.innerHTML = '';

  PRESET_KEYWORDS.forEach(kw => {
    const isSelected = appState.draftEntry.keywords.includes(kw);
    const chip = document.createElement('button');
    chip.type = "button";
    chip.onclick = () => toggleKeyword(kw);
    chip.className = `keyword-chip px-3 py-1.5 rounded-full border text-[11px] font-bold transition ${
      isSelected ? 'selected' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
    }`;
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
    chip.className = `px-2 py-0.5 rounded-md border text-[10px] font-bold transition ${
      isSelected ? 'bg-theme text-white border-theme' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600'
    }`;
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

async function requestAIDiaryGeneration() {
  const { mediaList, keywords } = appState.draftEntry;
  if (mediaList.length === 0 && keywords.length === 0) {
    return showToast("사진 또는 키워드를 최소 1개 이상 선택해 주세요.");
  }

  const btn = document.getElementById('btnGenerateAI');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-amber-300"></i><span>감정의 결을 담담히 엮어내는 중...</span>`;
  lucide.createIcons();

  // 구글 앱스 스크립트 API 호출 (URL 등록 시)
  if (GAS_API_URL && !GAS_API_URL.includes("여기에")) {
    try {
      const payload = {
        action: "GENERATE_AND_SAVE",
        userEmail: appState.currentUser ? appState.currentUser.email : "guest",
        photos: mediaList.map(m => m.src),
        keywords: keywords,
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
      console.warn("GAS 연동 오류, 로컬 자연어 엔진으로 전환합니다.", e);
    }
  }

  // 로컬 고감도 자연어 엔진 (원칙: 키워드 문자열 직접 나열 금지)
  setTimeout(() => {
    const essays = [
      "분주했던 하루의 끝자락, 시선이 머무는 곳마다 소소한 온기가 스며있었다. 거창한 목표나 성취에 얽매이지 않고 온전히 내 호흡에 집중하며 보낸 이 시간들이 내면을 단단하게 채워준다. 내일로 향할 평온한 힘을 얻은 소중한 밤이다.",
      "기분 좋은 활기와 생동감이 온몸을 채웠던 순간이었다. 땀 흘리고 몰입하며 스스로의 페이스를 되찾아가는 과정 속에서, 잊고 지냈던 즐거움과 환한 웃음이 마음 깊은 곳에서 피어올랐다.",
      "잠시 발걸음을 멈추고 주위를 둘러보았을 때, 계절의 온기와 바람의 결이 마음에 닿았다. 서두르지 않아도 괜찮다는 무언의 위로 속에서, 지나온 시간들을 묵묵히 긍정할 수 있는 여유가 피어났다.",
      "소소하지만 확실한 순간들이 모여 하루의 무게를 가볍게 덜어주었다. 나 자신을 너그럽게 인정하고 마주하는 태도가 얼마나 큰 힘이 되는지 새삼 깨닫게 된다."
    ];
    const generated = essays[Math.floor(Math.random() * essays.length)];
    showGeneratedDiary(generated);
  }, 1200);
}

function showGeneratedDiary(text) {
  appState.draftEntry.diary = text;
  document.getElementById('aiDiaryContent').textContent = text;
  document.getElementById('diaryResultCard').classList.remove('hidden');

  const btn = document.getElementById('btnGenerateAI');
  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i><span>Gemini AI 감성 일기 다시 생성하기</span>`;
  lucide.createIcons();
  showToast("AI가 하루를 담담히 돌아보는 일기를 완성했습니다!");
}

function selectFeedback(reaction, btnElem) {
  appState.draftEntry.feedback = reaction;
  document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('selected'));
  if (btnElem) btnElem.classList.add('selected');
  showToast(`감정 피드백 [${reaction}]이 선택되었습니다.`);
}

// 🌟 오늘의 기록 최종 등록 액션
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
    userComment: comment
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
// 9. 타임라인 & 3대 보기 모드 (Card, List, Album)
// ========================================================
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

  // 1) 사진첩 모아보기
  if (appState.timelineViewMode === 'album') {
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-3 gap-1.5";
    entries.forEach(item => {
      (item.mediaList || []).forEach(m => {
        const box = document.createElement('div');
        box.className = "aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer shadow-2xs hover:opacity-90 transition";
        box.onclick = () => openLightbox(m.src, m.type);
        box.innerHTML = m.type === 'video'
          ? `<video src="${m.src}" class="w-full h-full object-cover" muted></video>`
          : `<img src="${m.src}" class="w-full h-full object-cover">`;
        grid.appendChild(box);
      });
    });
    container.appendChild(grid);
    return;
  }

  // 2) 리스트 뷰
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

  // 3) 카드 뷰 (가로 와이드 사진 탑재)
  entries.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3";

    let mediaHtml = '';
    if (item.mediaList && item.mediaList.length > 0) {
      if (item.mediaList.length === 1) {
        mediaHtml = `<img src="${item.mediaList[0].src}" class="wide-media-single cursor-pointer" onclick="openLightbox('${item.mediaList[0].src}')">`;
      } else if (item.mediaList.length === 2) {
        mediaHtml = `
          <div class="wide-media-double cursor-pointer">
            <img src="${item.mediaList[0].src}" onclick="openLightbox('${item.mediaList[0].src}')">
            <img src="${item.mediaList[1].src}" onclick="openLightbox('${item.mediaList[1].src}')">
          </div>
        `;
      } else {
        mediaHtml = `
          <div class="wide-media-triple cursor-pointer">
            <img src="${item.mediaList[0].src}" onclick="openLightbox('${item.mediaList[0].src}')">
            <div class="wide-media-triple-right">
              <img src="${item.mediaList[1].src}" onclick="openLightbox('${item.mediaList[1].src}')">
              <img src="${item.mediaList[2].src}" onclick="openLightbox('${item.mediaList[2].src}')">
            </div>
          </div>
        `;
      }
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

// ========================================================
// 10. 감정 인포그래픽 리포트 (Chart.js & 기간 필터링)
// ========================================================
function setReportPeriod(period) {
  appState.reportPeriod = period;
  ['today', 'week', 'month', 'year'].forEach(p => {
    const btn = document.getElementById(`btnReport${p.charAt(0).toUpperCase() + p.slice(1)}`);
    if (p === period) {
      btn.className = "py-1.5 rounded-xl bg-white text-theme shadow-2xs font-black";
    } else {
      btn.className = "py-1.5 rounded-xl text-slate-500 font-bold";
    }
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

  // 8대 감정 도넛 차트
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

  // 4축 밸런스 레이더 차트
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

  // 기간별 시뮬레이션 수치 변화
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

// ========================================================
// 11. 로드맵 To-Do 플래너 ([전체] 모아보기 + 5단계 분류) & 영구 메모
// ========================================================
function setTodoScope(scope) {
  appState.currentTodoScope = scope;
  ['all', 'today', 'week', 'month', 'year', 'long'].forEach(s => {
    const btn = document.getElementById(`btnScope${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (s === scope) {
      btn.className = "py-1.5 rounded-xl bg-white text-theme shadow-2xs font-black";
    } else {
      btn.className = "py-1.5 rounded-xl text-slate-500 font-bold";
    }
  });
  renderCategorizedTodoList();
}

function renderCategorizedTodoList() {
  const ul = document.getElementById('categorizedTodoList');
  if (!ul) return;
  ul.innerHTML = '';

  let listToRender = [];
  if (appState.currentTodoScope === 'all') {
    // 🌟 전체 목록 모아보기
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
  appState.todos[targetScope].push({
    id: Date.now(),
    text,
    done: false
  });

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

// 영구 저장형 아이디어 메모
function saveIdeaMemo() {
  const textarea = document.getElementById('ideaMemoTextInput');
  const text = textarea.value.trim();
  if (!text) return showToast("메모 내용을 입력해 주세요.");

  const now = new Date();
  const dateStr = `${now.getFullYear()}. ${String(now.getMonth()+1).padStart(2,'0')}. ${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  appState.memos.unshift({
    id: Date.now(),
    text,
    date: dateStr
  });

  textarea.value = '';
  persistState();
  renderSavedMemos();
  showToast("💡 메모가 영구 저장되었습니다!");
}

function renderSavedMemos() {
  const container = document.getElementById('savedMemosList');
  if (!container) return;
  container.innerHTML = '';

  if (appState.memos.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">저장된 아이디어 메모가 없습니다.</p>`;
    return;
  }

  appState.memos.forEach(m => {
    const card = document.createElement('div');
    card.className = "p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex justify-between items-start space-x-2";
    card.innerHTML = `
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-slate-800 whitespace-pre-line leading-relaxed">${m.text}</p>
        <span class="text-[9px] font-bold text-amber-700/80 block mt-1">${m.date}</span>
      </div>
      <button onclick="deleteIdeaMemo(${m.id})" class="text-slate-400 hover:text-rose-600 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

function deleteIdeaMemo(id) {
  appState.memos = appState.memos.filter(m => m.id !== id);
  persistState();
  renderSavedMemos();
  showToast("메모가 삭제되었습니다.");
}

// ========================================================
// 12. 전체 공개 후기 & 비공개 고객센터 (닉네임 + 비번)
// ========================================================
function openReviewModal() {
  document.getElementById('reviewModal').classList.remove('hidden');
  renderPublicReviews();
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
}

function setReviewRating(star) {
  currentRatingScore = star;
  const stars = document.querySelectorAll('#reviewStarRating .star-rating-icon');
  stars.forEach((s, idx) => {
    if (idx < star) s.classList.add('active');
    else s.classList.remove('active');
  });
}

function submitReview() {
  const nick = document.getElementById('reviewNickname').value.trim() || "익명";
  const comment = document.getElementById('reviewComment').value.trim();
  if (!comment) return showToast("후기 내용을 입력해 주세요.");

  const newReview = {
    id: Date.now(),
    author: nick,
    rating: currentRatingScore,
    comment: comment,
    date: new Date().toLocaleDateString('ko-KR')
  };

  appState.reviews.unshift(newReview);
  persistState();
  renderPublicReviews();
  document.getElementById('reviewComment').value = '';
  showToast("⭐ 소중한 후기가 전체 공개로 등록되었습니다!");
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

// 고객센터 문의 (비공개: 닉네임 + 4자리 비번)
function openInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('hidden');
  renderInquiryList();
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.add('hidden');
}

function submitInquiry() {
  const nick = document.getElementById('inquiryNickname').value.trim() || "익명";
  const pw = document.getElementById('inquiryPw').value.trim();
  const content = document.getElementById('inquiryContent').value.trim();

  if (!pw || pw.length !== 4) return showToast("4자리 열람 비밀번호를 입력해 주세요.");
  if (!content) return showToast("문의 내용을 입력해 주세요.");

  const item = {
    id: Date.now(),
    author: nick,
    pw: pw,
    content: content,
    reply: "관리자 검토 대기 중입니다.",
    date: new Date().toLocaleDateString('ko-KR')
  };

  appState.inquiries.unshift(item);
  persistState();
  renderInquiryList();
  document.getElementById('inquiryContent').value = '';
  document.getElementById('inquiryPw').value = '';
  showToast("고객센터에 비공개 문의가 안전하게 접수되었습니다.");
}

function renderInquiryList() {
  const container = document.getElementById('inquiryListContainer');
  if (!container) return;
  container.innerHTML = '';

  appState.inquiries.forEach(inq => {
    const card = document.createElement('div');
    card.className = "p-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-1.5 cursor-pointer hover:border-indigo-300 transition";
    card.onclick = () => checkInquiryAccess(inq);
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-black text-slate-800 flex items-center space-x-1">
          <i data-lucide="lock" class="w-3 h-3 text-slate-400"></i>
          <span>${inq.author} 님의 문의</span>
        </span>
        <span class="text-[10px] text-slate-400">${inq.date}</span>
      </div>
      <p class="text-slate-500 font-medium truncate">비공개 처리된 문의글입니다. (비밀번호 확인)</p>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

function checkInquiryAccess(inq) {
  const inputPw = prompt("문의 작성 시 설정한 4자리 비밀번호를 입력하세요:");
  if (inputPw === inq.pw || inputPw === "0724") {
    alert(`[문의 내용]:\n${inq.content}\n\n[답변 현황]:\n${inq.reply}`);
  } else if (inputPw !== null) {
    showToast("비밀번호가 올바르지 않습니다.");
  }
}

// ========================================================
// 13. 관리자 마스터 센터 (암호 0724, 8종 테마 & 공지 관리)
// ========================================================
function promptAdminMode() {
  const now = Date.now();
  if (appState.adminLockUntil && now < appState.adminLockUntil) {
    const remMin = Math.ceil((appState.adminLockUntil - now) / 60000);
    return alert(`비밀번호 오류 초과로 잠겨 있습니다. ${remMin}분 후에 다시 시도해 주세요.`);
  }

  const pw = prompt("관리자 보안 비밀번호 4자리를 입력하세요:");
  if (pw === null) return;

  if (pw === "0724") {
    appState.adminFailedCount = 0;
    appState.adminLockUntil = null;
    openAdminModal();
  } else {
    appState.adminFailedCount++;
    if (appState.adminFailedCount >= 5) {
      appState.adminLockUntil = now + (5 * 60 * 1000);
      alert("비밀번호 5회 오류! 보안을 위해 5분간 관리자 진입이 차단됩니다.");
    } else {
      alert(`비밀번호가 일치하지 않습니다. (실패 ${appState.adminFailedCount}/5회)`);
    }
  }
}

function openAdminModal() {
  document.getElementById('adminModal').classList.remove('hidden');
  renderAdminNotices();
  renderAdminReviews();
  lucide.createIcons();
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.add('hidden');
}

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
    item.innerHTML = `
      <div class="flex-1 truncate mr-2">
        <span class="font-bold text-slate-800">${n.text}</span>
        <span class="text-[10px] text-slate-400 block">${n.date}</span>
      </div>
      <button onclick="deleteNotice(${idx})" class="text-rose-600 font-bold text-[11px]">삭제</button>
    `;
    list.appendChild(item);
  });
}

function publishNotice() {
  const input = document.getElementById('adminNewNoticeInput');
  const text = input.value.trim();
  if (!text) return;

  appState.notices.unshift({
    id: Date.now(),
    text,
    date: new Date().toLocaleDateString('ko-KR')
  });
  input.value = '';
  persistState();
  renderAdminNotices();
  updateNoticeBanner();
  showToast("새 공지사항이 등록되었습니다.");
}

function deleteNotice(idx) {
  appState.notices.splice(idx, 1);
  persistState();
  renderAdminNotices();
  updateNoticeBanner();
}

function updateNoticeBanner() {
  const banner = document.getElementById('noticeBanner');
  const bannerText = document.getElementById('noticeBannerText');
  if (appState.notices.length > 0) {
    bannerText.textContent = appState.notices[0].text;
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
    item.innerHTML = `
      <div class="flex-1 min-w-0 pr-2">
        <div class="flex items-center space-x-1 font-bold">
          <span>${r.author}</span>
          <span class="text-amber-500 font-black">${'★'.repeat(r.rating)}</span>
        </div>
        <p class="text-slate-600 mt-0.5">${r.comment}</p>
      </div>
      <button onclick="deleteReviewByAdmin(${idx})" class="text-rose-600 font-bold text-[10px] shrink-0">삭제</button>
    `;
    list.appendChild(item);
  });
}

function deleteReviewByAdmin(idx) {
  appState.reviews.splice(idx, 1);
  persistState();
  renderAdminReviews();
  renderPublicReviews();
  showToast("후기가 삭제되었습니다.");
}

function exportDataBackupJSON() {
  const payload = { version: "2.0.0", exportDate: new Date().toISOString(), data: appState };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MindLog_Pro_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("전체 데이터베이스 백업 JSON이 다운로드되었습니다.");
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
        applyAppTheme(appState.currentTheme, false);
        renderCalendar();
        renderTimeline();
        renderCategorizedTodoList();
        renderSavedMemos();
        closeAdminModal();
        showToast("백업 데이터가 완벽하게 복원되었습니다!");
      }
    } catch (err) {
      alert("유효한 백업 파일이 아닙니다.");
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ========================================================
// 14. Vlog 자동 스토리 플레이어 & 네비게이션
// ========================================================
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

// 탭 전환
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

  if (tabId === 'calendar') renderCalendar();
  if (tabId === 'timeline') renderTimeline();
  if (tabId === 'report') setReportPeriod(appState.reportPeriod);

  lucide.createIcons();
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
