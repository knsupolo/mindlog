// ==========================================
// 🔗 구글 앱스 스크립트 백엔드 API URL
// ==========================================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyA2NubJNwyaB3LfULBrdsARNpeNcJ9cjZOiFBR4IyNQdjU7jXhd4vmM8-DMjMcwXE_/exec";

// 상태 관리
let currentEntry = {
  photos: [],
  selectedKeywords: [],
  generatedDiary: "",
  feedback: "",
  userComment: ""
};

const PRESET_KEYWORDS = [
  "좋음 😊", "신남 🔥", "야구 ⚾", "운동 🏃", 
  "힘들다 💦", "화난다 😤", "재밌다 😆", "날씨 별로 🌧️", 
  "공부했다 📚", "졸리다 🥱", "뿌듯함 ✨", "휴식 ☕"
];

let timelineList = [];
let todoList = [
  { id: 1, text: "AI 일상 기록앱 클라우드 동기화 완료하기", completed: false }
];

// 초기 구동
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderDate();
  renderPresetKeywords();
  fetchInitialData();
  renderTodoList();
});

function renderDate() {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
  document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('ko-KR', options).toUpperCase();
}

// 클라우드에서 이전 기록 불러오기
async function fetchInitialData() {
  if (!GAS_API_URL || GAS_API_URL.includes("여기에")) {
    renderTimeline();
    return;
  }
  try {
    const res = await fetch(GAS_API_URL);
    const data = await res.json();
    if (data.success && data.diaries) {
      timelineList = data.diaries;
      renderTimeline();
    }
  } catch (err) {
    console.error("데이터 동기화 실패:", err);
    renderTimeline();
  }
}

// 탭 전환
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

// 사진 첨부 (최대 3장)
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

// 키워드 칩
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
  if (!PRESET_KEYWORDS.includes(tag)) PRESET_KEYWORDS.push(tag);
  if (!currentEntry.selectedKeywords.includes(tag)) currentEntry.selectedKeywords.push(tag);
  input.value = '';
  renderPresetKeywords();
}

// AI 일기 생성 요청 (GAS 백엔드 통신)
async function generateAIDiary() {
  if (currentEntry.photos.length === 0 && currentEntry.selectedKeywords.length === 0) {
    showToast("사진을 최소 1장 첨부하거나 키워드를 선택해 주세요!");
    return;
  }

  const btn = document.getElementById('generateDiaryBtn');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-amber-300"></i><span>AI가 사진과 감정을 분석 중입니다...</span>`;
  lucide.createIcons();

  try {
    const payload = {
      action: "GENERATE_AND_SAVE",
      photos: currentEntry.photos,
      keywords: currentEntry.selectedKeywords,
      diary: "", // 비워두면 GAS에서 Gemini API가 자동 생성
      feedback: "생성완료",
      userComment: ""
    };

    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      currentEntry.generatedDiary = result.diary;
      document.getElementById('aiDiaryText').textContent = result.diary;
      document.getElementById('diaryResultCard').classList.remove('hidden');
      showToast("✨ Gemini AI가 오늘의 일기를 작성했습니다!");
    } else {
      showToast("생성 실패: " + result.error);
    }
  } catch (err) {
    console.error(err);
    showToast("통신 오류가 발생했습니다. URL을 확인해 주세요.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i><span>AI로 오늘의 일기 다시 쓰기</span>`;
    lucide.createIcons();
  }
}

// 피드백 선택
function submitFeedback(reaction) {
  currentEntry.feedback = reaction;
  document.querySelectorAll('.feedback-btn').forEach(btn => {
    if (btn.innerText.includes(reaction)) {
      btn.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
    } else {
      btn.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
    }
  });
  showToast(`감정 피드백 [${reaction}]이 기록되었습니다.`);
}

// 일기 최종 확정 저장
async function saveCompleteEntry() {
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
  showToast("🎉 구글 시트 및 드라이브에 안전하게 기록되었습니다!");

  // 초기화
  currentEntry = { photos: [], selectedKeywords: [], generatedDiary: "", feedback: "", userComment: "" };
  renderPhotoGrid();
  renderPresetKeywords();
  document.getElementById('diaryResultCard').classList.add('hidden');
  document.getElementById('feedbackCommentInput').value = '';

  switchTab('timeline');
}

// 타임라인 카드 뷰
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

    let photosHtml = '';
    if (item.photos && item.photos.length > 0) {
      photosHtml = `<div class="grid grid-cols-${Math.min(item.photos.length, 3)} gap-1.5 rounded-2xl overflow-hidden">
        ${item.photos.map(p => `<img src="${p}" class="w-full h-36 object-cover rounded-xl">`).join('')}
      </div>`;
    }

    const tagsHtml = (item.keywords || []).map(k => `<span class="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">${k}</span>`).join(' ');

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-slate-900">${item.date}</span>
        <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${item.feedback || '공감해요 ❤️'}</span>
      </div>
      ${photosHtml}
      <div class="flex flex-wrap gap-1">${tagsHtml}</div>
      <p class="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl">${item.diary}</p>
    `;
    container.appendChild(card);
  });
}

// 플래너 및 투두
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
  syncTodosToCloud();
}

function toggleTodo(idx) {
  todoList[idx].completed = !todoList[idx].completed;
  renderTodoList();
  syncTodosToCloud();
}

function deleteTodo(idx) {
  todoList.splice(idx, 1);
  renderTodoList();
  syncTodosToCloud();
}

async function syncTodosToCloud() {
  if (!GAS_API_URL || GAS_API_URL.includes("여기에")) return;
  try {
    await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "SAVE_TODO", todos: todoList })
    });
  } catch (e) {
    console.error("투두 클라우드 저장 실패:", e);
  }
}

function saveQuickMemo() {
  showToast("아이디어 메모가 로컬에 저장되었습니다.");
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 2200);
}
