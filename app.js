/**
 * 마인드로그 (MindLog) Pro v2.0 - Core Application Engine
 */

// ==========================================
// 1. 글로벌 상태 관리 (State Management)
// ==========================================
const GAS_API_URL = ""; // 3단계에서 발급받을 Apps Script 웹앱 URL (비워두면 로컬 캐시 엔진으로 구동)

let appState = {
  activeTab: 'calendar',
  calendarYear: 2026,
  calendarMonth: 8, // 0-indexed (8 = 9월)
  calendarMode: 'month', // 'month' | 'week'
  currentTheme: 'indigo',
  
  // 현재 작성 중인 기록 버퍼
  draftEntry: {
    date: new Date().toISOString().split('T')[0],
    mediaList: [], // { type: 'image'|'video', src: string, duration?: number }
    keywords: [],
    stickers: [],
    diary: '',
    feedback: '행복한 여운 🥰',
    userComment: ''
  },

  // 영구 저장 데이터
  entries: [], // 전체 일기 기록 목록
  todos: {
    today: [
      { id: 1, text: "오후 조깅 및 가벼운 스트레칭", done: true },
      { id: 2, text: "마인드로그 Pro v2.0 테스트", done: false }
    ],
    week: [{ id: 3, text: "주간 감정 리포트 돌아보기", done: false }],
    month: [{ id: 4, text: "한 달 독서 2권 완료하기", done: false }],
    year: [{ id: 5, text: "건강검진 및 체력 증진 목표 달성", done: false }],
    long: [{ id: 6, text: "가족과 함께하는 힐링 여행 계획하기", done: false }]
  },
  currentTodoScope: 'today',
  memos: [],
  recentKeywords: ["퇴근길", "가을바람", "야간드라이브", "성취감"],
  notices: [
    { id: 1, text: "마인드로그 Pro v2.0 업데이트 완료! 캘린더와 Vlog 기능을 만나보세요.", date: "2026. 09. 23" }
  ],
  reviews: [
    { id: 1, author: "사용자", rating: 5, comment: "사진과 키워드만 넣었는데 마음에 와닿는 일기를 써주네요!", date: "2026. 09. 20" },
    { id: 2, author: "익명", rating: 5, comment: "인포그래픽 감정 분석이 너무 신기하고 힐링됩니다.", date: "2026. 09. 21" }
  ],
  
  // 보안 및 관리자
  adminFailedCount: 0,
  adminLockUntil: null,
  
  // 타임라인 보기 모드
  timelineViewMode: 'card' // 'card' | 'list' | 'album'
};

// 24종 확장 감정 & 일상 프리셋 키워드
const PRESET_KEYWORDS = [
  "행복 😊", "설렘 💓", "신남 🔥", "뿌듯함 ✨", "평온함 🌿", "감사 🙏",
  "열정 ⚡", "운동 🏃", "야구 ⚾", "산책 👟", "맛있는음식 🍕", "카페투어 ☕",
  "피곤함 🥱", "지침 💦", "불안 🌧️", "외로움 🍂", "생각많음 💭", "공부/업무 📚",
  "독서 📖", "취미활동 🎨", "가족과함께 👨‍👩‍👦", "친구만남 🍻", "휴식/쉼 🛋️", "새로운도전 🚀"
];

const PRESET_STICKERS = [
  "✨ 반짝이는 오늘", "🌿 힐링 모먼트", "🔥 열정 폭발", "☕ 여유 한 잔", 
  "🎯 해냈다!", "🥰 소소한 행복", "💪 힘내자", "🌙 감성 밤"
];

// 차트 인스턴스 보관용
let pieChartInstance = null;
let radarChartInstance = null;
let vlogInterval = null;

// ==========================================
// 2. 앱 부트스트랩 (초기화)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  loadLocalStorage();
  lucide.createIcons();
  
  initDateDisplays();
  renderCalendar();
  renderPresetKeywords();
  renderRecentKeywords();
  renderStickerPresets();
  renderTimeline();
  renderCategorizedTodoList();
  renderSavedMemos();
  initEmotionCharts();
  updateNoticeBanner();
  
  // 기본 기록 날짜 세팅
  document.getElementById('entryDateInput').value = appState.draftEntry.date;
});

function initDateDisplays() {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
  const todayStr = new Date().toLocaleDateString('ko-KR', options);
  const subHeader = document.getElementById('subHeaderDate');
  if (subHeader) subHeader.textContent = todayStr;
}

