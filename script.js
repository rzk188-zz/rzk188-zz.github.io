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
      : `連線版本 1.21 到 26.2，目前線上 ${playerCount} 人`;
    element.setAttribute("aria-label", `${description}，查看在線紀錄`);
    element.title = description;
  });
}

async function fetchPlayerStatus() {
  try {
    const res = await fetch('https://api.minetools.eu/ping/haowan.pro');
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }
    const onlineCount = data.players.online;
    renderPlayerStatus({ available: true, online: true, players: onlineCount });
  } catch (e) {
    try {
      const res2 = await fetch('https://api.mcsrvstat.us/3/haowan.pro');
      const data2 = await res2.json();
      if (data2.online) {
        renderPlayerStatus({ available: true, online: true, players: data2.players.online });
        return;
      }
    } catch (e2) {}
    renderPlayerStatus(null);
  }
}

fetchPlayerStatus();
window.setInterval(fetchPlayerStatus, 60_000);

const revealItems = document.querySelectorAll(".reveal");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("visible"));
} else {
  body.classList.add("reveal-ready");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  revealItems.forEach((item) => observer.observe(item));
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeSponsor(record) {
  const rawAmount = Number(record.amount ?? record.value ?? 0);
  const displayName = cleanText(record.displayName ?? record.name ?? record.username, "匿名支持者");
  const explicitMinecraftId = cleanText(
    record.minecraftUuid ?? record.minecraft_uuid ?? record.minecraftName ??
    record.minecraft_name ?? record.mcName ?? record.ign ?? record.playerName,
  );
  const genericUuid = cleanText(record.uuid);
  const minecraftId = explicitMinecraftId ||
    (/^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(genericUuid) ? genericUuid : "") ||
    (/^[A-Za-z0-9_]{1,16}$/.test(displayName) ? displayName : "MHF_Steve");
  return {
    name: displayName,
    minecraftId,
    amount: Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0,
    currency: cleanText(record.currency, "OMAMORI").toUpperCase(),
    hideAmount: Boolean(record.hideAmount),
    message: cleanText(record.message ?? record.note, ""),
  };
}

function formatSponsorAmount(record) {
  const amount = record.amount.toLocaleString("zh-TW");
  if (record.currency === "OMAMORI") return `${amount} 御守幣`;
  if (record.currency === "TWD") return `NT$ ${amount}`;
  return `${record.currency} ${amount}`;
}

function createHeroSupporterItem(record) {
  const item = document.createElement("article");
  item.className = "hero-supporter-item";

  const avatar = document.createElement("img");
  avatar.className = "hero-supporter-avatar";
  avatar.src = `https://mc-heads.net/avatar/${encodeURIComponent(record.minecraftId)}/64.png`;
  avatar.alt = `${record.name} 的 Minecraft 頭像`;
  avatar.width = 42;
  avatar.height = 42;
  avatar.loading = "lazy";
  avatar.decoding = "async";
  avatar.referrerPolicy = "no-referrer";
  avatar.addEventListener("error", () => {
    avatar.src = "/server-icon-v2.webp?v=20260803-imagefix1";
  }, { once: true });

  const info = document.createElement("p");
  info.className = "hero-supporter-info";
  const name = document.createElement("strong");
  const amount = document.createElement("span");
  name.textContent = record.name;
  amount.className = "hero-supporter-amount";
  amount.textContent = record.hideAmount ? "御守幣未公開" : formatSponsorAmount(record);
  info.append(name, amount);
  if (record.message) {
    const message = document.createElement("small");
    message.textContent = record.message;
    info.append(message);
  }

  item.append(avatar, info);
  return item;
}

function renderHeroSupporterEmpty(container) {
  const empty = document.createElement("div");
  empty.className = "hero-supporter-empty";
  const avatar = document.createElement("span");
  avatar.textContent = "星";
  const info = document.createElement("p");
  const title = document.createElement("strong");
  const note = document.createElement("small");
  title.textContent = "等待第一位支持者";
  note.textContent = "贊助內容會同步顯示於此";
  info.append(title, note);
  empty.append(avatar, info);
  container.append(empty);
}

function renderSponsors(records) {
  const sponsors = [...records].reverse().map(normalizeSponsor).filter((record) => record.amount > 0);

  const heroList = document.querySelector("[data-hero-supporter-list]");
  if (heroList) {
    heroList.replaceChildren();
    heroList.scrollTop = 0;
    if (!sponsors.length) {
      renderHeroSupporterEmpty(heroList);
    } else {
      sponsors.forEach((record) => {
        heroList.append(createHeroSupporterItem(record));
      });
    }
  }
}

async function fetchSponsorData() {
  const endpoints = ["/sponsors.json", body.dataset.sponsorApi || "/api/sponsors"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const sponsors = Array.isArray(payload) ? payload : payload.sponsors;
      if (!Array.isArray(sponsors)) continue;
      renderSponsors(sponsors);
      return;
    } catch {
      // The bundled empty state remains available when the live endpoint is down.
    }
  }

  renderSponsors([]);
}

