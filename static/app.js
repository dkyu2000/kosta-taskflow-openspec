// ── API ──────────────────────────────────────────────────────
const API = {
  async req(method, path, body) {
    const token = localStorage.getItem('token');
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, detail: data.detail || data };
    return data;
  },
  get: (p) => API.req('GET', p),
  post: (p, b) => API.req('POST', p, b),
  put: (p, b) => API.req('PUT', p, b),
  del: (p) => API.req('DELETE', p),
};

// ── 상태 ─────────────────────────────────────────────────────
let currentUserId = null;
let currentUserEmail = '';
let currentTeamId = null;
let currentTeamName = '';
let pendingTeamData = null;
let allTasks = [];
let teamMembers = [];
let currentFilter = 'all';
let chatPollTimer = null;
let lastMessageTime = null;
let currentModalTaskId = null;
let currentModalStatus = null;
let pendingDeleteTaskId = null;
let activeScreen = 'kanban';
let mobileKanbanTab = 'TODO';

// ── 화면 전환 ─────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

function setTab(tab) {
  closeMobileMenu();
  if (tab === 'members') { openMembersPanel(); return; }
  if (tab === 'kanban') {
    stopChatPoll();
    activeScreen = 'kanban';
    show('screen-kanban');
    if (currentTeamId) loadTasks();
  } else if (tab === 'chat') {
    activeScreen = 'chat';
    document.getElementById('chat-team-label').textContent = `${currentTeamName} 팀 · 채팅`;
    show('screen-chat');
    lastMessageTime = null;
    loadMessages(true);
    startChatPoll();
  }
}

// ── 인증 화면 ─────────────────────────────────────────────────
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-title').textContent = mode === 'login' ? '로그인' : '회원가입';
  document.getElementById('btn-auth-submit').textContent = mode === 'login' ? '로그인' : '가입하기';
  document.getElementById('auth-switch-label').textContent = mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?';
  document.getElementById('btn-auth-switch').textContent = mode === 'login' ? '회원가입' : '로그인';
  clearAuthErrors();
}

function clearAuthErrors() {
  ['email-err', 'pw-err', 'auth-banner'].forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById('auth-email').classList.remove('border-red-400');
  document.getElementById('auth-password').classList.remove('border-red-400');
}

function showFieldErr(inputId, errId, textId, msg) {
  document.getElementById(inputId).classList.add('border-red-400');
  document.getElementById(errId).classList.remove('hidden');
  document.getElementById(textId).textContent = msg;
}

function showAuthBanner(msg, type = 'error') {
  const el = document.getElementById('auth-banner');
  el.classList.remove('hidden');
  if (type === 'error') {
    el.className = 'rounded-lg px-3 py-2.5 text-sm font-medium border bg-red-50 border-red-300 text-red-700';
    el.textContent = '✕ ' + msg;
  } else {
    el.className = 'rounded-lg px-3 py-2.5 text-sm font-medium border bg-green-50 border-green-300 text-green-700';
    el.textContent = '✓ ' + msg;
  }
}

document.getElementById('btn-auth-switch').addEventListener('click', () =>
  setAuthMode(authMode === 'login' ? 'signup' : 'login'));

document.getElementById('btn-auth-submit').addEventListener('click', async () => {
  clearAuthErrors();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  let valid = true;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldErr('auth-email', 'email-err', 'email-err-text', '올바른 이메일 형식이 아닙니다');
    valid = false;
  }
  if (authMode === 'signup' && password.length < 8) {
    showFieldErr('auth-password', 'pw-err', 'pw-err-text', '8자 이상 입력해주세요');
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('btn-auth-submit');
  btn.textContent = '처리 중...';
  btn.disabled = true;

  try {
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const data = await API.post(endpoint, { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user_id', String(data.user_id));
    currentUserId = data.user_id;
    showAuthBanner('성공! 이동 중...', 'success');
    try {
      const me = await API.get('/api/auth/me');
      currentUserEmail = me.email;
      localStorage.setItem('user_email', me.email);
    } catch {}
    setTimeout(() => afterLogin(), 600);
  } catch (e) {
    btn.textContent = authMode === 'login' ? '로그인' : '가입하기';
    btn.disabled = false;
    showAuthBanner(e.detail?.msg || (authMode === 'login' ? '로그인 실패' : '회원가입 실패'));
  }
});

['auth-email', 'auth-password'].forEach(id =>
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-auth-submit').click();
  })
);