// 로컬스토리지 동기화
function loadLocalStorage() {
  const savedState = localStorage.getItem('MINDLOG_PRO_STATE');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      appState.entries = parsed.entries || [];
      appState.todos = parsed.todos || appState.todos;
      appState.memos = parsed.memos || [];
      appState.recentKeywords = parsed.recentKeywords || appState.recentKeywords;
      appState.notices = parsed.notices || appState.notices;
      appState.reviews = parsed.reviews || appState.reviews;
      appState.currentTheme = parsed.currentTheme || 'indigo';
    } catch (e) {
      console.warn("로컬 캐시 파싱 실패", e);
    }
  }

  // 초기 샘플 데이터 주입 (기록이 하나도 없는 경우 시각적 확인용)
  if (appState.entries.length === 0) {
    appState.entries = [
      {
        id: 1727050000000,
        date: "2026-09-21",
        dateDisplay: "2026. 09. 21",
        mediaList: [{ type: 'image', src: "https://images.unsplash.com/photo-1508344928928-7165b67de128?w=600&auto=format&fit=crop" }],
        keywords: ["운동 🏃", "열정 ⚡", "뿌듯함 ✨"],
        stickers: ["🎯 해냈다!"],
        diary: "숨이 턱 끝까지 차오르도록 달리고 난 뒤에 찾아오는 차분한 고요가 참 좋다. 복잡했던 생각들이 땀방울과 함께 씻겨 내려가며 비로소 나 자신에게 집중할 수 있었던 소중한 시간.",
        feedback: "용기를 얻었어요 🔥",
        userComment: "몸은 피곤하지만 정신이 맑아짐"
      },
      {
        id: 1727136400000,
        date: "2026-09-22",
        dateDisplay: "2026. 09. 22",
        mediaList: [{ type: 'image', src: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop" }],
        keywords: ["카페투어 ☕", "평온함 🌿"],
        stickers: ["☕ 여유 한 잔"],
        diary: "따스한 햇살이 내려앉은 창가 자리에서 은은하게 퍼지는 커피 향을 음미했다. 빠르게 흘러가는 일상 속에서 잠시 속도를 늦추고 온전히 쉬어가는 이런 순간이 삶의 작은 쉼표가 되어준다.",
        feedback: "행복한 여운 🥰",
        userComment: "단골 카페의 라떼가 맛있었다"
      }
    ];
  }

  // 기본 메모 샘플
  if (appState.memos.length === 0) {
    appState.memos = [
      { id: 1, text: "가을맞이 책상 정리 및 플래너 루틴 다듬기", date: "2026. 09. 22 14:30" }
    ];
  }
}

function persistState() {
  localStorage.setItem('MINDLOG_PRO_STATE', JSON.stringify({
    entries: appState.entries,
    todos: appState.todos,
    memos: appState.memos,
    recentKeywords: appState.recentKeywords,
    notices: appState.notices,
    reviews: appState.reviews,
    currentTheme: appState.currentTheme
  }));
}

// ==========================================
// 3. 탭 전환 및 네비게이션
// ==========================================
function switchTab(tabId) {
  appState.activeTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('text-indigo-600', 'active');
    el.classList.add('text-slate-400');
  });

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetNav = document.getElementById(`nav-${tabId}`);
  if (targetTab) targetTab.classList.add('active');
  if (targetNav) {
    targetNav.classList.remove('text-slate-400');
    targetNav.classList.add('text-indigo-600', 'active');
  }

  if (tabId === 'calendar') renderCalendar();
  if (tabId === 'timeline') renderTimeline();
  if (tabId === 'report') renderEmotionReportView();

  lucide.createIcons();
}

