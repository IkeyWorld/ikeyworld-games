(() => {
  "use strict";
  const games = Array.isArray(window.PUNKPORT_GAMES) ? window.PUNKPORT_GAMES : [];
  const byId = new Map(games.map(game => [game.id, game]));
  const $ = selector => document.querySelector(selector);
  const grid = $("#gameGrid");
  const search = $("#searchInput");
  const backdrop = $("#modalBackdrop");
  const dialog = $("#detailModal");
  const content = $("#modalContent");
  const state = { category: "all", query: "", sort: "featured", favoritesOnly: false };
  const key = "punkport:favorites:v1";
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) {}
  const favorites = new Set(Array.isArray(stored) ? stored.filter(id => byId.has(id)) : []);
  let lastFocus = null;
  let toastTimer = null;

  const escapeHtml = input => String(input ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const validDownload = link => {
    if (typeof link !== "string") return false;
    try {
      const url = new URL(link);
      return url.protocol === "https:" && Boolean(url.hostname);
    } catch (_) { return false; }
  };
  const available = game => game.status === "released" && validDownload(game.download);
  const saveFavorites = () => {
    try { localStorage.setItem(key, JSON.stringify([...favorites])); } catch (_) {}
    $("#favoriteCount").textContent = String(favorites.size);
  };
  const statusLabel = game => available(game) ? "ДОСТУПНА" : "В РАЗРАБОТКЕ";
  const poster = (game, large = false) => `
    <div class="game-poster poster-${escapeHtml(game.theme)} ${large ? "poster-large" : ""}">
      <img src="${escapeHtml(game.cover)}" loading="${large ? "eager" : "lazy"}" alt="Концептуальная иллюстрация проекта ${escapeHtml(game.name)}">
      <div class="poster-shade"></div>
      <span class="poster-wordmark">PUNKPORT / ORIGINAL</span>
      <span class="poster-corner" aria-hidden="true">↗</span>
    </div>`;
  const card = game => `
    <article class="game-card" aria-label="${escapeHtml(game.name)}">
      <button type="button" class="poster-button" data-open="${escapeHtml(game.id)}" aria-label="Подробнее: ${escapeHtml(game.name)}">
        ${poster(game)}
        <span class="poster-badge ${available(game) ? "badge-ready" : ""}">${statusLabel(game)}</span>
      </button>
      <div class="game-meta">
        <span class="game-category">${escapeHtml(game.genre)}</span>
        <button class="favorite-button ${favorites.has(game.id) ? "is-liked" : ""}" type="button" data-favorite="${escapeHtml(game.id)}" aria-pressed="${favorites.has(game.id)}" aria-label="${favorites.has(game.id) ? "Убрать из избранного" : "Добавить в избранное"}: ${escapeHtml(game.name)}">${favorites.has(game.id) ? "♥" : "♡"}</button>
      </div>
      <button class="game-title-button" type="button" data-open="${escapeHtml(game.id)}"><h3>${escapeHtml(game.name)}</h3></button>
      <p class="game-description">${escapeHtml(game.short)}</p>
      <div class="game-footer"><span class="game-price">${available(game) ? "БЕСПЛАТНО" : "СКОРО"}</span><button class="card-arrow" type="button" data-open="${escapeHtml(game.id)}" aria-label="Открыть описание ${escapeHtml(game.name)}">↗</button></div>
    </article>`;

  function render() {
    const query = state.query.trim().toLocaleLowerCase("ru");
    let filtered = games.filter(game => {
      if (state.category !== "all" && game.category !== state.category) return false;
      if (state.favoritesOnly && !favorites.has(game.id)) return false;
      if (!query) return true;
      return [game.name, game.genre, game.short, ...game.tags].join(" ").toLocaleLowerCase("ru").includes(query);
    });
    filtered = [...filtered].sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "ru");
      if (state.sort === "status") return Number(available(b)) - Number(available(a));
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
    grid.innerHTML = filtered.map(card).join("");
    $("#resultsCount").textContent = String(filtered.length);
    $("#emptyState").classList.toggle("hidden", filtered.length !== 0);
    $("#navCount").textContent = String(games.length);
    $("#heroGameCount").textContent = String(games.length);
    saveFavorites();
    for (const button of document.querySelectorAll("[data-filter]")) {
      const selected = button.dataset.filter === state.category;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }
  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("is-visible"), 3200);
  }
  function showModal(game, updateHash = true) {
    if (!game) return;
    lastFocus = document.activeElement;
    const canDownload = available(game);
    content.innerHTML = `
      ${poster(game, true)}
      <div class="detail-body">
        <span class="detail-kicker">${escapeHtml(game.kicker)}</span>
        <h2 id="detailTitle">${escapeHtml(game.name)}</h2>
        <div class="detail-tags">${game.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <p class="detail-copy">${escapeHtml(game.description)}</p>
        <div class="detail-specs">
          <div><small>ПЛАТФОРМА</small><strong>${escapeHtml(game.platform)}</strong></div>
          <div><small>ИГРОКОВ</small><strong>${escapeHtml(game.players)}</strong></div>
          <div><small>СТАТУС</small><strong>${canDownload ? "Опубликована" : "В разработке"}</strong></div>
        </div>
        <h3 class="features-title">Что планируется в игре</h3>
        <ul class="feature-list">${game.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
        <div class="detail-actions">
          ${canDownload ? `<a class="btn btn-primary" href="${escapeHtml(game.download)}" target="_blank" rel="noopener noreferrer">↓ Скачать ${game.version ? escapeHtml(game.version) : ""}</a>` : `<span class="unavailable-label">◌ Сборка ещё не опубликована</span>`}
          <button class="btn btn-outline" type="button" data-favorite="${escapeHtml(game.id)}">${favorites.has(game.id) ? "♥ В избранном" : "♡ В избранное"}</button>
          <button class="btn btn-outline" type="button" data-share="${escapeHtml(game.id)}">↗ Поделиться</button>
        </div>
      </div>`;
    backdrop.classList.remove("hidden");
    document.body.classList.add("modal-open");
    dialog.focus();
    if (updateHash && location.hash !== "#game/" + game.id) history.pushState(null, "", "#game/" + game.id);
  }
  function closeModal(updateHash = true) {
    if (backdrop.classList.contains("hidden")) return;
    backdrop.classList.add("hidden");
    document.body.classList.remove("modal-open");
    if (updateHash && location.hash.startsWith("#game/")) history.replaceState(null, "", "#library");
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }
  function setSection(section) {
    const labels = { home: "ГЛАВНАЯ", library: "ВСЕ ИГРЫ", favorites: "ИЗБРАННОЕ", updates: "ОБНОВЛЕНИЯ", about: "О ПЛАТФОРМЕ" };
    $("#breadcrumb").textContent = labels[section] || "ГЛАВНАЯ";
    document.querySelectorAll("[data-nav]").forEach(element => element.classList.toggle("is-current", element.dataset.nav === section));
    state.favoritesOnly = section === "favorites";
    if (section === "favorites") { state.category = "all"; state.query = ""; search.value = ""; }
    render();
    if (section === "favorites") $("#library").scrollIntoView({ behavior: "smooth" });
    const sidebar = $("#sidebar");
    sidebar.classList.remove("is-open");
    $("#mobileScrim").classList.remove("is-visible");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  }
  function syncFromHash() {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash.startsWith("game/")) {
      const id = hash.slice(5);
      if (byId.has(id)) showModal(byId.get(id), false);
      return;
    }
    closeModal(false);
    setSection(["library", "favorites", "updates", "about"].includes(hash) ? hash : "home");
  }
  document.addEventListener("click", async event => {
    const favorite = event.target.closest("[data-favorite]");
    if (favorite) {
      const id = favorite.dataset.favorite;
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      render();
      const modalId = location.hash.startsWith("#game/") && location.hash.slice(6);
      if (modalId && byId.has(modalId)) showModal(byId.get(modalId), false);
      toast(favorites.has(id) ? "Добавлено в избранное" : "Удалено из избранного");
      return;
    }
    const open = event.target.closest("[data-open]");
    if (open) { showModal(byId.get(open.dataset.open)); return; }
    const filter = event.target.closest("[data-filter]");
    if (filter) { state.category = filter.dataset.filter; state.favoritesOnly = false; render(); return; }
    const share = event.target.closest("[data-share]");
    if (share) {
      const url = new URL(location.href);
      url.hash = "game/" + share.dataset.share;
      try { await navigator.clipboard.writeText(url.toString()); toast("Ссылка на игру скопирована"); }
      catch (_) { toast("Ссылка: " + url.toString()); }
    }
    const nav = event.target.closest("[data-nav]");
    if (nav) setSection(nav.dataset.nav);
  });
  search.addEventListener("input", () => {
    state.query = search.value;
    state.favoritesOnly = false;
    state.category = "all";
    render();
  });
  $("#sortSelect").addEventListener("change", event => { state.sort = event.target.value; render(); });
  $("#resetFilters").addEventListener("click", () => { state.query = ""; state.category = "all"; state.favoritesOnly = false; search.value = ""; render(); });
  $("#modalClose").addEventListener("click", () => closeModal());
  backdrop.addEventListener("click", event => { if (event.target === backdrop) closeModal(); });
  $("#accountButton").addEventListener("click", () => toast("Аккаунты и друзья появятся на следующем этапе. Сейчас можно пользоваться каталогом."));
  $("#menuToggle").addEventListener("click", () => {
    const open = $("#sidebar").classList.toggle("is-open");
    $("#mobileScrim").classList.toggle("is-visible", open);
    $("#menuToggle").setAttribute("aria-expanded", String(open));
  });
  $("#mobileScrim").addEventListener("click", () => {
    $("#sidebar").classList.remove("is-open");
    $("#mobileScrim").classList.remove("is-visible");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" || (event.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName))) {
      event.preventDefault(); search.focus(); search.select();
    }
    if (event.key === "Escape") {
      if (!backdrop.classList.contains("hidden")) closeModal();
      else if (document.activeElement === search) search.blur();
    }
    if (event.key === "Tab" && !backdrop.classList.contains("hidden")) {
      const elements = [...dialog.querySelectorAll("button, a[href], input, select")].filter(el => !el.disabled);
      if (!elements.length) { event.preventDefault(); dialog.focus(); return; }
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("hashchange", syncFromHash);
  window.addEventListener("popstate", syncFromHash);
  $("#year").textContent = new Date().getFullYear();
  render();
  syncFromHash();
})();