async function afterLogin() {
  const teams = await API.get('/api/teams').catch(() => []);
  if (teams.length > 0) enterKanban(teams[0].team_id, teams[0].name);
  else showTeamsScreen();
}

// ── 팀 화면 ─────────────────────────────────────────────────
function showTeamsScreen() {
  stopChatPoll();
  show('screen-teams');
  document.getElementById('teams-user-email').textContent = currentUserEmail;
  loadTeamList();
}

async function loadTeamList() {
  try {
    const teams = await API.get('/api/teams');
    const list = document.getElementById('team-list');
    list.innerHTML = '';
    document.getElementById('no-team-banner').classList.toggle('hidden', teams.length > 0);
    teams.forEach(t => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 transition';
      div.innerHTML = `
        <div>
          <span class="font-semibold text-gray-800">${esc(t.name)}</span>
          <span class="ml-2 text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">${esc(t.invite_code)}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="enterKanban(${t.team_id},'${esc(t.name)}')"
            class="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition">칸반</button>
          <button onclick="enterChat(${t.team_id},'${esc(t.name)}')"
            class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">채팅</button>
        </div>`;
      list.appendChild(div);
    });
  } catch (e) {
    if (e.status === 401) goLogin();
  }
}

document.getElementById('btn-create-team').addEventListener('click', async () => {
  const name = document.getElementById('team-name-input').value.trim();
  const errEl = document.getElementById('create-team-err');
  errEl.classList.add('hidden');
  if (!name) { errEl.textContent = '팀 이름을 입력해주세요'; errEl.classList.remove('hidden'); return; }
  try {
    const data = await API.post('/api/teams', { name });
    pendingTeamData = data;
    document.getElementById('team-name-input').value = '';
    document.getElementById('created-team-name').textContent = data.name;
    document.getElementById('created-team-code').textContent = data.invite_code;
    document.getElementById('team-created-card').classList.remove('hidden');
    document.getElementById('team-joined-card').classList.add('hidden');
    loadTeamList();
  } catch (e) {
    errEl.textContent = e.detail?.msg || '팀 생성 실패';
    errEl.classList.remove('hidden');
  }
});

document.getElementById('btn-copy-code').addEventListener('click', () => {
  if (!pendingTeamData) return;
  navigator.clipboard.writeText(pendingTeamData.invite_code).then(() => {
    const btn = document.getElementById('btn-copy-code');
    const prev = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = prev, 1500);
  }).catch(() => {});
});

document.getElementById('btn-go-kanban-from-create').addEventListener('click', () => {
  if (pendingTeamData) enterKanban(pendingTeamData.team_id, pendingTeamData.name);
});

document.getElementById('btn-join-team').addEventListener('click', async () => {
  const code = document.getElementById('invite-code-input').value.trim().toUpperCase();
  const errEl = document.getElementById('join-team-err');
  errEl.classList.add('hidden');
  if (!code) { errEl.textContent = '초대코드를 입력해주세요'; errEl.classList.remove('hidden'); return; }
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    errEl.textContent = '형식이 올바르지 않습니다 (예: FRNT-2026)';
    errEl.classList.remove('hidden'); return;
  }
  try {
    const data = await API.post('/api/teams/join', { invite_code: code });
    pendingTeamData = data;
    document.getElementById('invite-code-input').value = '';
    document.getElementById('joined-confirm-text').textContent = `✓ ${esc(data.name)} 팀이 확인되었습니다`;
    document.getElementById('joined-team-name').textContent = data.name;
    document.getElementById('team-joined-card').classList.remove('hidden');
    document.getElementById('team-created-card').classList.add('hidden');
    loadTeamList();
  } catch (e) {
    errEl.textContent = e.detail?.msg || '합류 실패';
    errEl.classList.remove('hidden');
  }
});

