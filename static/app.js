// ── API 유틸 ──────────────────────────────────────────────────
const API = {
  async req(method, path, body) {
    const token = localStorage.getItem("token");
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, detail: data.detail || data };
    return data;
  },
  get: (p) => API.req("GET", p),
  post: (p, b) => API.req("POST", p, b),
  put: (p, b) => API.req("PUT", p, b),
  del: (p) => API.req("DELETE", p),
};

// ── 상태 ──────────────────────────────────────────────────────
let currentTeamId = null;
let currentTeamName = "";
let chatPollTimer = null;
let lastMessageTime = null;

// ── 라우터 ────────────────────────────────────────────────────
function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(screenId).classList.remove("hidden");
}

function goLogin() {
  stopChatPoll();
  show("screen-auth");
}

function goTeams() {
  stopChatPoll();
  show("screen-teams");
  loadTeams();
}

function goKanban(teamId, teamName) {
  stopChatPoll();
  currentTeamId = teamId;
  currentTeamName = teamName;
  document.getElementById("kanban-team-name").textContent = teamName;
  show("screen-kanban");
  loadTasks();
}

function goChat(teamId, teamName) {
  currentTeamId = teamId;
  currentTeamName = teamName;
  document.getElementById("chat-team-name").textContent = teamName;
  show("screen-chat");
  lastMessageTime = null;
  loadMessages(true);
  startChatPoll();
}

// ── 인증 화면 ─────────────────────────────────────────────────
document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  clearMsg("auth-msg");
  try {
    const data = await API.post("/api/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user_id", data.user_id);
    goTeams();
  } catch (e) {
    showMsg("auth-msg", e.detail?.msg || "로그인 실패", "error");
  }
});

