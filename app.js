/* EverTree — protótipo de média fidelidade para IHC.
   Sem bibliotecas externas, backend ou cadastro. O progresso fica neste navegador. */
(() => {
  "use strict";

  const STORAGE_KEY = "evertree-ihc-2026-v1";
  const views = ["jardim", "melhorias", "floresta", "conquistas"];
  const upgrades = [
    { id: "agua", name: "Água fresquinha", icon: "💧", desc: "Uma rega caprichada rende +1 folha por clique.", baseCost: 15, factor: 1.55, kind: "click", gain: 1 },
    { id: "adubo", name: "Adubo natural", icon: "🪴", desc: "Fortaleça suas raízes: +3 folhas por clique.", baseCost: 60, factor: 1.65, kind: "click", gain: 3 },
    { id: "regador", name: "Regador automático", icon: "🚿", desc: "Produz +1 folha por segundo sem precisar clicar.", baseCost: 45, factor: 1.6, kind: "auto", gain: 1 },
    { id: "jardineiro", name: "Jardineiro amigo", icon: "🧑‍🌾", desc: "Cuida de tudo e gera +5 folhas por segundo.", baseCost: 180, factor: 1.72, kind: "auto", gain: 5 }
  ];
  const species = [
    { id: "muda", name: "Muda jovem", icon: "🌱", desc: "Toda grande floresta começa pequena.", threshold: 0, multiplier: 1, art: "sapling" },
    { id: "carvalho", name: "Carvalho", icon: "🌳", desc: "Copa cheia, raízes fortes.", threshold: 120, multiplier: 1.3, art: "oak" },
    { id: "pinheiro", name: "Pinheiro", icon: "🌲", desc: "O verde das regiões montanhosas.", threshold: 500, multiplier: 1.6, art: "pine" },
    { id: "sequoia", name: "Sequoia", icon: "🌲", desc: "A gigante das florestas antigas.", threshold: 1700, multiplier: 2, art: "redwood" }
  ];
  const biomes = [
    { id: "jardim", name: "Jardim ensolarado", icon: "🌼", desc: "Um lugar tranquilo para começar.", threshold: 0, multiplier: 1, art: "sapling" },
    { id: "bosque", name: "Bosque encantado", icon: "🍄", desc: "Mais sombra e ar puro para crescer.", threshold: 650, multiplier: 1.2, art: "pine" },
    { id: "tropical", name: "Floresta tropical", icon: "🌴", desc: "Natureza vibrante por todos os lados.", threshold: 3000, multiplier: 1.5, art: "tropical" }
  ];
  const achievements = [
    { id: "primeiro", name: "Primeira folha", icon: "🌱", desc: "Dê seu primeiro clique.", reached: s => s.clicks >= 1 },
    { id: "dedicado", name: "Mãos à obra", icon: "👆", desc: "Clique 50 vezes na árvore.", reached: s => s.clicks >= 50 },
    { id: "colecionador", name: "Colecionador verde", icon: "🍃", desc: "Produza 150 folhas no total.", reached: s => s.lifetime >= 150 },
    { id: "investidor", name: "Bom de negócio", icon: "🪴", desc: "Compre 3 melhorias.", reached: s => boughtTotal(s) >= 3 },
    { id: "automatico", name: "Jardim independente", icon: "⚙️", desc: "Ative uma produção automática.", reached: s => idleRate(s) > 0 },
    { id: "floresta", name: "Guardião da floresta", icon: "🏅", desc: "Produza 1.000 folhas no total.", reached: s => s.lifetime >= 1000 }
  ];
  const defaultState = () => ({ leaves: 0, lifetime: 0, clicks: 0, owned: { agua: 0, adubo: 0, regador: 0, jardineiro: 0 }, activeSpecies: "muda", activeBiome: "jardim", badges: [], bonusUntil: 0, lastSaved: Date.now() });
  const el = id => document.getElementById(id);
  const format = (n, decimals = 0) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(Math.floor(n * 10 ** decimals) / 10 ** decimals);
  const safeNumber = n => Number.isFinite(n) && n >= 0 ? n : 0;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return defaultState();
      const state = defaultState();
      state.leaves = safeNumber(saved.leaves);
      state.lifetime = safeNumber(saved.lifetime);
      state.clicks = Math.floor(safeNumber(saved.clicks));
      upgrades.forEach(u => { state.owned[u.id] = Math.floor(safeNumber(saved.owned?.[u.id])); });
      state.activeSpecies = species.some(v => v.id === saved.activeSpecies && state.lifetime >= v.threshold) ? saved.activeSpecies : "muda";
      state.activeBiome = biomes.some(v => v.id === saved.activeBiome && state.lifetime >= v.threshold) ? saved.activeBiome : "jardim";
      state.badges = Array.isArray(saved.badges) ? saved.badges.filter(id => achievements.some(a => a.id === id)) : [];
      state.bonusUntil = safeNumber(saved.bonusUntil);
      state.lastSaved = safeNumber(saved.lastSaved) || Date.now();
      const offlineSeconds = Math.min(3600, Math.max(0, (Date.now() - state.lastSaved) / 1000));
      const offlineLeaves = idleRate(state) * offlineSeconds;
      state.leaves += offlineLeaves;
      state.lifetime += offlineLeaves;
      return state;
    } catch (_) { return defaultState(); }
  }
  let state = load();
  let lastTick = performance.now();
  let lastPersist = Date.now();

  function save() {
    state.lastSaved = Date.now();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* Navegadores restritos ainda permitem testar a sessão. */ }
  }
  function boughtTotal(s = state) { return Object.values(s.owned).reduce((sum, value) => sum + value, 0); }
  function idleRate(s = state) { return upgrades.filter(u => u.kind === "auto").reduce((sum, u) => sum + u.gain * s.owned[u.id], 0); }
  function clickRate() {
    const base = 1 + upgrades.filter(u => u.kind === "click").reduce((sum, u) => sum + u.gain * state.owned[u.id], 0);
    const speciesBonus = species.find(v => v.id === state.activeSpecies)?.multiplier || 1;
    const biomeBonus = biomes.find(v => v.id === state.activeBiome)?.multiplier || 1;
    return base * speciesBonus * biomeBonus * (Date.now() < state.bonusUntil ? 2 : 1);
  }
  function forestLevel() { return 1 + Math.floor(state.lifetime / 450); }
  function cost(u) { return Math.ceil(u.baseCost * (u.factor ** state.owned[u.id])); }
  function addLeaves(amount) { state.leaves += amount; state.lifetime += amount; }

  function toast(message, bonus = false) {
    const node = document.createElement("div");
    node.className = "toast" + (bonus ? " bonus" : "");
    node.textContent = message;
    el("toast-stack").append(node);
    window.setTimeout(() => node.remove(), 3300);
  }
  function unlockAchievements(showNotices = true) {
    let changed = false;
    for (const achievement of achievements) {
      if (!state.badges.includes(achievement.id) && achievement.reached(state)) {
        state.badges.push(achievement.id);
        changed = true;
        if (showNotices) {
          state.bonusUntil = Math.max(Date.now(), state.bonusUntil) + 30_000;
          toast(`🏅 ${achievement.name}! Bônus 2× por +30 segundos`, true);
        }
      }
    }
    return changed;
  }
  function floatingText(amount) {
    const node = document.createElement("span");
    node.className = "floating-leaf";
    node.textContent = `+${format(amount, 1)} 🍃`;
    node.style.setProperty("--drift", `${Math.round(Math.random() * 90 - 45)}px`);
    el("view-jardim").querySelector(".scene-card").append(node);
    node.addEventListener("animationend", () => node.remove(), { once: true });
  }
  function collect() {
    const amount = clickRate();
    addLeaves(amount);
    state.clicks += 1;
    const button = el("tree-button");
    button.classList.remove("popped");
    void button.offsetWidth;
    button.classList.add("popped");
    window.setTimeout(() => button.classList.remove("popped"), 130);
    floatingText(amount);
    unlockAchievements();
    save();
    render();
  }
  function purchase(id) {
    const upgrade = upgrades.find(u => u.id === id);
    if (!upgrade) return;
    const price = cost(upgrade);
    if (state.leaves + 1e-9 < price) { toast("Você ainda não tem folhas suficientes."); return; }
    state.leaves = Math.max(0, state.leaves - price);
    state.owned[id] += 1;
    toast(`✅ ${upgrade.name} adquirida!`);
    unlockAchievements();
    save(); render();
  }
  function select(type, id) {
    const options = type === "species" ? species : biomes;
    const option = options.find(v => v.id === id);
    if (!option || state.lifetime < option.threshold) return;
    if (type === "species") state.activeSpecies = id;
    else state.activeBiome = id;
    toast(`${option.icon} Você selecionou: ${option.name}`);
    save(); render();
  }
  function navigate(next) {
    if (!views.includes(next)) return;
    views.forEach(name => el(`view-${name}`).hidden = name !== next);
    document.querySelectorAll("[data-nav]").forEach(button => {
      const active = button.dataset.nav === next;
      if (button.classList.contains("nav-item")) {
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      }
    });
    history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "auto" });
    render();
  }

  function treeGraphic(type) {
    const defs = `<defs><linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#81502e"/><stop offset=".5" stop-color="#b77d43"/><stop offset="1" stop-color="#81512d"/></linearGradient><radialGradient id="leaf" cx=".42" cy=".25" r=".85"><stop stop-color="#98d17a"/><stop offset=".58" stop-color="#5a9e59"/><stop offset="1" stop-color="#337f53"/></radialGradient><radialGradient id="leaf2" cx=".45" cy=".25" r=".8"><stop stop-color="#b0d98a"/><stop offset="1" stop-color="#4b9761"/></radialGradient></defs>`;
    const ground = `<ellipse cx="150" cy="325" rx="75" ry="12" fill="#458747" opacity=".19"/><path d="M87 320q8-12 15 0M191 320q10-14 21-2M119 327q8-10 17-2" stroke="#4d9857" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    if (type === "pine" || type === "redwood") {
      const tall = type === "redwood";
      const pine = `<path d="M137 148L132 325L167 325L163 147Z" fill="url(#trunk)"/><path d="M150 ${tall ? 10 : 35}L65 173L101 163L51 237L98 227L66 286Q151 303 235 286L200 227L248 235L201 162L233 172Z" fill="${tall ? "#357d57" : "#3f8d63"}" stroke="#32734c" stroke-width="3"/><path d="M150 ${tall ? 10 : 35}L92 173L123 160L82 237L123 223L102 281L151 287Z" fill="#70b77a" opacity=".85"/><path d="M150 62L195 170L170 161L211 243L172 233L197 279" fill="none" stroke="#b1d79b" opacity=".35" stroke-width="7" stroke-linecap="round"/>`;
      return `<svg viewBox="0 0 300 350" xmlns="http://www.w3.org/2000/svg">${defs}${ground}${pine}</svg>`;
    }
    if (type === "sapling") {
      return `<svg viewBox="0 0 300 350" xmlns="http://www.w3.org/2000/svg">${defs}${ground}<path d="M142 318Q146 269 136 242Q128 221 125 205" fill="none" stroke="url(#trunk)" stroke-width="22" stroke-linecap="round"/><path d="M139 260Q153 239 179 230" fill="none" stroke="url(#trunk)" stroke-width="10" stroke-linecap="round"/><ellipse cx="111" cy="204" rx="47" ry="45" fill="url(#leaf)"/><ellipse cx="160" cy="195" rx="54" ry="52" fill="url(#leaf)"/><ellipse cx="172" cy="225" rx="41" ry="37" fill="url(#leaf2)"/><ellipse cx="130" cy="167" rx="42" ry="35" fill="url(#leaf2)"/><circle cx="105" cy="185" r="8" fill="#c1e699" opacity=".8"/><circle cx="151" cy="166" r="7" fill="#cae99e" opacity=".85"/><circle cx="186" cy="206" r="6" fill="#cae99e" opacity=".75"/></svg>`;
    }
    return `<svg viewBox="0 0 300 350" xmlns="http://www.w3.org/2000/svg">${defs}${ground}<path d="M136 325Q146 262 142 204L114 178L122 169L154 200L179 160L190 166L164 213Q163 264 171 325Z" fill="url(#trunk)"/><path d="M152 245Q148 281 154 321" stroke="#d09b59" stroke-width="5" opacity=".5" fill="none"/><circle cx="111" cy="155" r="58" fill="url(#leaf)"/><circle cx="174" cy="146" r="66" fill="url(#leaf2)"/><circle cx="150" cy="97" r="62" fill="url(#leaf)"/><circle cx="210" cy="186" r="53" fill="url(#leaf)"/><circle cx="88" cy="207" r="48" fill="url(#leaf2)"/><circle cx="145" cy="197" r="60" fill="url(#leaf)"/><circle cx="109" cy="103" r="37" fill="url(#leaf2)"/><circle cx="195" cy="107" r="38" fill="url(#leaf2)"/><g fill="#b5dd8b" opacity=".75"><circle cx="107" cy="118" r="7"/><circle cx="166" cy="75" r="7"/><circle cx="194" cy="143" r="8"/><circle cx="98" cy="198" r="8"/><circle cx="161" cy="189" r="7"/><circle cx="217" cy="196" r="6"/></g></svg>`;
  }

  function upgradeCard(u) {
    const price = cost(u), canBuy = state.leaves >= price;
    const output = u.kind === "click" ? `+${u.gain} por clique` : `+${u.gain} por segundo`;
    return `<article class="upgrade-card"><div class="upgrade-emoji" aria-hidden="true">${u.icon}</div><div><h3>${u.name}</h3><p>${u.desc}</p><div class="owned-line">${output} · ${state.owned[u.id]} comprado(s)</div><button class="buy-button" data-buy="${u.id}" ${canBuy ? "" : "disabled"}><span>${canBuy ? "Comprar melhoria" : "Folhas insuficientes"}</span><span>🍃 ${format(price)}</span></button></div></article>`;
  }
  function discoveryCard(item, type) {
    const unlocked = state.lifetime >= item.threshold;
    const selected = (type === "species" ? state.activeSpecies : state.activeBiome) === item.id;
    const progress = item.threshold ? Math.min(100, (state.lifetime / item.threshold) * 100) : 100;
    const buttonLabel = selected ? "✓ Em uso" : unlocked ? "Selecionar" : "🔒 Bloqueado";
    return `<article class="discovery-card ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}"><div class="discovery-art ${item.art} ${unlocked ? "" : "locked-art"}"><span aria-hidden="true">${item.icon}</span>${unlocked ? "" : '<span class="lock-overlay" aria-label="Bloqueado">🔒</span>'}</div><div class="discovery-copy"><h3>${item.name}</h3><p>${item.desc}</p><span class="discovery-meta">${item.multiplier}× multiplicador</span>${unlocked ? "" : `<div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><span class="unlock-hint">${format(state.lifetime)} / ${format(item.threshold)} folhas totais</span>`}<button class="select-button ${selected ? "selected" : ""}" data-select="${type}" data-id="${item.id}" ${selected || !unlocked ? "disabled" : ""}>${buttonLabel}</button></div></article>`;
  }
  function achievementCard(a) {
    const done = state.badges.includes(a.id);
    return `<article class="achievement-card ${done ? "achieved" : ""}"><span class="medal-icon" aria-hidden="true">${a.icon}</span><div><h3>${a.name}</h3><p>${a.desc}</p><span class="achievement-state">${done ? "✓ CONQUISTADA" : "◌ A DESCOBRIR"}</span></div></article>`;
  }

  function render() {
    const leafCount = format(state.leaves), perClick = format(clickRate(), 1), perSecond = format(idleRate());
    el("top-leaves").textContent = leafCount;
    el("garden-leaves").textContent = leafCount;
    el("click-rate").textContent = `+${perClick} 🍃`;
    el("idle-rate").textContent = `+${perSecond} 🍃`;
    el("header-level").textContent = `Floresta nível ${forestLevel()}`;
    el("upgrade-balance").textContent = `${leafCount} folhas disponíveis`;
    const speciesActive = species.find(v => v.id === state.activeSpecies);
    el("scene-species").textContent = `${speciesActive.icon} ${speciesActive.name}`;
    const picture = el("tree-illustration");
    if (picture.dataset.species !== state.activeSpecies) {
      picture.innerHTML = treeGraphic(state.activeSpecies === "muda" ? "sapling" : state.activeSpecies === "carvalho" ? "oak" : state.activeSpecies === "pinheiro" ? "pine" : "redwood");
      picture.dataset.species = state.activeSpecies;
    }
    el("view-jardim").querySelector(".scene-card").dataset.biome = state.activeBiome;
    const boostRemaining = Math.ceil((state.bonusUntil - Date.now()) / 1000);
    document.querySelector(".summary-description").textContent = boostRemaining > 0 ? `⚡ Bônus 2× ativo por mais ${boostRemaining}s` : "Use suas folhas para melhorar o jardim";
    const lockedDiscoveries = [...species, ...biomes].filter(v => state.lifetime < v.threshold).sort((a, b) => a.threshold - b.threshold);
    const goal = lockedDiscoveries[0];
    if (goal) {
      el("next-goal-name").textContent = goal.name;
      el("next-goal-desc").textContent = "Desbloqueie uma nova descoberta";
      el("next-goal-count").textContent = `${format(state.lifetime)} / ${format(goal.threshold)}`;
      el("next-goal-progress").style.width = `${Math.min(100, state.lifetime / goal.threshold * 100)}%`;
    } else {
      el("next-goal-name").textContent = "Floresta completa!";
      el("next-goal-desc").textContent = "Você descobriu tudo por enquanto";
      el("next-goal-count").textContent = "100%";
      el("next-goal-progress").style.width = "100%";
    }
    el("click-upgrades").innerHTML = upgrades.filter(u => u.kind === "click").map(upgradeCard).join("");
    el("auto-upgrades").innerHTML = upgrades.filter(u => u.kind === "auto").map(upgradeCard).join("");
    el("species-grid").innerHTML = species.map(v => discoveryCard(v, "species")).join("");
    el("biome-grid").innerHTML = biomes.map(v => discoveryCard(v, "biome")).join("");
    el("unlocked-total").textContent = `${species.length + biomes.length - lockedDiscoveries.length} de 7 descobertos`;
    el("stat-clicks").textContent = format(state.clicks);
    el("stat-total").textContent = format(state.lifetime);
    el("stat-level").textContent = format(forestLevel());
    el("stat-idle").textContent = format(idleRate());
    el("achievement-total").textContent = `${state.badges.length} de 6 conquistas`;
    el("badge-count").textContent = `${state.badges.length} / 6`;
    el("achievements-grid").innerHTML = achievements.map(achievementCard).join("");
  }

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-nav]");
    if (nav) { navigate(nav.dataset.nav); return; }
    const buying = event.target.closest("[data-buy]");
    if (buying) { purchase(buying.dataset.buy); return; }
    const choosing = event.target.closest("[data-select]");
    if (choosing) { select(choosing.dataset.select, choosing.dataset.id); }
  });
  el("tree-button").addEventListener("click", collect);
  el("demo-button").addEventListener("click", () => {
    state = defaultState();
    state.leaves = 780;
    state.lifetime = 1280;
    state.clicks = 80;
    state.owned = { agua: 2, adubo: 1, regador: 2, jardineiro: 1 };
    state.activeSpecies = "carvalho";
    state.activeBiome = "bosque";
    unlockAchievements(false);
    save(); render(); toast("🧪 Progresso de demonstração carregado!");
  });
  el("reset-button").addEventListener("click", () => {
    if (!window.confirm("Recomeçar o EverTree? Todo o progresso salvo neste navegador será apagado.")) return;
    state = defaultState();
    save(); render(); toast("🌱 Seu jardim está pronto para recomeçar.");
  });
  window.addEventListener("pagehide", save);
  window.addEventListener("hashchange", () => navigate(location.hash.slice(1) || "jardim"));
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.setInterval(() => {
    const now = performance.now();
    const seconds = Math.min(3600, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    const amount = idleRate() * seconds;
    if (amount) addLeaves(amount);
    unlockAchievements();
    render();
    if (Date.now() - lastPersist > 2500) { save(); lastPersist = Date.now(); }
  }, 350);
  unlockAchievements(false);
  navigate(views.includes(location.hash.slice(1)) ? location.hash.slice(1) : "jardim");
  save();
})();