document.getElementById('btn-go-kanban-from-join').addEventListener('click', () => {
  if (pendingTeamData) enterKanban(pendingTeamData.team_id, pendingTeamData.name);
});

document.getElementById('btn-teams-logout').addEventListener('click', logout);

// ── 칸반 진입 ────────────────────────────────────────────────
function enterKanban(teamId, teamName) {
  stopChatPoll();
  currentTeamId = teamId;
  currentTeamName = teamName;
  activeScreen = 'kanban';
  document.getElementById('kanban-team-name').textContent = teamName;
  document.getElementById('kanban-user-email').textContent = currentUserEmail;
  show('screen-kanban');
  setFilter('all');
  loadTasks();
  loadTeamMembers();
}

function enterChat(teamId, teamName) {
  currentTeamId = teamId;
  currentTeamName = teamName;
  setTab('chat');
}

document.getElementById('btn-kanban-logout')?.addEventListener('click', logout);

// ── 칸반 로직 ────────────────────────────────────────────────
async function loadTasks() {
  try {
    allTasks = await API.get(`/api/teams/${currentTeamId}/tasks`);
    renderTasks();
  } catch (e) {
    if (e.status === 401) goLogin();
  }
}

// 3.1 & 3.2: assignee_id 기반 필터
function getFiltered(status) {
  let tasks = allTasks.filter(t => t.status === status);
  if (currentFilter === 'me') tasks = tasks.filter(t => t.assignee_id === currentUserId);
  if (currentFilter === 'unassigned') tasks = tasks.filter(t => !t.assignee_id);
  return tasks;
}

function renderTasks() {
  ['TODO', 'DOING', 'DONE'].forEach(status => {
    const col = document.getElementById(`col-${status}`);
    const filtered = getFiltered(status);
    const total = allTasks.filter(t => t.status === status).length;
    document.getElementById(`hdr-${status}`).textContent = `${status} · ${total}`;
    col.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 m-1';
      if (status === 'TODO' && currentFilter === 'all') {
        empty.innerHTML = '<div class="text-3xl mb-2">📋</div><p class="text-sm font-medium">카드 없음</p><p class="text-xs mt-1 text-teal-500 cursor-pointer hover:underline" onclick="startInlineAdd(\'TODO\')">+ 첫 태스크 만들기</p>';
      } else {
        empty.innerHTML = '<div class="text-3xl mb-2">📋</div><p class="text-sm">카드 없음</p><p class="text-xs mt-1">드래그로 이동</p>';
      }
      col.appendChild(empty);
    } else {
      filtered.forEach(t => col.appendChild(makeCard(t)));
    }
  });
  setupDrop();
  updateMobileKanbanTab(mobileKanbanTab);
}

function emailInitial(userId) {
  const m = teamMembers.find(m => m.user_id === userId);
  if (!m) return `#${userId}`;
  return m.email.split('@')[0];
}

// 3.3: assignee_id 기반 카드 레이블
function makeCard(task) {
  const div = document.createElement('div');
  div.className = 'bg-white p-3 rounded-lg border border-gray-200 cursor-grab hover:shadow-sm hover:border-gray-300 transition select-none group';
  div.draggable = true;
  div.dataset.taskId = task.task_id;

  let label;
  if (task.assignee_id === currentUserId) label = '@me';
  else if (task.assignee_id) label = `@${emailInitial(task.assignee_id)}`;
  else label = '미할당';

  div.innerHTML = `
    <p class="text-sm text-gray-800 font-medium break-words leading-snug">${esc(task.title)}</p>
    <div class="flex items-center gap-1 mt-1.5">
      <span class="text-xs text-gray-400">#${task.task_id}</span>
      <span class="text-xs text-gray-300">·</span>
      <span class="text-xs ${task.assignee_id ? 'text-gray-400' : 'text-gray-300 italic'}">${esc(label)}</span>
    </div>`;
  div.addEventListener('click', () => openTaskModal(task));
  div.addEventListener('dragstart', e => { e.dataTransfer.setData('taskId', String(task.task_id)); div.classList.add('opacity-40'); });
  div.addEventListener('dragend', () => div.classList.remove('opacity-40'));
  return div;
}

