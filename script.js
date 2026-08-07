const body = document.body;
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-nav]");
const toast = document.querySelector("[data-toast]");
let toastTimer = 0;

function setMenu(open) {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
  navigation.classList.toggle("open", open);
  body.classList.toggle("menu-open", open);
}

menuButton?.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("click", (event) => {
  if (!navigation?.classList.contains("open")) return;
  if (navigation.contains(event.target) || menuButton?.contains(event.target)) return;
  setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1120) setMenu(false);
});

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 36);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

function showToast(message) {
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

async function copyText(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.fontSize = "16px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  if (copied) return;

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  throw new Error("copy failed");
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copy;
    const label = button.querySelector(".button-label");
    const originalLabel = label?.textContent;

    try {
      await copyText(value);
      if (label) label.textContent = "已複製";
      showToast(`已複製：${value}`);
    } catch {
      showToast(`請手動複製：${value}`);
    }

    if (label && originalLabel) {
      window.setTimeout(() => {
        label.textContent = originalLabel;
      }, 1600);
    }
  });
});


function renderPlayerStatus(status) {
  const hasCount = Boolean(status?.available) && Number.isFinite(Number(status?.players));
  const playerCount = hasCount ? Math.max(0, Math.round(Number(status.players))) : null;
  const state = hasCount ? (status.online ? "online" : "offline") : "unavailable";

  document.querySelectorAll("[data-online-count]").forEach((element) => {
    element.textContent = playerCount === null ? "--" : playerCount.toLocaleString("zh-TW");
  });
  document.querySelectorAll("[data-server-status]").forEach((element) => {
    element.classList.remove("status-loading", "status-online", "status-offline", "status-unavailable");
    element.classList.add(`status-${state}`);
    const description = playerCount === null
      ? "目前暫時無法取得在線人數"
      : `連線版本 1.21.4 到 26.2，目前線上 ${playerCount} 人`;
    element.setAttribute("aria-label", `${description}，點擊查看在線玩家`);
    element.title = description;
  });
}

// 建立在線玩家名單互動浮窗
let playerModal = null;
function createPlayerModal() {
  if (playerModal) return playerModal;
  const modal = document.createElement('div');
  modal.className = 'player-modal-overlay';
  modal.innerHTML = `
    <div class="player-modal-card">
      <div class="player-modal-header">
        <h3>線上玩家名單</h3>
        <button class="player-modal-close" type="button">&times;</button>
      </div>
      <div class="player-modal-body" data-modal-player-list>
        <p class="player-loading">正在載入線上玩家...</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.player-modal-close').addEventListener('click', () => {
    modal.classList.remove('open');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
  return modal;
}

async function fetchOnlinePlayers() {
  const modal = createPlayerModal();
  const listContainer = modal.querySelector('[data-modal-player-list]');
  modal.classList.add('open');
  listContainer.innerHTML = '<p class="player-loading">正在取得即時在線玩家...</p>';

  try {
    const res = await fetch('https://api.mcsrvstat.us/3/haowan.pro');
    const data = await res.json();
    
    if (data.online && data.players && data.players.list && data.players.list.length > 0) {
      listContainer.innerHTML = `
        <p class="player-count-info">目前線上共 <strong>${data.players.online}</strong> 位玩家</p>
        <div class="player-grid">
          ${data.players.list.map(p => `
            <div class="player-item">
              <img src="https://mc-heads.net/avatar/${encodeURIComponent(p)}/48" alt="${p}" onerror="this.src='https://mc-heads.net/avatar/Steve/48'">
              <span>${p}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (data.online) {
      listContainer.innerHTML = `
        <p class="player-count-info">目前線上共 <strong>${data.players.online}</strong> 位玩家</p>
        <p class="player-empty">伺服器線上中，但未公開玩家清單</p>
      `;
    } else {
      listContainer.innerHTML = '<p class="player-empty">伺服器目前離線或維護中</p>';
    }
  } catch (e) {
    listContainer.innerHTML = '<p class="player-empty">無法載入在線玩家名單</p>';
  }
}

// 點擊狀態列彈出在線玩家名單
document.addEventListener('click', (e) => {
  const statusTrigger = e.target.closest('[data-server-status]');
  if (statusTrigger) {
    e.preventDefault();
    fetchOnlinePlayers();
  }
});