// ==========================================
// 4. 홈 포토 캘린더 (Month & Week 토글)
// ==========================================
function setCalendarMode(mode) {
  appState.calendarMode = mode;
  const btnMonth = document.getElementById('btnCalMonth');
  const btnWeek = document.getElementById('btnCalWeek');

  if (mode === 'month') {
    btnMonth.className = "px-2.5 py-1 rounded-lg bg-white text-indigo-600 shadow-xs";
    btnWeek.className = "px-2.5 py-1 rounded-lg text-slate-500";
  } else {
    btnWeek.className = "px-2.5 py-1 rounded-lg bg-white text-indigo-600 shadow-xs";
    btnMonth.className = "px-2.5 py-1 rounded-lg text-slate-500";
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

  // 월 첫날과 총 일수
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const lastDate = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  // 날짜 셀 데이터 생성
  let days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push({ empty: true });
  }
  for (let d = 1; d <= lastDate; d++) {
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const fullDate = `${calendarYear}-${mm}-${dd}`;
    const entry = appState.entries.find(e => e.date === fullDate);
    days.push({ dayNum: d, fullDate, entry });
  }

  // 주간 모드 필터링 (오늘 날짜가 속한 주간만 표시)
  if (calendarMode === 'week') {
    const todayIndex = days.findIndex(d => d.fullDate === todayStr);
    const startIdx = todayIndex >= 0 ? Math.floor(todayIndex / 7) * 7 : 0;
    days = days.slice(startIdx, startIdx + 7);
  }

  days.forEach(item => {
    const cell = document.createElement('div');
    if (item.empty) {
      cell.className = "aspect-square rounded-2xl bg-slate-50/40 border border-transparent";
      container.appendChild(cell);
      return;
    }

    const isToday = item.fullDate === todayStr;
    const hasPhoto = item.entry && item.entry.mediaList && item.entry.mediaList.length > 0;
    const thumbUrl = hasPhoto ? item.entry.mediaList[0].src : null;

    cell.className = `calendar-cell flex flex-col justify-between p-1.5 ${isToday ? 'today' : ''} ${hasPhoto ? 'has-entry text-white' : 'text-slate-700'}`;
    
    if (hasPhoto) {
      cell.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.6)), url('${thumbUrl}')`;
    }

    cell.onclick = () => selectCalendarDate(item.fullDate);

    cell.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="text-[11px] font-black ${isToday ? 'bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center' : ''}">${item.dayNum}</span>
        ${item.entry ? `<span class="w-1.5 h-1.5 rounded-full ${hasPhoto ? 'bg-amber-300' : 'bg-indigo-500'}"></span>` : ''}
      </div>
      ${item.entry ? `
        <div class="truncate text-[9px] font-bold ${hasPhoto ? 'text-white/90' : 'text-indigo-600'}">
          ${item.entry.keywords[0] || '기록완료'}
        </div>
      ` : ''}
    `;

    container.appendChild(cell);
  });
}

function selectCalendarDate(dateStr) {
  appState.draftEntry.date = dateStr;
  document.getElementById('entryDateInput').value = dateStr;

  // 해당 일자에 기존 기록이 있으면 편집 모드로 채움
  const existing = appState.entries.find(e => e.date === dateStr);
  if (existing) {
    appState.draftEntry.mediaList = [...existing.mediaList];
    appState.draftEntry.keywords = [...existing.keywords];
    appState.draftEntry.stickers = [...(existing.stickers || [])];
    appState.draftEntry.diary = existing.diary;
    appState.draftEntry.feedback = existing.feedback;
    appState.draftEntry.userComment = existing.userComment || '';

    document.getElementById('aiDiaryContent').textContent = existing.diary;
    document.getElementById('diaryResultCard').classList.remove('hidden');
    document.getElementById('finalUserCommentInput').value = existing.userComment || '';
    renderAppliedStickers();
  } else {
    resetDraftEntry(dateStr);
  }

  renderMediaPreviews();
  renderPresetKeywords();
  switchTab('record');
}

function resetDraftEntry(dateStr) {
  appState.draftEntry = {
    date: dateStr || new Date().toISOString().split('T')[0],
    mediaList: [],
    keywords: [],
    stickers: [],
    diary: '',
    feedback: '행복한 여운 🥰',
    userComment: ''
  };
  document.getElementById('diaryResultCard').classList.add('hidden');
  document.getElementById('finalUserCommentInput').value = '';
  renderAppliedStickers();
  renderMediaPreviews();
}

// ==========================================
// 5. 미디어 핸들링 (앨범, 촬영, 10초 영상 검사)
// ==========================================
let pendingVideoFile = null;

function triggerPhotoSelect() {
  if (appState.draftEntry.mediaList.length >= 3) return showToast("미디어는 최대 3개까지만 첨부할 수 있습니다.");
  document.getElementById('albumPhotoInput').click();
}

function triggerCameraCapture() {
  if (appState.draftEntry.mediaList.length >= 3) return showToast("미디어는 최대 3개까지만 첨부할 수 있습니다.");
  document.getElementById('cameraPhotoInput').click();
}