function setupDrop() {
  ['TODO', 'DOING', 'DONE'].forEach(status => {
    const col = document.getElementById(`col-${status}`);
    col.ondragover = e => { e.preventDefault(); col.classList.add('col-drop-target'); };
    col.ondragleave = e => { if (!col.contains(e.relatedTarget)) col.classList.remove('col-drop-target'); };
    col.ondrop = async e => {
      e.preventDefault();
      col.classList.remove('col-drop-target');
      const taskId = e.dataTransfer.getData('taskId');
      if (!taskId) return;
      try {
        await API.put(`/api/tasks/${taskId}`, { status });
        await loadTasks();
      } catch (err) { console.error(err); }
    };
  });
}

// 4.1 & 4.2: 인라인 담당자 선택 드롭다운 포함
function startInlineAdd(status) {
  document.querySelector('.inline-add-form')?.remove();
  const col = document.getElementById(`col-${status}`);
  const form = document.createElement('div');
  form.className = 'inline-add-form bg-white border-2 border-teal-400 rounded-lg p-3 mb-2';

  const memberOptions = teamMembers.map(m =>
    `<option value="${m.user_id}" ${m.user_id === currentUserId ? 'selected' : ''}>${m.user_id === currentUserId ? '@me' : esc(m.email.split('@')[0])}</option>`
  ).join('');

  form.innerHTML = `
    <input type="text" id="inline-input" placeholder="태스크 제목 입력..."
      class="w-full text-sm focus:outline-none mb-2 bg-transparent" />
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1 text-xs text-gray-500">
        <span>담당자:</span>
        <select id="inline-assignee" class="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400">
          <option value="">미할당</option>
          ${memberOptions}
        </select>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">Enter: 저장 · Esc: 취소</span>
        <button id="btn-inline-cancel" class="text-xs text-gray-400 hover:text-gray-600">✕</button>
      </div>
    </div>`;
  col.prepend(form);
  const input = document.getElementById('inline-input');
  input.focus();
  input.addEventListener('keydown', async e => {
    if (e.key === 'Enter') {
      const title = input.value.trim();
      if (!title) return;
      const assigneeVal = document.getElementById('inline-assignee').value;
      const body = { title };
      if (assigneeVal) body.assignee_id = Number(assigneeVal);
      try {
        await API.post(`/api/teams/${currentTeamId}/tasks`, body);
        form.remove();
        await loadTasks();
      } catch (err) { console.error(err); }
    } else if (e.key === 'Escape') { form.remove(); }
  });
  document.getElementById('btn-inline-cancel').addEventListener('click', () => form.remove());
}

function setFilter(f) {
  currentFilter = f;
  ['all', 'me', 'unassigned'].forEach(id => {
    const btn = document.getElementById(`filter-${id}`);
    btn.className = id === f
      ? 'px-3 py-1 text-sm rounded-md bg-gray-800 text-white font-medium transition'
      : 'px-3 py-1 text-sm rounded-md text-gray-600 hover:bg-gray-100 transition';
  });
  renderTasks();
}

// ── 카드 상세 모달 ───────────────────────────────────────────
// 3.4: created_at 표시 포함
function openTaskModal(task) {
  currentModalTaskId = task.task_id;
  document.getElementById('modal-task-id').textContent = `#${task.task_id}`;
  document.getElementById('modal-task-title').textContent = task.title;
  const creatorLabel = task.creator_id === currentUserId
    ? `${currentUserEmail} (나)` : emailInitial(task.creator_id);
  document.getElementById('modal-creator').textContent = creatorLabel;

  const createdAtRow = document.getElementById('modal-created-at-row');
  if (task.created_at) {
    const dt = new Date(task.created_at);
    const fmt = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    document.getElementById('modal-created-at').textContent = fmt;
    createdAtRow.classList.remove('hidden');
  } else {
    createdAtRow.classList.add('hidden');
  }

  setModalStatus(task.status);
  document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
  currentModalTaskId = null;
}