fetchSponsorData();

function cleanAnnouncementLine(value) {
  return String(value || "")
    .replace(/<a?:([A-Za-z0-9_~]+):\d+>/g, "$1")
    .replace(/:[A-Za-z0-9_~]+:/g, "")
    .replace(/<@&\d+>/g, "")
    .replace(/<@!?\d+>/g, "Discord 成員")
    .replace(/<#\d+>/g, "Discord 頻道")
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/^\s*(?:>\s*)?(?:#{1,6}\s*)?/, "")
    .replace(/^\s*[-*]\s+/, "")
    .replace(/[*_`~]/g, "")
    .replace(/:[A-Za-z0-9~-]{2,64}:/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAnnouncement(record) {
  const createdAt = new Date(record?.createdAt || "");
  const lines = String(record?.content || "")
    .split(/\r?\n/)
    .map(cleanAnnouncementLine)
    .filter((line) => line && !/^@[^\s]+$/.test(line));
  if (!lines.length || Number.isNaN(createdAt.getTime())) return null;
  return {
    id: cleanText(record.id),
    type: record.type === "update" ? "update" : "general",
    author: cleanText(record.author, "星鈴町"),
    title: lines[0].slice(0, 90),
    body: lines.slice(1).join("\n").slice(0, 1_800),
    createdAt,
    imageUrl: safeAnnouncementImageUrl(record?.imageUrl),
    url: /^https:\/\/(?:www\.)?discord\.com\/channels\/\d+\/\d+\/\d+\/?$/.test(record.url || "")
      ? record.url
      : "",
  };
}

function safeAnnouncementImageUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const allowedHost = ["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)
      || /^images-ext-\d+\.discordapp\.net$/.test(url.hostname);
    return url.protocol === "https:" && allowedHost ? url.toString() : "";
  } catch {
    return "";
  }
}

function formatAnnouncementDate(date) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(date);
}

const announcementMedia = {
  general: [
    "/xingling-world-20260716.webp?v=20260804-imagefix2",
    "/feature-daily-events-20260717.webp?v=20260804-imagefix2",
    "/feature-core-stress-20260717.webp?v=20260804-imagefix2",
  ],
  update: [
    "/feature-core-stress-20260717.webp?v=20260804-imagefix2",
    "/feature-daily-events-20260717.webp?v=20260804-imagefix2",
    "/xingling-world-20260716.webp?v=20260804-imagefix2",
  ],
};

const INITIAL_ANNOUNCEMENT_COUNT = 2;
const ANNOUNCEMENTS_PER_PAGE = 4;
let announcementRecords = [];
let announcementFilter = "all";
let visibleAnnouncementCount = INITIAL_ANNOUNCEMENT_COUNT;

function fallbackAnnouncementImage(record) {
  const choices = announcementMedia[record.type];
  const index = [...String(record.id || record.title)]
    .reduce((sum, character) => sum + character.charCodeAt(0), 0) % choices.length;
  return choices[index];
}

function createAnnouncementItem(record) {
  const item = document.createElement("article");
  item.className = `announcement-entry is-${record.type}`;
  item.setAttribute("role", "listitem");

  const summary = document.createElement("button");
  summary.type = "button";
  summary.className = "announcement-summary";
  summary.setAttribute("aria-expanded", "false");

  const media = document.createElement("div");
  media.className = "announcement-entry-media";
  const image = document.createElement("img");
  const fallbackImage = fallbackAnnouncementImage(record);
  image.src = record.imageUrl || fallbackImage;
  image.alt = record.type === "update"
    ? "星鈴町伺服器系統與技術生存實景"
    : "星鈴町伺服器町景與居民活動實景";
  image.width = 1200;
  image.height = 675;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    if (!image.src.endsWith(fallbackImage)) image.src = fallbackImage;
  }, { once: true });
  const category = document.createElement("span");
  category.className = "announcement-category";
  category.textContent = record.type === "update" ? "更新日誌" : "町內公告";
  media.append(image, category);

  const copy = document.createElement("div");
  copy.className = "announcement-summary-copy";
  const meta = document.createElement("p");
  meta.className = "announcement-meta";
  const author = document.createElement("span");
  const time = document.createElement("time");
  author.textContent = record.author || "星鈴町";
  time.dateTime = record.createdAt.toISOString();
  time.textContent = formatAnnouncementDate(record.createdAt);
  meta.append(author, time);

  const title = document.createElement("span");
  title.className = "announcement-title";
  title.id = `announcement-title-${record.id}`;
  title.textContent = record.title;
  copy.append(meta, title);

  if (record.body) {
    const preview = document.createElement("span");
    preview.className = "announcement-preview";
    preview.textContent = record.body;
    copy.append(preview);
  }

  const indicator = document.createElement("span");
  indicator.className = "announcement-indicator";
  indicator.setAttribute("aria-hidden", "true");
  indicator.textContent = "⌄";
  summary.append(media, copy, indicator);

  const detail = document.createElement("div");
  detail.className = "announcement-detail";
  detail.id = `announcement-detail-${record.id}`;
  detail.hidden = true;
  summary.setAttribute("aria-controls", detail.id);
  item.setAttribute("aria-labelledby", title.id);

  const content = document.createElement("p");
  content.textContent = record.body || "這則公告沒有額外說明。";
  detail.append(content);
  if (record.url) {
    const link = document.createElement("a");
    link.href = record.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "前往 Discord 閱讀完整內容";
    link.setAttribute("aria-label", `在 Discord 閱讀：${record.title}`);
    detail.append(link);
  }

  summary.addEventListener("click", () => {
    const shouldOpen = summary.getAttribute("aria-expanded") !== "true";
    const feed = item.parentElement;
    feed?.querySelectorAll('.announcement-summary[aria-expanded="true"]').forEach((openSummary) => {
      if (openSummary === summary) return;
      openSummary.setAttribute("aria-expanded", "false");
      const openDetail = document.getElementById(openSummary.getAttribute("aria-controls"));
      if (openDetail) openDetail.hidden = true;
    });
    summary.setAttribute("aria-expanded", String(shouldOpen));
    detail.hidden = !shouldOpen;
  });

  item.append(summary, detail);
  return item;
}

function filteredAnnouncements() {
  if (announcementFilter !== "all") {
    return announcementRecords.filter((record) => record.type === announcementFilter);
  }

  const leading = [
    announcementRecords.find((record) => record.type === "general"),
    announcementRecords.find((record) => record.type === "update"),
  ].filter(Boolean).sort((left, right) => right.createdAt - left.createdAt);
  const leadingIds = new Set(leading.map((record) => record.id));
  return [...leading, ...announcementRecords.filter((record) => !leadingIds.has(record.id))];
}

function renderAnnouncementFeed() {
  const container = document.querySelector("[data-announcement-feed]");
  if (!container) return;
  const filtered = filteredAnnouncements();
  const selected = filtered.slice(0, visibleAnnouncementCount);
  container.replaceChildren();

  if (!selected.length) {
    const empty = document.createElement("p");
    empty.className = "announcement-empty";
    empty.textContent = "目前還沒有同步的町內近況。";
    container.append(empty);
  } else {
    selected.forEach((record) => container.append(createAnnouncementItem(record)));
  }

  const count = document.querySelector("[data-announcement-count]");
  if (count) count.textContent = filtered.length
    ? `目前顯示 ${Math.min(selected.length, filtered.length)} / ${filtered.length} 則`
    : "";
  const loadMore = document.querySelector("[data-announcement-load]");
  if (loadMore) loadMore.hidden = selected.length >= filtered.length;
}

function renderAnnouncements(records) {
  announcementRecords = (Array.isArray(records) ? records : [])
    .map(normalizeAnnouncement)
    .filter(Boolean)
    .sort((left, right) => right.createdAt - left.createdAt);
  renderAnnouncementFeed();
}

function setupAnnouncementControls() {
  document.querySelectorAll("[data-announcement-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      announcementFilter = button.dataset.announcementFilter || "all";
      visibleAnnouncementCount = INITIAL_ANNOUNCEMENT_COUNT;
      document.querySelectorAll("[data-announcement-filter]").forEach((filterButton) => {
        filterButton.setAttribute("aria-selected", String(filterButton === button));
      });
      renderAnnouncementFeed();
    });
  });
  document.querySelector("[data-announcement-load]")?.addEventListener("click", () => {
    visibleAnnouncementCount += ANNOUNCEMENTS_PER_PAGE;
    renderAnnouncementFeed();
  });
}

async function fetchAnnouncementData() {
  const configuredEndpoint = body.dataset.announcementApi || "/api/announcements";
  const endpoint = ["127.0.0.1", "localhost"].includes(location.hostname)
    ? "https://www.selin.tw/api/announcements"
    : configuredEndpoint;
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`announcements ${response.status}`);
    const payload = await response.json();
    renderAnnouncements(payload.announcements);
  } catch {
    renderAnnouncements([]);
  }
}

fetchAnnouncementData();
window.setInterval(fetchAnnouncementData, 5 * 60_000);
setupAnnouncementControls();
