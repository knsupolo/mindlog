// ==========================================
// 1. 상태 관리 객체 (State)
// ==========================================
let currentEntry = {
  photos: [], // 업로드된 이미지 Data URL (최대 3개)
  selectedKeywords: [], // 선택된 키워드 배열
  generatedDiary: "",
  feedback: "",
  userComment: ""
};

// 기본 추천 프리셋 키워드
const PRESET_KEYWORDS = [
  "좋음 😊", "신남 🔥", "야구 ⚾", "운동 🏃", 
  "힘들다 💦", "화난다 😤", "재밌다 😆", "날씨 별로 🌧️", 
  "공부했다 📚", "졸리다 🥱", "뿌듯함 ✨", "휴식 ☕"
];

// 샘플 타임라인 데이터 (Setlog 스타일 뷰용)
let timelineList = [
  {
    id: 1,
    date: "2026. 09. 21",
    keywords: ["신남 🔥", "야구 ⚾", "뿌듯함 ✨"],
    photos: ["https://images.unsplash.com/photo-1508344928928-7165b67de128?w=500&auto=format&fit=crop"],
    diary: "퇴근 후 배트를 쥐고 그라운드에 나선 순간 하루의 스트레스가 시원하게 날아갔다. 좋은 사람들과 땀 흘리며 달렸던 최고의 하루.",
    feedback: "공감해요 ❤️"
  }
];

let todoList = [
  { id: 1, text: "수행평가 결과 시트 정리", completed: true },
  { id: 2, text: "AI 일상 기록앱 깃허브 배포하기", completed: false }
];

// ==========================================
// 2. 초기 구동 및 렌더링
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderDate();
  renderPresetKeywords();
  renderTimeline();
  renderTodoList();
});

function renderDate() {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
  const today = new Date().toLocaleDateString('ko-KR', options);
  document.getElementById('currentDateDisplay').textContent = today.toUpperCase();
}

// ==========================================
// 3. 탭 전환 제어
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('text-indigo-600', 'active');
    el.classList.add('text-slate-400');
  });

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetNav = document.getElementById(`nav-${tabId}`);
  if (targetTab && targetNav) {
    targetTab.classList.add('active');
    targetNav.classList.remove('text-slate-400');
    targetNav.classList.add('text-indigo-600', 'active');
  }

  const titles = {
    record: "오늘의 기록",
    timeline: "일상 타임라인",
    report: "감정 인사이트",
    planner: "플래너 & 메모"
  };
  document.getElementById('headerTitle').textContent = titles[tabId] || "마인드로그";
  lucide.createIcons();
}

// ==========================================
// 4. 사진 첨부 & 미리보기 (최대 3장)
// ==========================================
function triggerFileInput() {
  if (currentEntry.photos.length >= 3) {
    showToast("사진은 최대 3장까지만 올릴 수 있습니다.");
    return;
  }
  document.getElementById('photoInput').click();
}

function handlePhotoSelect(event) {
  const files = Array.from(event.target.files);
  const remainingSlots = 3 - currentEntry.photos.length;
  const filesToAdd = files.slice(0, remainingSlots);

  filesToAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentEntry.photos.push(e.target.result);
      renderPhotoGrid();
    };
    reader.readAsDataURL(file);
  });

  event.target.value = '';
}

function removePhoto(idx) {
  currentEntry.photos.splice(idx, 1);
  renderPhotoGrid();
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '';

  currentEntry.photos.forEach((src, idx) => {
    const card = document.createElement('div');
    card.className = "relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group";
    card.innerHTML = `
      <img src="${src}" class="w-full h-full object-cover">
      <button onclick="removePhoto(${idx})" type="button" class="absolute top-1.5 right-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
    `;
    grid.appendChild(card);
  });

  if (currentEntry.photos.length < 3) {
    const addBtn = document.createElement('button');
    addBtn.id = "addPhotoBtn";
    addBtn.type = "button";
    addBtn.onclick = triggerFileInput;
    addBtn.className = "aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white flex flex-col items-center justify-center space-y-1 text-slate-400 hover:text-indigo-600 transition active:scale-95 shadow-2xs";
    addBtn.innerHTML = `
      <i data-lucide="plus" class="w-6 h-6"></i>
      <span class="text-[10px] font-bold">사진 추가</span>
    `;
    grid.appendChild(addBtn);
  }

  document.getElementById('photoCountBadge').textContent = `${currentEntry.photos.length} / 3`;
  lucide.createIcons();
}