document.getElementById("btn-signup").addEventListener("click", async () => {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  clearMsg("auth-msg");
  try {
    const data = await API.post("/api/auth/signup", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user_id", data.user_id);
    goTeams();
  } catch (e) {
    showMsg("auth-msg", e.detail?.msg || "회원가입 실패", "error");
  }
});

// ── 팀 선택 화면 ──────────────────────────────────────────────
async function loadTeams() {
  try {
    const teams = await API.get("/api/teams");
    const list = document.getElementById("team-list");
    list.innerHTML = "";
    if (teams.length === 0) {
      list.innerHTML = "<p class='text-gray-400 text-sm'>소속 팀이 없습니다.</p>";
      return;
    }
    teams.forEach((t) => {
      const div = document.createElement("div");
      div.className = "flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border";
      div.innerHTML = `
        <span class="font-medium text-gray-800">${esc(t.name)}</span>
        <div class="flex gap-2">
          <button onclick="goKanban(${t.team_id}, '${esc(t.name)}')" class="px-3 py-1 text-sm bg-teal-500 text-white rounded hover:bg-teal-600">칸반</button>
          <button onclick="goChat(${t.team_id}, '${esc(t.name)}')" class="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600">채팅</button>
          <span class="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded font-mono">${esc(t.invite_code)}</span>
        </div>`;
      list.appendChild(div);
    });
  } catch (e) {
    if (e.status === 401) goLogin();
  }
}

document.getElementById("btn-create-team").addEventListener("click", async () => {
  const name = document.getElementById("team-name-input").value.trim();
  clearMsg("teams-msg");
  if (!name) return showMsg("teams-msg", "팀 이름을 입력해주세요", "error");
  try {
    await API.post("/api/teams", { name });
    document.getElementById("team-name-input").value = "";
    loadTeams();
  } catch (e) {
    showMsg("teams-msg", e.detail?.msg || "팀 생성 실패", "error");
  }
});

document.getElementById("btn-join-team").addEventListener("click", async () => {
  const code = document.getElementById("invite-code-input").value.trim();
  clearMsg("teams-msg");
  if (!code) return showMsg("teams-msg", "초대코드를 입력해주세요", "error");
  try {
    await API.post("/api/teams/join", { invite_code: code });
    document.getElementById("invite-code-input").value = "";
    loadTeams();
  } catch (e) {
    showMsg("teams-msg", e.detail?.msg || "합류 실패", "error");
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  await API.post("/api/auth/logout").catch(() => {});
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  goLogin();
});

// ── 칸반 화면 ─────────────────────────────────────────────────
async function loadTasks() {
  try {
    const tasks = await API.get(`/api/teams/${currentTeamId}/tasks`);
    ["TODO", "DOING", "DONE"].forEach((status) => {
      const col = document.getElementById(`col-${status}`);
      col.innerHTML = "";
      tasks
        .filter((t) => t.status === status)
        .forEach((t) => col.appendChild(makeTaskCard(t)));
    });
  } catch (e) {
    if (e.status === 401) goLogin();
  }
}

function makeTaskCard(task) {
  const div = document.createElement("div");
  div.className = "bg-white p-3 rounded shadow-sm border cursor-grab select-none";
  div.draggable = true;
  div.dataset.taskId = task.task_id;
  div.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <span class="text-sm text-gray-800 break-words flex-1">${esc(task.title)}</span>
      <button onclick="deleteTask(${task.task_id})" class="text-gray-300 hover:text-red-400 text-xs flex-shrink-0">✕</button>
    </div>`;
  div.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("taskId", task.task_id);
    div.classList.add("opacity-50");
  });
  div.addEventListener("dragend", () => div.classList.remove("opacity-50"));
  return div;
}

["TODO", "DOING", "DONE"].forEach((status) => {
  const col = document.getElementById(`col-${status}`);
  col.addEventListener("dragover", (e) => e.preventDefault());
  col.addEventListener("drop", async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    try {
      await API.put(`/api/tasks/${taskId}`, { status });
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  });
});

document.getElementById("btn-add-task").addEventListener("click", async () => {
  const title = document.getElementById("task-input").value.trim();
  clearMsg("kanban-msg");
  if (!title) return showMsg("kanban-msg", "태스크 제목을 입력해주세요", "error");
  try {
    await API.post(`/api/teams/${currentTeamId}/tasks`, { title });
    document.getElementById("task-input").value = "";
    loadTasks();
  } catch (e) {
    showMsg("kanban-msg", e.detail?.msg || "태스크 추가 실패", "error");
  }
});

async function deleteTask(taskId) {
  try {
    await API.del(`/api/tasks/${taskId}`);
    loadTasks();
  } catch (e) {
    console.error(e);
  }
}

document.getElementById("btn-kanban-to-chat").addEventListener("click", () => goChat(currentTeamId, currentTeamName));
document.getElementById("btn-kanban-back").addEventListener("click", goTeams);

// ── 채팅 화면 ─────────────────────────────────────────────────
async function loadMessages(reset = false) {
  try {
    const since = reset ? "" : (lastMessageTime ? `?since=${lastMessageTime}` : "");
    const msgs = await API.get(`/api/teams/${currentTeamId}/messages${since}`);
    const list = document.getElementById("message-list");
    if (reset) list.innerHTML = "";
    msgs.forEach((m) => {
      lastMessageTime = m.created_at;
      const div = document.createElement("div");
      div.className = "mb-2";
      const time = new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      div.innerHTML = `<span class="text-xs font-semibold text-teal-600">${esc(m.email)}</span> <span class="text-xs text-gray-400">${time}</span><p class="text-sm text-gray-800 mt-0.5">${esc(m.content)}</p>`;
      list.appendChild(div);
    });
    if (msgs.length > 0) list.scrollTop = list.scrollHeight;
  } catch (e) {
    if (e.status === 401) goLogin();
  }
}

function startChatPoll() {
  stopChatPoll();
  chatPollTimer = setInterval(() => loadMessages(false), 5000);
}

function stopChatPoll() {
  if (chatPollTimer) {
    clearInterval(chatPollTimer);
    chatPollTimer = null;
  }
}

document.getElementById("btn-send").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const content = input.value.trim();
  clearMsg("chat-msg");
  if (!content) return;
  try {
    await API.post(`/api/teams/${currentTeamId}/messages`, { content });
    input.value = "";
    loadMessages(false);
  } catch (e) {
    showMsg("chat-msg", e.detail?.msg || "전송 실패", "error");
  }
}

document.getElementById("btn-chat-to-kanban").addEventListener("click", () => goKanban(currentTeamId, currentTeamName));
document.getElementById("btn-chat-back").addEventListener("click", goTeams);

// ── 유틸 ──────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = type === "error" ? "text-sm text-red-500 mt-1" : "text-sm text-green-600 mt-1";
}

function clearMsg(id) {
  const el = document.getElementById(id);
  el.textContent = "";
}

// ── 초기화 ────────────────────────────────────────────────────
if (localStorage.getItem("token")) {
  goTeams();
} else {
  goLogin();
}