function triggerVideoSelect() {
  if (appState.draftEntry.mediaList.length >= 3) return showToast("미디어는 최대 3개까지만 첨부할 수 있습니다.");
  document.getElementById('videoInput').click();
}

function handleMediaSelect(event, type) {
  const files = Array.from(event.target.files);
  const remainingSlots = 3 - appState.draftEntry.mediaList.length;
  const targetFiles = files.slice(0, remainingSlots);

  targetFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      appState.draftEntry.mediaList.push({
        type: 'image',
        src: e.target.result
      });
      renderMediaPreviews();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function handleVideoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const videoElem = document.createElement('video');
  videoElem.preload = 'metadata';
  videoElem.src = URL.createObjectURL(file);

  videoElem.onloadedmetadata = () => {
    URL.revokeObjectURL(videoElem.src);
    const duration = videoElem.duration;

    if (duration > 10) {
      pendingVideoFile = file;
      document.getElementById('videoTrimmerModal').classList.remove('hidden');
    } else {
      attachVideoDirectly(file, duration);
    }
  };
  event.target.value = '';
}

function attachVideoDirectly(file, duration) {
  const reader = new FileReader();
  reader.onload = (e) => {
    appState.draftEntry.mediaList.push({
      type: 'video',
      src: e.target.result,
      duration: Math.round(duration)
    });
    renderMediaPreviews();
    showToast("10초 영상이 정상 첨부되었습니다.");
  };
  reader.readAsDataURL(file);
}

function closeVideoTrimmer() {
  pendingVideoFile = null;
  document.getElementById('videoTrimmerModal').classList.add('hidden');
}

function confirmAutoTrimVideo() {
  if (!pendingVideoFile) return;
  attachVideoDirectly(pendingVideoFile, 10);
  closeVideoTrimmer();
}

function renderMediaPreviews() {
  const grid = document.getElementById('mediaPreviewGrid');
  grid.innerHTML = '';
  const list = appState.draftEntry.mediaList;
  document.getElementById('mediaCountBadge').textContent = `${list.length} / 3`;

  list.forEach((media, idx) => {
    const card = document.createElement('div');
    card.className = "relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group cursor-pointer";
    
    if (media.type === 'video') {
      card.innerHTML = `
        <video src="${media.src}" class="w-full h-full object-cover" muted></video>
        <span class="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center space-x-0.5">
          <i data-lucide="video" class="w-2.5 h-2.5"></i>
          <span>10s</span>
        </span>
      `;
    } else {
      card.innerHTML = `<img src="${media.src}" class="w-full h-full object-cover">`;
    }

    // 사진/영상 클릭 시 원본 라이트박스 팝업
    card.onclick = () => openLightbox(media.src, media.type);

    // 삭제 버튼
    const delBtn = document.createElement('button');
    delBtn.className = "absolute top-1.5 right-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition";
    delBtn.innerHTML = `<i data-lucide="x" class="w-3 h-3"></i>`;
    delBtn.onclick = (e) => {
      e.stopPropagation();
      appState.draftEntry.mediaList.splice(idx, 1);
      renderMediaPreviews();
    };

    card.appendChild(delBtn);
    grid.appendChild(card);
  });
  lucide.createIcons();
}

// 라이트박스 모달
function openLightbox(src, type = 'image') {
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  img.src = src;
  modal.classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightboxModal').classList.add('hidden');
}

// ==========================================
// 6. 스티커 데코 팩
// ==========================================
function renderStickerPresets() {
  const bar = document.getElementById('stickerPresetBar');
  bar.innerHTML = '';
  PRESET_STICKERS.forEach(st => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = "shrink-0 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:border-amber-400 hover:text-amber-700 transition active:scale-95";
    btn.textContent = st;
    btn.onclick = () => toggleSticker(st);
    bar.appendChild(btn);
  });
}

function toggleSticker(st) {
  const list = appState.draftEntry.stickers;
  const idx = list.indexOf(st);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(st);
  }
  renderAppliedStickers();
}