function setModalStatus(status) {
  currentModalStatus = status;
  ['TODO', 'DOING', 'DONE'].forEach(s => {
    const btn = document.getElementById(`mbtn-${s}`);
    btn.className = s === status
      ? 'px-3 py-2 bg-teal-500 text-white font-semibold transition'
      : 'px-3 py-2 text-gray-500 hover:bg-gray-50 border-l border-gray-200 transition';
  });
}

document.getElementById('btn-modal-save').addEventListener('click', async () => {
  if (!currentModalTaskId) return;
  try {
    await API.put(`/api/tasks/${currentModalTaskId}`, { status: currentModalStatus });
    closeTaskModal();
    await loadTasks();
  } catch (e) { console.error(e); }
});

document.getElementById('btn-modal-delete').addEventListener('click', () => {
  const task = allTasks.find(t => t.task_id === currentModalTaskId);
  if (!task) return;
  closeTaskModal();
  openDeleteModal(task.task_id, task.title);
});

// ── 삭제 확인 모달 ───────────────────────────────────────────
function openDeleteModal(taskId, title) {
  pendingDeleteTaskId = taskId;
  document.getElementById('delete-subtitle').textContent = `'#${taskId} ${title}' — 되돌릴 수 없습니다`;
  document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  pendingDeleteTaskId = null;
}

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!pendingDeleteTaskId) return;
  try {
    await API.del(`/api/tasks/${pendingDeleteTaskId}`);
    closeDeleteModal();
    await loadTasks();
  } catch (e) { closeDeleteModal(); }
});

// ── 팀 멤버 ─────────────────────────────────────────────────
async function loadTeamMembers() {
  try {
    teamMembers = await API.get(`/api/teams/${currentTeamId}/members`);
  } catch {}
}