// ==========================================
// 5. 키워드 다중 선택 & 추가
// ==========================================
function renderPresetKeywords() {
  const container = document.getElementById('keywordChipsContainer');
  container.innerHTML = '';

  PRESET_KEYWORDS.forEach(kw => {
    const isSelected = currentEntry.selectedKeywords.includes(kw);
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

function toggleKeyword(kw) {
  const idx = currentEntry.selectedKeywords.indexOf(kw);
  if (idx > -1) {
    currentEntry.selectedKeywords.splice(idx, 1);
  } else {
    currentEntry.selectedKeywords.push(kw);
  }
  renderPresetKeywords();
}

function addCustomKeyword() {
  const input = document.getElementById('customKeywordInput');
  const val = input.value.trim();
  if (!val) return;

  const tag = `#${val}`;
  if (!PRESET_KEYWORDS.includes(tag)) {
    PRESET_KEYWORDS.push(tag);
  }
  if (!currentEntry.selectedKeywords.includes(tag)) {
    currentEntry.selectedKeywords.push(tag);
  }
  input.value = '';
  renderPresetKeywords();
}

// ==========================================
// 6. AI 일기 생성 및 피드백 (시뮬레이션)
// ==========================================
function generateAIDiary() {
  if (currentEntry.photos.length === 0 && currentEntry.selectedKeywords.length === 0) {
    showToast("사진을 최소 1장 첨부하거나 키워드를 선택해 주세요!");
    return;
  }

  const btn = document.getElementById('generateDiaryBtn');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-amber-300"></i><span>AI가 사진과 감정을 연결하는 중...</span>`;
  lucide.createIcons();

  // 3단계 구글 스크립트 연결 전 임시 생성 시뮬레이션 (1.2초 후 생성)
  setTimeout(() => {
    const kwList = currentEntry.selectedKeywords.join(', ') || '평범한 하루';
    const fakeDiary = `오늘 하루를 관통하는 키워드는 바로 [${kwList}]였다. 사진 속 담긴 일상의 단면을 보니, 분주한 흐름 속에서도 스스로의 페이스를 잃지 않으려 노력한 흔적이 보인다. 몸은 고단했을지라도 좋아하는 활동과 소소한 순간들 덕분에 마음만은 따뜻하게 채워진 의미 있는 하루였다.`;

    currentEntry.generatedDiary = fakeDiary;
    document.getElementById('aiDiaryText').textContent = fakeDiary;
    document.getElementById('diaryResultCard').classList.remove('hidden');

    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i><span>AI로 오늘의 일기 다시 쓰기</span>`;
    lucide.createIcons();
    showToast("AI 일기가 작성되었습니다! 나의 감정과 맞는지 피드백을 남겨보세요.");
  }, 1200);
}

function submitFeedback(reaction) {
  currentEntry.feedback = reaction;
  document.querySelectorAll('.feedback-btn').forEach(btn => {
    if (btn.innerText.includes(reaction)) {
      btn.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
    } else {
      btn.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
    }
  });
  showToast(`감정 피드백 [${reaction}]이 반영되었습니다.`);
}

function saveCompleteEntry() {
  const comment = document.getElementById('feedbackCommentInput').value.trim();
  currentEntry.userComment = comment;

  const newLog = {
    id: Date.now(),
    date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    keywords: [...currentEntry.selectedKeywords],
    photos: [...currentEntry.photos],
    diary: currentEntry.generatedDiary,
    feedback: currentEntry.feedback || "공감해요 ❤️"
  };

  timelineList.unshift(newLog);
  renderTimeline();
  showToast("🎉 오늘의 일상 기록이 안전하게 저장되었습니다!");

  // 폼 초기화
  currentEntry = { photos: [], selectedKeywords: [], generatedDiary: "", feedback: "", userComment: "" };
  renderPhotoGrid();
  renderPresetKeywords();
  document.getElementById('diaryResultCard').classList.add('hidden');
  document.getElementById('feedbackCommentInput').value = '';

  // 타임라인 탭으로 부드럽게 이동
  switchTab('timeline');
}

// ==========================================
// 7. 타임라인 (Setlog 스타일) 렌더링
// ==========================================
function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  container.innerHTML = '';

  if (timelineList.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-10">아직 저장된 기록이 없습니다.</p>`;
    return;
  }

  timelineList.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-3";

    // 사진 그리드
    let photosHtml = '';
    if (item.photos && item.photos.length > 0) {
      photosHtml = `<div class="grid grid-cols-${Math.min(item.photos.length, 3)} gap-1.5 rounded-2xl overflow-hidden">
        ${item.photos.map(p => `<img src="${p}" class="w-full h-36 object-cover rounded-xl">`).join('')}
      </div>`;
    }

    const tagsHtml = item.keywords.map(k => `<span class="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">${k}</span>`).join(' ');

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-slate-900">${item.date}</span>
        <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${item.feedback}</span>
      </div>
      ${photosHtml}
      <div class="flex flex-wrap gap-1">${tagsHtml}</div>
      <p class="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl">${item.diary}</p>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// 8. 플래너 (To-Do & 메모)
// ==========================================
function renderTodoList() {
  const ul = document.getElementById('todoList');
  ul.innerHTML = '';

  const completedCount = todoList.filter(t => t.completed).length;
  document.getElementById('todoStats').textContent = `${completedCount}/${todoList.length} 완료`;

  todoList.forEach((t, idx) => {
    const li = document.createElement('li');
    li.className = "flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70";
    li.innerHTML = `
      <label class="flex items-center space-x-2 cursor-pointer flex-1">
        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodo(${idx})" class="w-4 h-4 rounded text-emerald-600 accent-emerald-600">
        <span class="text-xs font-bold ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}">${t.text}</span>
      </label>
      <button onclick="deleteTodo(${idx})" class="text-slate-400 hover:text-rose-600 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
    `;
    ul.appendChild(li);
  });
  lucide.createIcons();
}

function addTodoItem() {
  const input = document.getElementById('newTodoInput');
  const text = input.value.trim();
  if (!text) return;
  todoList.push({ id: Date.now(), text, completed: false });
  input.value = '';
  renderTodoList();
}

function toggleTodo(idx) {
  todoList[idx].completed = !todoList[idx].completed;
  renderTodoList();
}

function deleteTodo(idx) {
  todoList.splice(idx, 1);
  renderTodoList();
}

function saveQuickMemo() {
  showToast("아이디어 메모가 로컬에 저장되었습니다.");
}

// 토스트 메시지
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 2000);
}