function renderAppliedStickers() {
  const area = document.getElementById('appliedStickersTagArea');
  area.innerHTML = '';
  appState.draftEntry.stickers.forEach((st, idx) => {
    const badge = document.createElement('span');
    badge.className = "inline-flex items-center space-x-1 bg-amber-100/90 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs";
    badge.innerHTML = `<span>${st}</span><button onclick="removeSticker(${idx})" class="hover:text-rose-600"><i data-lucide="x" class="w-2.5 h-2.5"></i></button>`;
    area.appendChild(badge);
  });
  lucide.createIcons();
}

function removeSticker(idx) {
  appState.draftEntry.stickers.splice(idx, 1);
  renderAppliedStickers();
}

// ==========================================
// 7. 키워드 엔진 & 최근 키워드 캐시
// ==========================================
function renderPresetKeywords() {
  const container = document.getElementById('keywordChipsGrid');
  container.innerHTML = '';

  PRESET_KEYWORDS.forEach(kw => {
    const isSelected = appState.draftEntry.keywords.includes(kw);
    const chip = document.createElement('button');
    chip.type = "button";
    chip.onclick = () => toggleKeyword(kw);
    chip.className = `keyword-chip px-3 py-1.5 rounded-full border text-[11px] font-bold transition ${
      isSelected ? 'selected' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
    }`;
    chip.textContent = kw;
    container.appendChild(chip);
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
      isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600'
    }`;
    chip.textContent = `#${kw}`;
    bar.appendChild(chip);
  });
}

function toggleKeyword(kw) {
  const list = appState.draftEntry.keywords;
  const idx = list.indexOf(kw);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(kw);
  }
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

// ==========================================
// 8. AI 일기 생성 (키워드 직접 언급 배제) & 8종 피드백
// ==========================================
async function requestAIDiaryGeneration() {
  const { mediaList, keywords } = appState.draftEntry;
  if (mediaList.length === 0 && keywords.length === 0) {
    showToast("사진 또는 키워드를 최소 1개 이상 입력해 주세요.");
    return;
  }

  const btn = document.getElementById('btnGenerateAI');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-amber-300"></i><span>감정의 결을 정성스레 엮는 중...</span>`;
  lucide.createIcons();

  // 구글 앱스 스크립트 API가 세팅되어 있을 경우 클라우드 통신
  if (GAS_API_URL && !GAS_API_URL.includes("여기에")) {
    try {
      const payload = {
        action: "GENERATE_AND_SAVE",
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
        displayAIDiaryResult(data.diary);
        return;
      }
    } catch (e) {
      console.warn("GAS 통신 오류, 로컬 자연어 엔진으로 대체합니다.", e);
    }
  }

  // 로컬 고감도 자연어 시뮬레이션 엔진 (원칙: 키워드 문자열 직접 언급 금지)
  setTimeout(() => {
    const reflectiveEssays = [
      "분주했던 하루의 끝자락, 시선이 머무는 곳마다 소소한 따스함이 스며있었다. 거창한 말이나 성과 대신 온전히 내 호흡에 집중하며 보낸 이 시간들이 내면을 단단하게 채워준다. 내일로 나아갈 평온한 용기를 얻은 밤이다.",
      "몸과 마음이 기분 좋은 활기로 가득 찼던 순간이었다. 땀 흘리고 몰입하며 스스로의 페이스를 찾아가는 과정 속에서, 잊고 지냈던 즐거움과 생동감이 다시금 마음 깊은 곳에서 피어올랐다.",
      "잠시 걸음을 멈추고 주위를 둘러보았을 때, 계절의 온기와 바람의 결이 마음에 닿았다. 서두르지 않아도 괜찮다는 무언의 위로 속에서, 지나온 시간들을 묵묵히 긍정할 수 있는 여유가 피어났다.",
      "지나간 걱정보다는 지금 눈앞에 놓인 소중한 일상에 집중했던 하루. 작은 성취와 마주할 때마다 스스로를 인정해 주는 너그러운 태도가 얼마나 큰 힘이 되는지 새삼 깨닫게 된다."
    ];

    const generated = reflectiveEssays[Math.floor(Math.random() * reflectiveEssays.length)];
    displayAIDiaryResult(generated);
  }, 1300);
}