function openMembersPanel() {
  document.getElementById('members-overlay').classList.remove('hidden');
  const list = document.getElementById('member-list');
  list.innerHTML = '';
  document.getElementById('member-count').textContent = `${teamMembers.length}명`;
  teamMembers.forEach(m => {
    const isMe = m.user_id === currentUserId;
    const div = document.createElement('div');
    div.className = 'flex items-center gap-3 p-3 rounded-xl bg-gray-50';
    div.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-teal-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">${esc(m.email[0].toUpperCase())}</div>
      <div>
        <p class="text-sm font-medium text-gray-700">${esc(m.email)}${isMe ? ' <span class="text-xs text-gray-400 font-normal">(나)</span>' : ''}</p>
        <p class="text-xs text-gray-400">member</p>
      </div>`;
    list.appendChild(div);
  });
}

function closeMembersPanel() {
  document.getElementById('members-overlay').classList.add('hidden');
}

// ── 모바일 햄버거 메뉴 (5.4) ─────────────────────────────────
function openMobileMenu() {
  const panel = document.getElementById('mobile-menu');
  if (!panel) return;
  document.getElementById('mobile-menu-email').textContent = currentUserEmail;
  document.getElementById('mobile-menu-team').textContent = currentTeamName;
  panel.classList.remove('hidden');
}

function closeMobileMenu() {
  document.getElementById('mobile-menu')?.classList.add('hidden');
}

document.getElementById('mobile-menu-kanban')?.addEventListener('click', () => setTab('kanban'));
document.getElementById('mobile-menu-chat')?.addEventListener('click', () => setTab('chat'));
document.getElementById('mobile-menu-members')?.addEventListener('click', () => { closeMobileMenu(); openMembersPanel(); });
document.getElementById('mobile-menu-logout')?.addEventListener('click', logout);

// ── 모바일 칸반 탭 (5.5) ─────────────────────────────────────
function setMobileKanbanTab(tab) {
  mobileKanbanTab = tab;
  updateMobileKanbanTab(tab);
}

function updateMobileKanbanTab(tab) {
  const isMobile = window.innerWidth < 768;
  if (!isMobile) {
    ['TODO', 'DOING', 'DONE'].forEach(s => {
      document.getElementById(`col-${s}`)?.closest('.flex.flex-col.rounded-xl')?.classList.remove('hidden');
    });
    return;
  }
  ['TODO', 'DOING', 'DONE'].forEach(s => {
    const wrapper = document.getElementById(`col-${s}`)?.closest('.flex.flex-col.rounded-xl');
    if (wrapper) wrapper.classList.toggle('hidden', s !== tab);
  });
  ['TODO', 'DOING', 'DONE'].forEach(s => {
    const btn = document.getElementById(`mob-tab-${s}`);
    if (!btn) return;
    btn.className = s === tab
      ? 'flex-1 py-2 text-sm font-semibold border-b-2 border-teal-500 text-teal-600 transition'
      : 'flex-1 py-2 text-sm text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition';
  });
}

// ── 모바일 스와이프 (5.6) ─────────────────────────────────────
let touchStartX = 0;
const TABS = ['TODO', 'DOING', 'DONE'];

document.getElementById('screen-kanban')?.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.getElementById('screen-kanban')?.addEventListener('touchend', e => {
  if (window.innerWidth >= 768) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) < 50) return;
  const idx = TABS.indexOf(mobileKanbanTab);
  if (dx < 0 && idx < TABS.length - 1) setMobileKanbanTab(TABS[idx + 1]);
  else if (dx > 0 && idx > 0) setMobileKanbanTab(TABS[idx - 1]);
}, { passive: true });

window.addEventListener('resize', () => updateMobileKanbanTab(mobileKanbanTab));

// ── 채팅 ─────────────────────────────────────────────────────
async function loadMessages(reset = false) {
  try {
    const since = (!reset && lastMessageTime) ? `?since=${encodeURIComponent(lastMessageTime)}` : '';
    const msgs = await API.get(`/api/teams/${currentTeamId}/messages${since}`);
    const list = document.getElementById('message-list');

    if (reset) {
      list.innerHTML = '';
      if (msgs.length === 0) { renderChatEmpty(); return; }
    }

    const empty = list.querySelector('.chat-empty');
    if (empty && msgs.length > 0) empty.remove();

    msgs.forEach(m => {
      lastMessageTime = m.created_at;
      list.appendChild(makeBubble(m));
    });
    if (msgs.length > 0) list.scrollTop = list.scrollHeight;

    document.getElementById('poll-badge').classList.remove('hidden');
    document.getElementById('offline-badge').classList.add('hidden');
  } catch (e) {
    if (e.status === 401) { goLogin(); return; }
    document.getElementById('poll-badge').classList.add('hidden');
    document.getElementById('offline-badge').style.display = 'flex';
  }
}

function renderChatEmpty() {
  document.getElementById('message-list').innerHTML = `
    <div class="chat-empty flex flex-col items-center justify-center h-full text-gray-400 py-20">
      <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-3xl">💬</div>
      <p class="font-semibold text-gray-600 text-base">아직 대화가 없습니다</p>
      <p class="text-sm mt-1 text-gray-400">첫 메시지를 보내 팀원과 대화를 시작하세요</p>
    </div>`;
}

function makeBubble(msg) {
  const isMe = msg.user_id === currentUserId;
  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const wrapper = document.createElement('div');
  wrapper.dataset.msgId = msg.message_id;

  if (isMe) {
    wrapper.className = 'flex justify-end mb-3 group';
    wrapper.innerHTML = `
      <div class="max-w-xs lg:max-w-md">
        <div class="flex items-end justify-end gap-1.5">
          <button onclick="deleteMessage(${msg.message_id})"
            class="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-400 text-base pb-0.5">🗑</button>
          <div class="bg-teal-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm leading-relaxed">${esc(msg.content)}</div>
        </div>
        <p class="text-xs text-gray-400 text-right mt-0.5">나 · ${time}</p>
      </div>`;
  } else {
    const initial = msg.email ? msg.email[0].toUpperCase() : '?';
    const name = msg.email ? msg.email.split('@')[0] : '알 수 없음';
    wrapper.className = 'flex items-end gap-2 mb-3';
    wrapper.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">${esc(initial)}</div>
      <div class="max-w-xs lg:max-w-md">
        <p class="text-xs text-gray-500 mb-0.5">${esc(name)} · ${time}</p>
        <div class="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-gray-800 leading-relaxed">${esc(msg.content)}</div>
      </div>`;
  }
  return wrapper;
}

async function deleteMessage(msgId) {
  try {
    await API.del(`/api/messages/${msgId}`);
    document.querySelector(`[data-msg-id="${msgId}"]`)?.remove();
  } catch {}
}

function startChatPoll() {
  stopChatPoll();
  chatPollTimer = setInterval(() => loadMessages(false), 5000);
}
function stopChatPoll() {
  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
}

const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('input', () => {
  const len = chatInput.value.length;
  const counter = document.getElementById('chat-char-count');
  counter.textContent = `${len} / 1000`;
  counter.className = len > 1000 ? 'text-xs text-red-500 font-medium' : 'text-xs text-gray-400';
  document.getElementById('btn-send').disabled = len > 1000;
});
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
document.getElementById('btn-send').addEventListener('click', sendMessage);

// 5.7: visualViewport로 모바일 키보드 대응
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const chatScreen = document.getElementById('screen-chat');
    if (!chatScreen || chatScreen.classList.contains('hidden')) return;
    if (window.innerWidth < 768) {
      chatScreen.style.height = `${window.visualViewport.height}px`;
    } else {
      chatScreen.style.height = '';
    }
  });
}