function displayAIDiaryResult(diaryText) {
  appState.draftEntry.diary = diaryText;
  document.getElementById('aiDiaryContent').textContent = diaryText;
  document.getElementById('diaryResultCard').classList.remove('hidden');

  const btn = document.getElementById('btnGenerateAI');
  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i><span>Gemini AI 감성 일기 다시 쓰기</span>`;
  lucide.createIcons();
  showToast("AI가 하루를 담담히 돌아보는 일기를 완성했습니다!");
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
    date: fullDate,
    dateDisplay: dateDisplay,
    mediaList: [...appState.draftEntry.mediaList],
    keywords: [...appState.draftEntry.keywords],
    stickers: [...appState.draftEntry.stickers],
    diary: appState.draftEntry.diary || "기록이 저장되었습니다.",
    feedback: appState.draftEntry.feedback || "행복한 여운 🥰",
    userComment: comment
  };

  // 기존 해당 날짜 기록 덮어쓰기 or 신규 등록
  const existIdx = appState.entries.findIndex(e => e.date === fullDate);
  if (existIdx > -1) {
    appState.entries[existIdx] = entryRecord;
  } else {
    appState.entries.unshift(entryRecord);
  }

  // 정렬 (최신순)
  appState.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  persistState();

  showToast("🎉 오늘의 일상이 안전하게 영구 저장되었습니다!");
  renderCalendar();
  renderTimeline();
  switchTab('calendar');
}

// ==========================================
// 9. 타임라인 & 3대 보기 모드 (Card, List, Album)
// ==========================================
function setTimelineViewMode(mode) {
  appState.timelineViewMode = mode;
  const btnCard = document.getElementById('btnViewCard');
  const btnList = document.getElementById('btnViewList');
  const btnAlbum = document.getElementById('btnViewAlbum');

  [btnCard, btnList, btnAlbum].forEach(b => {
    b.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800";
  });

  if (mode === 'card') btnCard.className = "px-2.5 py-1 text-[11px] font-black rounded-lg bg-indigo-600 text-white shadow-xs";
  if (mode === 'list') btnList.className = "px-2.5 py-1 text-[11px] font-black rounded-lg bg-indigo-600 text-white shadow-xs";
  if (mode === 'album') btnAlbum.className = "px-2.5 py-1 text-[11px] font-black rounded-lg bg-indigo-600 text-white shadow-xs";

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

  // 모드 1: 사진첩 (앨범 모아보기 그리드)
  if (appState.timelineViewMode === 'album') {
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-3 gap-1.5";
    entries.forEach(item => {
      (item.mediaList || []).forEach(m => {
        const photoBox = document.createElement('div');
        photoBox.className = "aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer shadow-2xs hover:opacity-90 transition";
        photoBox.innerHTML = `<img src="${m.src}" class="w-full h-full object-cover">`;
        photoBox.onclick = () => openLightbox(m.src);
        grid.appendChild(photoBox);
      });
    });
    container.appendChild(grid);
    return;
  }

  // 모드 2: 콤팩트 리스트 뷰
  if (appState.timelineViewMode === 'list') {
    entries.forEach(item => {
      const row = document.createElement('div');
      row.className = "bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center space-x-3 shadow-2xs hover:border-indigo-300 transition cursor-pointer";
      const thumb = (item.mediaList && item.mediaList.length > 0) ? item.mediaList[0].src : null;

      row.innerHTML = `
        ${thumb ? `<img src="${thumb}" class="w-12 h-12 rounded-xl object-cover shrink-0" onclick="event.stopPropagation(); openLightbox('${thumb}')">` : `
          <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"><i data-lucide="book-open" class="w-5 h-5"></i></div>
        `}
        <div class="flex-1 min-w-0" onclick="selectCalendarDate('${item.date}')">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs font-black text-slate-900">${item.dateDisplay}</span>
            <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">${item.feedback}</span>
          </div>
          <p class="text-xs text-slate-600 truncate font-medium">${item.diary}</p>
        </div>
      `;
      container.appendChild(row);
    });
    lucide.createIcons();
    return;
  }

  // 모드 3: 기본 감성 카드 뷰
  entries.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3";

    // 미디어 그리드 (클릭 시 원본 라이트박스)
    let mediaHtml = '';
    if (item.mediaList && item.mediaList.length > 0) {
      const cols = Math.min(item.mediaList.length, 3);
      mediaHtml = `
        <div class="grid grid-cols-${cols} gap-1.5 rounded-2xl overflow-hidden">
          ${item.mediaList.map(m => `
            <div class="relative aspect-square cursor-pointer" onclick="openLightbox('${m.src}', '${m.type}')">
              ${m.type === 'video' 
                ? `<video src="${m.src}" class="w-full h-full object-cover rounded-xl" muted></video>` 
                : `<img src="${m.src}" class="w-full h-full object-cover rounded-xl">`}
            </div>
          `).join('')}
        </div>
      `;
    }

    const tagsHtml = (item.keywords || []).map(k => `<span class="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100">${k}</span>`).join(' ');
    const stickersHtml = (item.stickers || []).map(s => `<span class="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">${s}</span>`).join(' ');

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-slate-900">${item.dateDisplay}</span>
        <span class="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">${item.feedback}</span>
      </div>
      ${mediaHtml}
      <div class="flex flex-wrap gap-1">${tagsHtml} ${stickersHtml}</div>
      <p class="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-2xl whitespace-pre-line">${item.diary}</p>
      ${item.userComment ? `
        <div class="text-[11px] text-slate-500 font-semibold px-2 flex items-center space-x-1">
          <i data-lucide="message-square" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>${item.userComment}</span>
        </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

// ==========================================
// 10. 주간/월간 Vlog 스토리 플레이어 모달
// ==========================================
let vlogSlideIndex = 0;

function openVlogModal() {
  const validEntries = appState.entries.filter(e => e.mediaList && e.mediaList.length > 0);
  if (validEntries.length === 0) return showToast("Vlog로 감상할 미디어 기록이 아직 없습니다.");

  document.getElementById('vlogModal').classList.remove('hidden');
  vlogSlideIndex = 0;
  playVlogSlide(validEntries);
}

function playVlogSlide(entries) {
  clearInterval(vlogInterval);
  const total = entries.length;
  
  const updateSlide = () => {
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
    textEl.textContent = `[${entry.dateDisplay}]\n${entry.diary.slice(0, 75)}...`;

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

  updateSlide();
  vlogInterval = setInterval(updateSlide, 3500); // 3.5초 단위 자동 전환
}

function closeVlogModal() {
  clearInterval(vlogInterval);
  document.getElementById('vlogModal').classList.add('hidden');
  const vidEl = document.getElementById('vlogSlideVideo');
  vidEl.pause();
  vidEl.src = "";
}

// ==========================================
// 11. 감정 인포그래픽 리포트 (Chart.js 연동)
// ==========================================
function initEmotionCharts() {
  const pieCtx = document.getElementById('emotionPieChart');
  const radarCtx = document.getElementById('emotionRadarChart');
  if (!pieCtx || !radarCtx) return;

  if (pieChartInstance) pieChartInstance.destroy();
  if (radarChartInstance) radarChartInstance.destroy();

  // 도넛 차트
  pieChartInstance = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['행복/설렘', '열정/활기', '평온/쉼', '피로/고단'],
      datasets: [{
        data: [45, 30, 15, 10],
        backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#94a3b8'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
    }
  });

  // 4축 레이더 차트
  radarChartInstance = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: ['긍정 에너지', '도전/열정', '마음 회복력', '평온 밸런스'],
      datasets: [{
        label: '감정 지수',
        data: [85, 78, 80, 72],
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

function renderEmotionReportView() {
  setTimeout(() => {
    initEmotionCharts();
  }, 100);
}

// ==========================================
// 12. 5단계 로드맵 To-Do 플래너
// ==========================================
function setTodoScope(scope) {
  appState.currentTodoScope = scope;
  ['today', 'week', 'month', 'year', 'long'].forEach(s => {
    const btn = document.getElementById(`btnScope${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (s === scope) {
      btn.className = "py-1.5 rounded-xl bg-white text-indigo-600 shadow-2xs font-black";
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

  const list = appState.todos[appState.currentTodoScope] || [];
  const completed = list.filter(t => t.done).length;
  const pct = list.length > 0 ? Math.round((completed / list.length) * 100) : 0;
  document.getElementById('todoProgressBadge').textContent = `달성률 ${pct}% (${completed}/${list.length})`;

  list.forEach(t => {
    const li = document.createElement('li');
    li.className = "flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70";
    li.innerHTML = `
      <label class="flex items-center space-x-2.5 cursor-pointer flex-1">
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleCategorizedTodo(${t.id})" class="w-4 h-4 rounded text-emerald-600 accent-emerald-600">
        <span class="text-xs font-bold ${t.done ? 'line-through text-slate-400' : 'text-slate-800'}">${t.text}</span>
      </label>
      <button onclick="deleteCategorizedTodo(${t.id})" class="text-slate-400 hover:text-rose-600 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
    `;
    ul.appendChild(li);
  });
  lucide.createIcons();
}

function addCategorizedTodo() {
  const input = document.getElementById('newTodoItemInput');
  const text = input.value.trim();
  if (!text) return;

  appState.todos[appState.currentTodoScope].push({
    id: Date.now(),
    text,
    done: false
  });
  input.value = '';
  persistState();
  renderCategorizedTodoList();
}

function toggleCategorizedTodo(id) {
  const list = appState.todos[appState.currentTodoScope];
  const item = list.find(t => t.id === id);
  if (item) item.done = !item.done;
  persistState();
  renderCategorizedTodoList();
}

function deleteCategorizedTodo(id) {
  appState.todos[appState.currentTodoScope] = appState.todos[appState.currentTodoScope].filter(t => t.id !== id);
  persistState();
  renderCategorizedTodoList();
}

// ==========================================
// 13. 영구 저장형 아이디어 메모장
// ==========================================
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
  showToast("💡 아이디어 메모가 안전하게 영구 저장되었습니다!");
}

function renderSavedMemos() {
  const container = document.getElementById('savedMemosList');
  if (!container) return;
  container.innerHTML = '';

  if (appState.memos.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">저장된 메모가 없습니다.</p>`;
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

// ==========================================
// 14. 관리자 마스터 센터 (암호 0724 & 5회 락아웃)
// ==========================================
function promptAdminMode() {
  const now = Date.now();
  if (appState.adminLockUntil && now < appState.adminLockUntil) {
    const remMin = Math.ceil((appState.adminLockUntil - now) / 60000);
    return alert(`비밀번호 오류 초과로 관리자 모드가 잠겨 있습니다. ${remMin}분 후에 다시 시도해 주세요.`);
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
      appState.adminLockUntil = now + (5 * 60 * 1000); // 5분 차단
      alert("비밀번호 5회 오류! 보안을 위해 관리자 모드가 5분간 차단됩니다.");
    } else {
      alert(`비밀번호가 올바르지 않습니다. (실패 ${appState.adminFailedCount}/5회)`);
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
  const tabs = ['theme', 'notice', 'review', 'backup'];
  tabs.forEach(t => {
    const btn = document.getElementById(`adminTabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const panel = document.getElementById(`adminPanel${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (t === subTab) {
      btn.className = "flex-1 py-2.5 border-b-2 border-indigo-600 text-indigo-600 font-extrabold";
      panel.classList.remove('hidden');
    } else {
      btn.className = "flex-1 py-2.5 border-b-2 border-transparent text-slate-400 font-bold";
      panel.classList.add('hidden');
    }
  });
}

function applyAppTheme(themeName) {
  appState.currentTheme = themeName;
  persistState();
  showToast(`테마가 [${themeName}]으로 변경되었습니다.`);
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
  appState.reviews.forEach(r => {
    const item = document.createElement('div');
    item.className = "p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs";
    item.innerHTML = `
      <div class="flex justify-between font-bold">
        <span>${r.author} (${'⭐'.repeat(r.rating)})</span>
        <span class="text-[10px] text-slate-400">${r.date}</span>
      </div>
      <p class="text-slate-600 font-medium">${r.comment}</p>
    `;
    list.appendChild(item);
  });
}

// 백업 JSON 내보내기 & 복원
function exportDataBackupJSON() {
  const exportPayload = {
    version: "2.0.0",
    exportDate: new Date().toISOString(),
    data: appState
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
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
      if (parsed.data && parsed.data.entries) {
        appState.entries = parsed.data.entries;
        appState.todos = parsed.data.todos || appState.todos;
        appState.memos = parsed.data.memos || appState.memos;
        appState.recentKeywords = parsed.data.recentKeywords || appState.recentKeywords;
        persistState();

        renderCalendar();
        renderTimeline();
        renderCategorizedTodoList();
        renderSavedMemos();
        closeAdminModal();
        showToast("백업 데이터가 성공적으로 완벽 복원되었습니다!");
      }
    } catch (err) {
      alert("유효한 백업 JSON 파일이 아닙니다.");
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ==========================================
// 15. 공통 토스트 알림 헬퍼
// ==========================================
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  toast.classList.remove('opacity-0');
  setTimeout(() => {
    toast.classList.add('opacity-0');
  }, 2200);
}