async function sendMessage() {
  const content = chatInput.value.trim();
  const errEl = document.getElementById('chat-err');
  errEl.textContent = '';
  if (!content) return;
  if (content.length > 1000) { errEl.textContent = '1000자 이내로 입력해주세요'; return; }
  try {
    const msg = await API.post(`/api/teams/${currentTeamId}/messages`, { content });
    chatInput.value = '';
    document.getElementById('chat-char-count').textContent = '0 / 1000';
    lastMessageTime = msg.created_at;
    document.querySelector('.chat-empty')?.remove();
    const list = document.getElementById('message-list');
    list.appendChild(makeBubble(msg));
    list.scrollTop = list.scrollHeight;
  } catch (e) {
    errEl.textContent = e.detail?.msg || '전송 실패';
  }
}

// ── 로그아웃 ─────────────────────────────────────────────────
async function logout() {
  await API.post('/api/auth/logout').catch(() => {});
  localStorage.clear();
  currentUserId = null; currentUserEmail = ''; currentTeamId = null;
  stopChatPoll();
  goLogin();
}

function goLogin() {
  stopChatPoll();
  show('screen-auth');
}

// ── 유틸 ─────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── 초기화 ───────────────────────────────────────────────────
async function init() {
  const token = localStorage.getItem('token');
  if (!token) { goLogin(); return; }

  currentUserId = Number(localStorage.getItem('user_id')) || null;
  currentUserEmail = localStorage.getItem('user_email') || '';

  try {
    const me = await API.get('/api/auth/me');
    currentUserId = me.user_id;
    currentUserEmail = me.email;
    localStorage.setItem('user_email', me.email);
    localStorage.setItem('user_id', String(me.user_id));
  } catch (e) {
    if (e.status === 401) { goLogin(); return; }
  }

  const teams = await API.get('/api/teams').catch(() => []);
  if (teams.length > 0) enterKanban(teams[0].team_id, teams[0].name);
  else showTeamsScreen();
}

init();
