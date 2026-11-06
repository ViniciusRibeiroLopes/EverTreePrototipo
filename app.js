/* EverTree UI: renders the independent simulation, saves, accessible charts and procedural feedback. */
(() => {
  "use strict";
  const E = window.EverTree,
    $ = (id) => document.getElementById(id),
    KEY = "evertree-ihc-2026-v2",
    OLD = "evertree-ihc-2026-v1";
  const names = {
    jardim: "Floresta",
    floresta: "Coleção",
    melhorias: "Recursos & melhorias",
    laboratorio: "Laboratório",
    global: "Legado",
    conquistas: "Diário da floresta",
    configuracoes: "Preferências & save",
  };
  const fmt = (v, d = 0) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(v);
  const duration = (n) =>
    n >= 3600 ? `${fmt(n / 3600, 1)} h` : `${fmt(n / 60, 1)} min`;
  const audio = new window.ForestAudio();
  let state = E.fresh(),
    demo = false,
    realState = null,
    currentView = "jardim",
    persistAt = 0,
    dirty = false,
    loadNote = "",
    cardQueue = [],
    seenEvent = false,
    lastChartIndex = { production: 0, click: 0 };
  let offline = null;
  try {
    const raw = localStorage.getItem(KEY),
      old = localStorage.getItem(OLD);
    if (raw) {
      state = E.decode(raw);
      offline = E.advance(state, Date.now(), false);
      cardQueue.push(...offline.unlocks);
    } else if (old) {
      state = E.migrate(JSON.parse(old));
      loadNote =
        "Seu progresso anterior foi migrado. O save original foi preservado.";
    }
  } catch (error) {
    loadNote =
      "Não foi possível carregar o save. A cópia existente foi preservada; exporte a sessão antes de importar uma cópia válida.";
    dirty = true;
  }
  function toast(message, error = false) {
    const n = document.createElement("div");
    n.className = "toast" + (error ? " error" : "");
    n.textContent = message;
    $("toast-stack").append(n);
    setTimeout(() => n.remove(), 4800);
    while ($("toast-stack").children.length > 3)
      $("toast-stack").firstElementChild.remove();
  }
  function persist() {
    if (demo || dirty) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      $("save-status").textContent =
        "Salvo neste navegador · " +
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
    } catch {
      $("save-status").textContent =
        "Armazenamento indisponível. Baixe um JSON para preservar o progresso.";
    }
  }
  function sync(online = !document.hidden) {
    const r = E.advance(state, Date.now(), online);
    cardQueue.push(...r.unlocks);
    return r;
  }
  function action(fn) {
    sync();
    const result = fn();
    if (result?.message) toast(result.message, !result.ok);
    E.unlock(state);
    persist();
    render();
    showNextCard();
    return result;
  }
  function text(id, value) {
    if ($(id).textContent !== String(value)) $(id).textContent = value;
  }
  function html(id, value) {
    const root = $(id);
    if (root._html === value) return;
    const focus = root.contains(document.activeElement)
      ? document.activeElement
      : null;
    const key = focus?.dataset.action,
      sub = focus?.dataset.id;
    root.innerHTML = value;
    root._html = value;
    if (key) {
      const next = [...root.querySelectorAll("[data-action]")].find(
        (x) => x.dataset.action === key && x.dataset.id === sub,
      );
      if (next && !next.disabled) next.focus({ preventScroll: true });
    }
  }
  function treeSVG(id, small = false) {
    const t = E.SPECIES.find((t) => t.id === id) || E.SPECIES[0],
      color = t.color;
    const tall = id === "sequoia" || id === "lumina";
    let canopy = tall
      ? `<path d="M150 12 75 135h26l-49 78h35l-35 59q96 30 196 0l-35-59h35l-49-78h26Z" fill="${color}"/><path d="m150 24-51 108h25l-44 75h35l-26 61 61 13Z" fill="#ffffff" opacity=".14"/><path d="m161 88 26 48m-20 25 28 48m-23 22 25 34" stroke="#ffffff" stroke-width="5" opacity=".15" stroke-linecap="round"/>`
      : `<path d="M73 209Q30 182 59 137Q43 96 91 83Q104 33 152 54Q206 21 228 79Q279 91 251 140Q284 182 242 211Q203 242 157 214Q110 244 73 209Z" fill="${color}"/><path d="M61 133Q57 101 98 91Q108 49 153 67Q192 47 214 79Q167 76 152 115Q107 100 95 147Z" fill="#ffffff" opacity=".16"/><path d="M77 189q44 16 69-17 43 34 93-4" stroke="#194b32" stroke-width="20" opacity=".10" fill="none" stroke-linecap="round"/><g fill="#f8f1b6" opacity="${id === "ipe" ? 0.75 : 0.3}"><circle cx="99" cy="107" r="5"/><circle cx="157" cy="82" r="5"/><circle cx="204" cy="107" r="6"/><circle cx="80" cy="159" r="4"/><circle cx="183" cy="166" r="5"/><circle cx="226" cy="180" r="4"/><circle cx="120" cy="193" r="5"/></g>`;
    const scale = id === "muda" ? "translate(46 104) scale(.68)" : "";
    return `<svg viewBox="0 0 300 350" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="150" cy="326" rx="${small ? 60 : 70}" ry="9" fill="#315a3b" opacity=".12"/><g transform="${scale}"><path d="M135 326q14-79 5-146l-30-31 8-9 31 30 27-39 11 7-25 44q-2 77 10 144Z" fill="#8b6b45"/><path d="M151 199q-3 75 4 122" stroke="#c0a073" stroke-width="5" opacity=".5"/><g class="tree-crown">${canopy}</g></g><path d="m103 325-7-10m12 10 3-14m80 14 6-13m-1 14 10-6" stroke="#718d50" stroke-width="3" stroke-linecap="round"/></svg>`;
  }
  function setSelect(id, items) {
    const el = $(id),
      prev = el.value,
      markup = items
        .map(
          (x) =>
            `<option value="${x.id}" ${x.disabled ? "disabled" : ""}>${x.name}</option>`,
        )
        .join("");
    if (el._options !== markup) {
      el.innerHTML = markup;
      el._options = markup;
      if (items.some((x) => x.id === prev && !x.disabled)) el.value = prev;
    }
  }
  function navigate(view, focus = false) {
    if (!names[view]) view = 'jardim';
    currentView = view;
    Object.keys(names).filter(v => v !== 'jardim').forEach(v => $('view-'+v).hidden = v !== view);
    document.querySelectorAll('[data-nav]').forEach(b => {
      const active = b.dataset.nav === view;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
    text('breadcrumb', names[view]);
    history.replaceState(null,'','#'+view);
    const panel=$('game-panel');
    if(view==='jardim') { if(panel.open)panel.close(); }
    else if(!panel.open)panel.showModal();
    if(view!=='jardim')$('game-panel').querySelector('.panel-content').scrollTop=0;
    render();
    if(focus && view==='jardim')$('tree-button').focus({preventScroll:true});
  }

  function resourceCards() {
    const b = E.budget(state),
      cap = E.capacities(state);
    return [
      ["water", "Água", "◈"],
      ["soil", "Nutrientes", "♧"],
      ["sun", "Luz solar", "☼"],
    ]
      .map(
        ([id, label, icon], i) =>
          `<div class="resource-card ${id} ${state.resources[id] < 15 ? "low" : ""}"><span class="resource-icon">${icon}</span><span class="resource-name">${label}</span><strong class="resource-count">${fmt(state.resources[id])} <small>/ ${cap[id]}</small></strong><div class="resource-flow"><span class="${b.income[i] < b.demand[i] ? "negative" : ""}">+${fmt(b.income[i], 1)} / −${fmt(b.demand[i], 1)} por s</span><button class="resource-action" data-action="tend" data-id="${id}" aria-label="${id === "water" ? "Coletar água" : id === "soil" ? "Compostar nutrientes" : "Captar luz solar"}: mais 12">${id === "water" ? "Coletar" : id === "soil" ? "Compostar" : "Captar"} +12</button></div><div class="resource-bar"><i style="width:${(state.resources[id] / cap[id]) * 100}%"></i></div></div>`,
      )
      .join("");
  }
  // Preserve focus in resource controls: create once, then update existing values only.
  function renderResources(rootId) {
    const root = $(rootId);
    if (!root.children.length) root.innerHTML = resourceCards();
    const b = E.budget(state),
      cap = E.capacities(state);
    ["water", "soil", "sun"].forEach((id, i) => {
      const card = root.children[i];
      card.classList.toggle("low", state.resources[id] < 15);
      card.querySelector(".resource-count").innerHTML =
        `${fmt(state.resources[id])} <small>/ ${cap[id]}</small>`;
      const flow = card.querySelector(".resource-flow>span");
      flow.className = b.income[i] < b.demand[i] ? "negative" : "";
      flow.textContent = `+${fmt(b.income[i], 1)} / −${fmt(b.demand[i], 1)} por s`;
      card.querySelector(".resource-bar i").style.width =
        (state.resources[id] / cap[id]) * 100 + "%";
    });
  }
  function renderScene() {
    const r=E.recovery(state), c=E.climate(state), scene=$('scene');
    const bio=E.BIOMES.find(b=>b.id===state.biome),sp=E.SPECIES.find(t=>t.id===state.activeSpecies);
    scene.style.setProperty('--sky-top',`hsl(${170+r*.23} ${8+r*.28}% ${60+r*.19}%)`);
    scene.style.setProperty('--sky-bottom',`hsl(${58+r*.3} ${17+r*.21}% 79%)`);
    scene.style.setProperty('--far',`hsl(${95+r*.24} ${10+r*.13}% ${48+r*.17}%)`);
    scene.style.setProperty('--middle',`hsl(${85+r*.22} ${12+r*.15}% ${40+r*.21}%)`);
    scene.style.setProperty('--near',`hsl(${42+r*.54} ${19+r*.12}% ${38+r*.18}%)`);
    scene.style.setProperty('--life',Math.max(0,(r-45)/55));scene.style.setProperty('--debris',Math.max(0,1-r/55));scene.style.setProperty('--river',Math.min(1,Math.max(0,(r-25)/40)));scene.dataset.weather=c.weather;
    document.body.style.setProperty('--forest-life',r/100);
    text('scene-biome',bio.name);text('weather',`${c.icon} ${c.name}`);
    $('weather').title=`${c.season} · muda em ${c.remaining}s. Clique para ver os efeitos.`;
    text('scene-species',sp.name);
    if($('tree-art').dataset.tree!==sp.id){$('tree-art').innerHTML=treeSVG(sp.id);$('tree-art').dataset.tree=sp.id;}
    const treeKey=JSON.stringify(state.trees);
    if($('forest-decoration').dataset.key!==treeKey){
      const planted=E.SPECIES.flatMap(t=>Array.from({length:Math.min(3,state.trees[t.id])},()=>t.id)).slice(0,14);
      const spots=[[340,426,.7],[160,419,.55],[730,435,.7],[525,377,.45],[85,360,.4],[810,352,.4],[250,347,.4],[650,350,.4],[425,350,.38],[45,460,.65],[860,475,.7],[575,450,.65],[125,490,.5],[360,505,.6]];
      $('forest-decoration').innerHTML=planted.map((id,i)=>{const [x,y,k]=spots[i];return `<g transform="translate(${x-150*k} ${y-326*k}) scale(${k})">${treeSVG(id).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;}).join('');
      $('forest-decoration').dataset.key=treeKey;
    }
    text('world-caption',r<20?'Uma semente. Um recomeço.':r<50?'As raízes estão despertando.':r<85?'A vida está voltando.':'O mundo ficou um pouco mais verde.');
    text('recovery-percent',fmt(r)+'%');$('recovery-bar').style.width=r+'%';
    const locked=E.SPECIES.find(t=>!t.hybrid&&!state.discovered.includes(t.id));
    text('next-name',locked?locked.name:E.canPrestige(state)?'Uma nova expedição':'Floresta recuperada');
    text('next-progress-label',locked?`${fmt(state.lifetime)} / ${fmt(locked.threshold)}`:fmt(r)+'%');
    $('next-progress').style.width=Math.min(100,locked?state.lifetime/locked.threshold*100:r)+'%';
    $('next-unlock').dataset.nav=locked?'floresta':'global';
    text('water-button',`◈ ${state.cans}`);$('water-button').disabled=state.cans<1;
    $('water-button').setAttribute('aria-label',`Usar regador. ${state.cans} disponíveis.`);
    $('water-button').classList.toggle('needed',c.weather==='seca'&&state.wateredUntil<=state.age);
    const b=E.budget(state), cap=E.capacities(state);
    if(!$('quick-resources').children.length)$('quick-resources').innerHTML=[['water','◈','Água'],['soil','♧','Solo'],['sun','☼','Luz']].map(([id,icon,label])=>`<button class="resource-orb ${id}" data-action="tend" data-id="${id}"><span>${icon}</span><small>${label}</small><i><em></em></i></button>`).join('');
    [...$('quick-resources').children].forEach((button,i)=>{const key=['water','soil','sun'][i],level=state.resources[key]/cap[key];button.querySelector('em').style.width=level*100+'%';button.classList.toggle('low',level<.2);const label=`${['Água','Nutrientes','Luz'][i]}: ${fmt(state.resources[key])}/${cap[key]}. Entrada +${fmt(b.income[i],1)}/s; consumo ${fmt(b.demand[i],1)}/s. Clique: +12.`;button.title=label;button.setAttribute('aria-label',label);});
    const shortage=b.efficiency<.99, damage=state.damageUntil>state.age;
    $('care-warning').hidden=!shortage&&!damage;
    text('care-warning',damage?`♧ Recuperando · ${state.damageUntil-state.age}s`:'⚠ Recursos baixos · cuidar');
    $('event-box').hidden=!state.event;$('event-alert').hidden=!state.event;
    if(state.event){const e=state.event,fire=e.type==='fire';text('event-alert',`⚠ ${e.left}s`);$('event-box').className='event-box '+(fire?'fire':'');text('event-copy',`${fire?'🔥 Incêndio!':'🐛 Pragas!'} · ${e.left}s`);text('event-action',`${fire?'Apagar':'Espantar'} · ${e.hits}/${e.target}`);$('event-action').setAttribute('aria-label',fire?'Apagar foco de incêndio':'Espantar pragas');$('event-action').title='Complete 8 ações. Falha: produção −35% por 90s.';$('event-progress').style.width=e.hits/e.target*100+'%';if(!seenEvent){toast(fire?'🔥 Proteja sua floresta!':'🐛 Pragas na floresta!');seenEvent=true;}}else seenEvent=false;
    audio.update(r,c.weather);
    renderShop();renderGrove();
  }
  let shopTab='trees';
  const shortNames={muda:'Muda pioneira',ipe:'Ipê-amarelo',jacaranda:'Jacarandá',sequoia:'Sequoia',aurora:'Aurora',lumina:'Lúmina',luvas:'Luvas de cultivo',cisterna:'Cisterna',composto:'Composteira',luz:'Clareira',viveiro:'Viveiro'};
  function renderShop(){
    const items=shopTab==='trees'?E.SPECIES:E.UPGRADES;
    const next=E.SPECIES.find(t=>!t.hybrid&&!state.discovered.includes(t.id));
    const visible=items.filter(t=>shopTab!=='trees'||state.discovered.includes(t.id)||t.id===next?.id);
    const signature=JSON.stringify([shopTab,visible.map(t=>t.id),state.discovered,state.biome]);
    if($('shop-items').dataset.signature!==signature){
      html('shop-items',visible.map(t=>{const locked=shopTab==='trees'&&!state.discovered.includes(t.id);return `<div class="shop-row ${locked?'locked':''}"><button class="shop-buy" data-shop-buy="${shopTab==='trees'?'tree':'upgrade'}" data-id="${t.id}"><span class="shop-art">${locked?'<span class="unknown-tree">?</span>':shopTab==='trees'?treeSVG(t.id,true):`<span class="upgrade-glyph">${t.icon}</span>`}</span><span class="shop-copy"><strong>${locked?'???':shortNames[t.id]}</strong><small class="shop-price"></small></span><b class="shop-owned"></b></button><button class="shop-info" data-action="${shopTab==='trees'?'fact':'upgrade-info'}" data-id="${t.id}" aria-label="Detalhes: ${t.name}">i</button></div>`;}).join(''));
      $('shop-items').dataset.signature=signature;
    }
    [...$('shop-items').querySelectorAll('.shop-row')].forEach((row,i)=>{const item=visible[i],tree=shopTab==='trees',locked=tree&&!state.discovered.includes(item.id),allowed=!tree||E.eligible(state,item),price=E.cost(state,tree?'tree':'upgrade',item.id),count=(tree?state.trees:state.upgrades)[item.id],button=row.querySelector('.shop-buy');
      row.querySelector('.shop-price').textContent=locked?`🔒 ${fmt(item.threshold)} folhas totais`:!allowed?'Outro bioma':`❧ ${fmt(price)}`;
      row.querySelector('.shop-owned').textContent=locked?'':count;
      button.disabled=locked||!allowed||state.leaves<price||count>=100;
      button.setAttribute('aria-label',locked?`Descobrir ${item.name} em ${item.threshold} folhas`:`Comprar ${item.name} por ${price} folhas. ${count} em uso.`);
      button.title=locked?`Produza ${item.threshold} folhas para descobrir.`:tree?`+${fmt(item.rate,1)} folhas/s de base por árvore. Clique em i para saber mais.`:item.desc;
      row.classList.toggle('affordable',!button.disabled);
    });
  }
  function renderGrove(){
    const trees=E.SPECIES.filter(t=>state.trees[t.id]>0),count=Object.values(state.trees).reduce((a,b)=>a+b,0);
    text('tree-count',`${count} ${count===1?'árvore':'árvores'}`);
    const signature=JSON.stringify([state.trees,state.activeSpecies]);
    if($('grove-rows').dataset.signature===signature)return;
    html('grove-rows',trees.map(t=>`<button class="grove-row ${state.activeSpecies===t.id?'selected':''}" data-action="display" data-id="${t.id}" title="Exibir ${t.name} como árvore principal"><span class="grove-name">${shortNames[t.id]} <b>×${state.trees[t.id]}</b></span><span class="grove-sprites" aria-hidden="true">${Array.from({length:Math.min(9,state.trees[t.id])},()=>treeSVG(t.id,true)).join('')}</span></button>`).join('')+(trees.length<2?'<div class="grove-empty"><span>✧</span> Sua próxima árvore está na loja →</div>':''));
    $('grove-rows').dataset.signature=signature;
  }

  function renderSpecies() {
    const signature = JSON.stringify([
      state.trees,
      state.discovered,
      state.biome,
    ]);
    if ($("species-grid").dataset.signature !== signature) {
      html(
        "species-grid",
        E.SPECIES.map((t) => {
          const unlocked = state.discovered.includes(t.id),
            allowed = E.eligible(state, t);
          return `<article class="species-card ${unlocked ? "" : "locked"}"><div class="species-art">${treeSVG(t.id, true)}<span class="species-owned">${state.trees[t.id]} plantada(s)</span></div><div class="species-copy"><h3>${t.name}</h3><span class="latin">${t.latin}</span><p>${t.hybrid ? "Espécie fictícia de coleção." : t.region === "temperada" ? "Nativa da costa do Pacífico dos EUA." : t.id === "muda" ? "O começo da sua recuperação." : "Espécie nativa do Brasil."} Base: ${fmt(t.rate, 1)} folhas/s.</p><div class="species-needs"><span>◈ ${fmt(t.needs[0], 2)}</span><span>♧ ${fmt(t.needs[1], 2)}</span><span>☼ ${fmt(t.needs[2], 2)} /s</span></div><div class="card-status">${!unlocked ? (t.hybrid ? "Descubra no laboratório." : `Descoberta em ${fmt(t.threshold)} folhas totais.`) : !allowed ? "Plante em uma expedição no bioma de origem." : "Disponível neste ecossistema."}</div><button class="primary-button" data-action="plant" data-id="${t.id}" ${!allowed ? "disabled" : ""}></button><button class="text-button" data-action="fact" data-id="${t.id}">Conhecer a espécie ↗</button>${state.trees[t.id] > 0 ? `<button class="text-button" data-action="display" data-id="${t.id}">Exibir no cenário</button>` : ""}</div></article>`;
        }).join(""),
      );
      $("species-grid").dataset.signature = signature;
    }
    document.querySelectorAll("[data-action=plant]").forEach((btn) => {
      const t = E.SPECIES.find((t) => t.id === btn.dataset.id),
        cost = E.cost(state, "tree", t.id);
      btn.textContent = `Plantar · ${fmt(cost)} folhas`;
      btn.disabled =
        !E.eligible(state, t) ||
        state.leaves < cost ||
        state.trees[t.id] >= 100;
    });
  }
  function renderUpgrades() {
    if (!$("upgrades-grid").children.length)
      html(
        "upgrades-grid",
        E.UPGRADES.map(
          (u) =>
            `<article class="upgrade-card"><div class="upgrade-icon">${u.icon}</div><div><h3>${u.name}</h3><p>${u.desc}</p><small id="level-${u.id}"></small><button class="primary-button" data-action="upgrade" data-id="${u.id}"></button></div></article>`,
        ).join(""),
      );
    E.UPGRADES.forEach((u) => {
      text("level-" + u.id, `Nível ${state.upgrades[u.id]} / 100`);
      const b = document.querySelector(
          `[data-action=upgrade][data-id=${u.id}]`,
        ),
        cost = E.cost(state, "upgrade", u.id);
      b.textContent = `Melhorar · ${fmt(cost)} folhas`;
      b.disabled = state.leaves < cost || state.upgrades[u.id] >= 100;
    });
  }
  function renderGlobal() {
    text("seed-count", state.meta.seeds);
    text(
      "prestige-status",
      `${fmt(state.lifetime)} / 5.000 · ${fmt(E.recovery(state))}%`,
    );
    $("prestige-bar").style.width = Math.min(100, state.lifetime / 50) + "%";
    text(
      "prestige-description",
      E.canPrestige(state)
        ? `Sua doação rende ${E.prestigeReward(state)} sementes ancestrais. Cada habilidade continua com você.`
        : "Recupere 100% do ecossistema e produza 5.000 folhas nesta expedição.",
    );
    $("prestige-button").disabled = !E.canPrestige(state);
    setSelect(
      "next-biome",
      E.BIOMES.map((b) => ({
        ...b,
        name:
          b.name +
          (b.id !== "atlantica" && !state.meta.skills.biomes
            ? " · requer Horizontes vivos"
            : ""),
        disabled: b.id !== "atlantica" && !state.meta.skills.biomes,
      })),
    );
    const signature = JSON.stringify(state.meta.skills);
    if ($("skill-grid").dataset.signature !== signature) {
      html(
        "skill-grid",
        E.SKILLS.map(
          (k, i) =>
            `<article class="skill-card"><div class="skill-number">0${i + 1} <span>⤴</span></div><h3>${k.name}</h3><p>${k.desc}</p><small>Nível ${state.meta.skills[k.id]} / ${k.max}</small><button class="secondary-button" data-action="skill" data-id="${k.id}"></button></article>`,
        ).join(""),
      );
      $("skill-grid").dataset.signature = signature;
    }
    E.SKILLS.forEach((k) => {
      const b = document.querySelector(`[data-action=skill][data-id=${k.id}]`),
        cost = E.skillCost(state, k.id),
        max = state.meta.skills[k.id] >= k.max;
      b.textContent = max
        ? "Habilidade completa"
        : `Desbloquear · ${cost} sementes`;
      b.disabled =
        max ||
        state.meta.seeds < cost ||
        !!(k.requires && !state.meta.skills[k.requires]);
    });
    html(
      "archive-list",
      state.meta.archives.length
        ? state.meta.archives
            .slice()
            .reverse()
            .map(
              (a) =>
                `<div class="archive-row"><strong>${E.BIOMES.find((b) => b.id === a.biome).name}</strong><span>${fmt(a.trees)} árvores · ${fmt(a.leaves)} folhas produzidas</span></div>`,
            )
            .join("")
        : '<div class="empty-state">Sua primeira floresta doada será registrada aqui.</div>',
    );
  }
  function renderStats() {
    const b = E.budget(state);
    html(
      "stats-grid",
      [
        [fmt(state.clicks), "Cliques nesta expedição"],
        [fmt(state.lifetime), "Folhas produzidas"],
        [fmt(b.rate * 60, 1), "Folhas por minuto"],
        [state.meta.donations, "Florestas doadas"],
      ]
        .map(
          ([value, label]) =>
            `<div class="stat-box"><span>${label}</span><strong>${value}</strong></div>`,
        )
        .join(""),
    );
    html(
      "achievements-grid",
      E.BADGES.map(
        (x) =>
          `<article class="badge ${state.badges.includes(x.id) ? "achieved" : ""}"><span>${state.badges.includes(x.id) ? "✧" : "◇"}</span><h3>${x.name}</h3><p>${x.desc}</p><small>${state.badges.includes(x.id) ? "CONQUISTADO" : "A DESCOBRIR"}</small></article>`,
      ).join(""),
    );
    const distribution = Object.fromEntries(E.BIOMES.map((b) => [b.id, 0]));
    distribution[state.biome] = Object.values(state.trees).reduce(
      (a, b) => a + b,
      0,
    );
    state.meta.archives.forEach((a) => (distribution[a.biome] += a.trees));
    const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
    html(
      "biome-chart",
      E.BIOMES.map(
        (b) =>
          `<div class="biome-row"><span>${b.name}</span><div><i style="width:${(distribution[b.id] / total) * 100}%"></i></div><span>${fmt((distribution[b.id] / total) * 100)}%</span></div>`,
      ).join(""),
    );
    drawCharts();
  }
  function render() {
    
    text("garden-leaves", fmt(state.leaves));
    text("click-rate", "+" + fmt(E.clickRate(state), 1));
    text("idle-rate", "+" + fmt(E.budget(state).rate, 1));
    document.body.classList.toggle("reduced-motion", !state.settings.motion);
    document.body.classList.toggle("demo", demo);
    $("demo-banner").hidden = !demo;
    $("exit-demo").hidden = !demo;
    $("demo-button").hidden = demo;
    text("sound-toggle", audio.enabled ? "♫" : "♪");
    $("sound-toggle").title=audio.enabled ? "Desligar som" : "Ativar som";
    $("sound-toggle").setAttribute("aria-label", $("sound-toggle").title);
    $("sound-toggle").setAttribute("aria-pressed", String(audio.enabled));
    $("sound-setting").checked = audio.enabled;
    $("motion-setting").checked = state.settings.motion;
    renderScene();
    
    if (currentView === "melhorias") {
      renderResources("resource-detail");
      renderUpgrades();
    }
    if (currentView === "floresta") renderSpecies();
    if (currentView === "global") renderGlobal();
    if (currentView === "conquistas") renderStats();
    if (currentView === "laboratorio") {
      const available = E.SPECIES.filter((t) => state.trees[t.id] > 0);
      setSelect("parent-a", available);
      setSelect("parent-b", available);
      if ($("parent-a").value === $("parent-b").value && available.length > 1)
        $("parent-b").value = available.find(
          (t) => t.id !== $("parent-a").value,
        ).id;
      text(
        "hybrid-count",
        `${state.discovered.filter((id) => ["aurora", "lumina"].includes(id)).length} de 2 descobertas · tentativa ${state.hybridAttempts + 1}`,
      );
      $("cross-button").disabled =
        available.length < 2 ||
        state.leaves < 180 ||
        state.resources.water < 25 ||
        state.resources.soil < 25;
    }
  }
  function dialog(title, body, buttons = [], art = "") {
    text("dialog-title", title);
    $("dialog-body").replaceChildren();
    if (typeof body === "string") {
      const p = document.createElement("p");
      p.textContent = body;
      $("dialog-body").append(p);
    } else $("dialog-body").append(body);
    $("dialog-art").className = art ? "dialog-art" : "";
    $("dialog-art").innerHTML = art;
    $("dialog-actions").replaceChildren();
    buttons.forEach(({ label, run, primary }) => {
      const btn = document.createElement("button");
      btn.className = primary ? "primary-button" : "secondary-button";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        $("info-dialog").close();
        run?.();
      });
      $("dialog-actions").append(btn);
    });
    if (!$("info-dialog").open) $("info-dialog").showModal();
  }
  function fact(id, discovery = false) {
    const t = E.SPECIES.find((t) => t.id === id);
    if (!t) return;
    text(
      "dialog-eyebrow",
      discovery
        ? "NOVA ESPÉCIE DESCOBERTA"
        : t.hybrid
          ? "IMAGINAÇÃO DO JOGO"
          : "CADERNO DA NATUREZA",
    );
    const body = document.createElement("div"),
      p = document.createElement("p");
    p.textContent = t.fact;
    body.append(p);
    if (t.source) {
      const a = document.createElement("a");
      a.href = t.source;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent =
        t.id === "sequoia"
          ? "Fonte: National Park Service ↗"
          : "Fonte: Câmara dos Deputados · EcoCâmara ↗";
      body.append(a);
    }
    dialog(
      t.name,
      body,
      [{ label: "Continuar cultivando", primary: true }],
      treeSVG(id, true),
    );
  }
  function showNextCard() {
    if(!cardQueue.length)return;
    const id=cardQueue.shift(),t=E.SPECIES.find(t=>t.id===id);
    if(!t)return;
    const notice=document.createElement('div');notice.className='toast discovery-toast';
    const label=document.createElement('span');label.textContent=`✦ ${t.name} desbloqueado!`;
    const button=document.createElement('button');button.textContent='Conhecer';button.dataset.action='fact';button.dataset.id=id;
    notice.append(label,button);$('toast-stack').append(notice);setTimeout(()=>notice.remove(),6500);
  }

  function drawChart(id, type, rows) {
    const canvas = $(id),
      rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = window.devicePixelRatio || 1,
      w = rect.width,
      h = 190;
    canvas.width = Math.round(w * dpr);
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const values = rows.map((r, i) =>
      type === "production"
        ? r.rate
        : (r.clickDelta ??
          Math.max(
            0,
            r.clicks -
              (i
                ? rows[i - 1].clicks
                : state.history[state.history.indexOf(r) - 1]?.clicks || 0),
          )),
    );
    const max = Math.max(1, ...values) * 1.15,
      left = 40,
      right = w - 10,
      top = 12,
      bottom = 163;
    ctx.font = "9px Segoe UI";
    ctx.fillStyle = "#87957c";
    ctx.strokeStyle = "#e4e9dd";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = top + ((bottom - top) * i) / 3;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillText(fmt(max * (1 - i / 3)), 1, y + 3);
    }
    if (!rows.length) {
      ctx.textAlign = "center";
      ctx.fillText(
        "Sua história começa com os primeiros 30 segundos.",
        w / 2,
        98,
      );
      return;
    }
    const x = (i) =>
        left +
        (right - left) * (rows.length === 1 ? 0.5 : i / (rows.length - 1)),
      y = (v) => bottom - ((bottom - top) * v) / max;
    if (type === "production") {
      const fill = ctx.createLinearGradient(0, top, 0, bottom);
      fill.addColorStop(0, "#a7c58c88");
      fill.addColorStop(1, "#a7c58c08");
      ctx.beginPath();
      ctx.moveTo(x(0), bottom);
      values.forEach((v, i) => ctx.lineTo(x(i), y(v)));
      ctx.lineTo(x(values.length - 1), bottom);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.beginPath();
      values.forEach((v, i) =>
        i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)),
      );
      ctx.strokeStyle = "#74985d";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#98af83";
      const bw = Math.max(
        1,
        Math.min(18, ((right - left) / rows.length) * 0.65),
      );
      values.forEach((v, i) =>
        ctx.fillRect(x(i) - bw / 2, y(v), bw, Math.max(1, bottom - y(v))),
      );
    }
    let selected = Math.min(rows.length - 1, lastChartIndex[type]);
    ctx.beginPath();
    ctx.arc(x(selected), y(values[selected]), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#365e3e";
    ctx.fill();
    ctx.fillStyle = "#819173";
    ctx.textAlign = "left";
    ctx.fillText(duration(rows[0].age), left, h - 8);
    ctx.textAlign = "right";
    ctx.fillText(duration(rows.at(-1).age), right, h - 8);
    canvas._chart = { rows, values, left, right, type };
    text(
      type + "-tooltip",
      `${duration(rows[selected].age)} de expedição · ${fmt(values[selected], 1)} ${type === "production" ? "folhas/min" : "cliques no intervalo"}`,
    );
  }
  function drawCharts() {
    const rows = state.history.slice(-Number($("chart-range").value));
    drawChart("production-chart", "production", rows);
    drawChart("click-chart", "click", rows);
    html(
      "history-table",
      rows
        .map(
          (r) =>
            `<tr><td>${duration(r.age)}</td><td>${fmt(r.rate, 1)}</td><td>${fmt(r.clicks)}</td></tr>`,
        )
        .join(""),
    );
  }
  async function sound(on) {
    try {
      await audio.toggle(on);
      state.settings.sound = on;
      persist();
      render();
    } catch (e) {
      toast("Não foi possível iniciar o áudio. " + e.message, true);
    }
  }
  function importSave(raw) {
    try {
      const pending = E.decode(raw);
      text(
        "import-message",
        "Save válido. Confira os dados antes de substituir.",
      );
      text("dialog-eyebrow", "IMPORTAR PROGRESSO");
      dialog(
        "Trazer esta floresta?",
        `${fmt(pending.leaves)} folhas, ${Object.values(pending.trees).reduce((a, b) => a + b, 0)} árvores e ${pending.meta.donations} doações. Isso substituirá ${demo ? "a demonstração" : "a partida atual; uma cópia anterior ficará guardada neste navegador"}.`,
        [
          { label: "Cancelar" },
          {
            label: "Importar save",
            primary: true,
            run: () => {
              if (!demo) {
                try {
                  localStorage.setItem(KEY + "-backup", JSON.stringify(state));
                } catch {
                  toast(
                    "Não foi possível guardar a cópia anterior. Exporte seu save e tente novamente.",
                    true,
                  );
                  return;
                }
              }
              state = pending;
              dirty = false;
              const result = E.advance(state, Date.now(), false);
              cardQueue = [...result.unlocks];
              $("save-code").value = "";
              persist();
              render();
              toast(
                `Save importado. Ganho offline: ${fmt(result.gained, 1)} folhas.`,
              );
            },
          },
        ],
      );
    } catch (e) {
      text("import-message", e.message);
      toast(e.message, true);
    } finally {
      $("import-file").value = "";
    }
  }
  function startDemo() {
    if (demo) return;
    sync();
    persist();
    realState = E.clone(state);
    demo = true;
    state = E.fresh();
    state.leaves = 7500;
    state.lifetime = 9000;
    state.clean = 100;
    state.clicks = 120;
    state.trees = {
      muda: 3,
      ipe: 2,
      jacaranda: 2,
      sequoia: 0,
      aurora: 0,
      lumina: 0,
    };
    state.upgrades = { luvas: 2, cisterna: 3, composto: 3, luz: 3, viveiro: 2 };
    state.meta.seeds = 8;
    state.meta.totalSeeds = 8;
    state.activeSpecies = "ipe";
    state.history = Array.from({ length: 20 }, (_, i) => ({
      age: (i + 1) * 30,
      rate: 100 + i * 21,
      clicks: (i + 1) * 6,
      clickDelta: 6,
      leaves: 450 * (i + 1),
    }));
    state.age = 600;
    E.unlock(state);
    cardQueue = [];
    navigate("jardim", true);
    toast("Demonstração temporária. Seu save real está preservado.");
  }
  function exitDemo() {
    if (!demo) return;
    state = realState;
    realState = null;
    demo = false;
    cardQueue = [];
    const result = E.advance(state, Date.now(), false);
    cardQueue.push(...result.unlocks);
    persist();
    render();
    toast(
      "De volta à sua floresta. " +
        fmt(result.gained, 1) +
        " folhas produzidas enquanto você explorava.",
    );
  }
  document.addEventListener("click", (event) => {
    const shop=event.target.closest('[data-shop]');
    if(shop){setShopTab(shop.dataset.shop);return;}
    const buying=event.target.closest('[data-shop-buy]');
    if(buying&&!buying.disabled){action(()=>E.buy(state,buying.dataset.shopBuy,buying.dataset.id));return;}
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      navigate(nav.dataset.nav, true);
      return;
    }
    const b = event.target.closest("[data-action]");
    if (!b || b.disabled) return;
    const id = b.dataset.id;
    switch (b.dataset.action) {
      case 'climate-info': {
        const c=E.climate(state);text('dialog-eyebrow',c.season);
        dialog(c.icon+' '+c.name,c.weather==='chuva'?'Água ×2,2 e produção +25%.':c.weather==='seca'?'Produção −40%. Use um regador para proteger sua floresta por 60 segundos.':'Luz solar +20%. Hora de crescer.',[{label:'Jogar',primary:true}]);break;
      }
      case 'upgrade-info': {
        const u=E.UPGRADES.find(u=>u.id===id);text('dialog-eyebrow','MELHORIA');dialog(u.name,u.desc,[{label:'Entendi',primary:true}]);break;
      }
      case "tend":
        action(() => E.tend(state, id));
        break;
      case "plant":
        action(() => E.buy(state, "tree", id));
        break;
      case "upgrade":
        action(() => E.buy(state, "upgrade", id));
        break;
      case "fact":
        fact(id);
        break;
      case "display":
        action(() => {
          state.activeSpecies = id;
          return { ok: true, message: "Espécie selecionada para o cenário." };
        });
        break;
      case "skill":
        action(() => E.learn(state, id));
        break;
    }
  });
  $("tree-button").addEventListener("click", () => {
    action(() => {
      const r = E.collect(state);
      cardQueue.push(...r.unlocks);
      const n = document.createElement("span");
      n.className = "floating-leaf";
      n.textContent = "+" + fmt(r.amount, 1) + " ❧";
      n.style.setProperty("--drift", Math.random() * 60 - 30 + "px");
      $("click-stage").append(n);
      $("tree-button").classList.remove("clicked");void $("tree-button").offsetWidth;$("tree-button").classList.add("clicked");
      $("tap-hint").classList.add("experienced");
      setTimeout(() => n.remove(), 1000);
      audio.click();
    });
  });
  $("water-button").addEventListener("click", () =>
    action(() => E.water(state)),
  );
  $("event-action").addEventListener("click", () =>
    action(() => E.rescue(state)),
  );
  $("cross-button").addEventListener("click", () =>
    action(() => {
      const r = E.cross(state, $("parent-a").value, $("parent-b").value);
      text("lab-result", r.message);
      if (r.discovery) cardQueue.push(r.discovery);
      return r;
    }),
  );
  $("prestige-button").addEventListener("click", () => {
    sync();
    if (!E.canPrestige(state)) return;
    const biome = $("next-biome").value;
    const destination = E.BIOMES.find((b) => b.id === biome);
    text("dialog-eyebrow", "UM LEGADO PARA O MUNDO");
    dialog(
      "Concluir esta expedição?",
      `Você receberá ${E.prestigeReward(state)} sementes ancestrais e começará em ${destination.name}. Folhas, árvores e melhorias atuais serão reiniciadas. Suas descobertas e habilidades permanecem.`,
      [
        { label: "Continuar nesta floresta" },
        {
          label: "Doar e recomeçar",
          primary: true,
          run: () =>
            action(() => {
              const next = E.prestige(state, biome, Date.now());
              if (!next)
                return { ok: false, message: "Destino ainda não disponível." };
              state = next;
              cardQueue = [];
              navigate("jardim", true);
              return {
                ok: true,
                message:
                  "Sua floresta virou um legado. Uma nova jornada começa.",
              };
            }),
        },
      ],
    );
  });
  $("sound-toggle").addEventListener("click", () => sound(!audio.enabled));
  $("sound-setting").addEventListener("change", (e) => sound(e.target.checked));
  $("motion-setting").addEventListener("change", (e) => {
    state.settings.motion = e.target.checked;
    persist();
    render();
  });
  $("export-button").addEventListener("click", () => {
    sync();
    const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `evertree-${demo ? "demo-" : ""}${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Save JSON exportado.");
  });
  $("copy-button").addEventListener("click", async () => {
    sync();
    const code = E.encode(state);
    $("save-code").value = code;
    try {
      await navigator.clipboard.writeText(code);
      toast("Código copiado. Cole no outro computador.");
    } catch {
      $("save-code").focus();
      $("save-code").select();
      toast("Código pronto no campo. Use Ctrl+C para copiar.");
    }
  });
  $("import-button").addEventListener("click", () =>
    importSave($("save-code").value),
  );
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1500000) {
      toast("Arquivo muito grande. Limite: 1,5 MB.", true);
      e.target.value = "";
      return;
    }
    try {
      importSave(await file.text());
    } catch {
      toast("Não foi possível ler o arquivo.", true);
      e.target.value = "";
    }
  });
  $("demo-button").addEventListener("click", startDemo);
  $("exit-demo").addEventListener("click", exitDemo);
  $("demo-return").addEventListener("click", exitDemo);
  ["fire", "pests"].forEach((type) =>
    $("demo-" + type).addEventListener("click", () => {
      if (!demo) return;
      action(() => {
        state.event = { type, hits: 0, target: 8, left: 30 };
        state.nextEvent = state.eventClock + 150;
      });
      navigate("jardim");
    }),
  );
  $("demo-drought").addEventListener("click", () => {
    if (!demo) return;
    for (let i = 0; i < 12; i++) {
      state.age += 60;
      if (E.climate(state).weather === "seca") break;
    }
    render();
    navigate("jardim");
  });
  $("dialog-close").addEventListener("click", () => $("info-dialog").close());
  $("info-dialog").addEventListener("close", () =>
    setTimeout(showNextCard, 100),
  );
  $("chart-range").addEventListener("change", () => {
    lastChartIndex = { production: 0, click: 0 };
    drawCharts();
  });
  ["production", "click"].forEach((type) => {
    const canvas = $(type + "-chart");
    canvas.addEventListener("pointermove", (e) => {
      const c = canvas._chart;
      if (!c) return;
      const x = e.clientX - canvas.getBoundingClientRect().left;
      lastChartIndex[type] = Math.max(
        0,
        Math.min(
          c.rows.length - 1,
          Math.round(((x - c.left) / (c.right - c.left)) * (c.rows.length - 1)),
        ),
      );
      drawCharts();
    });
    canvas.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const count = canvas._chart?.rows.length || 0;
      lastChartIndex[type] =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? count - 1
            : Math.max(
                0,
                Math.min(
                  count - 1,
                  lastChartIndex[type] + (e.key === "ArrowRight" ? 1 : -1),
                ),
              );
      drawCharts();
    });
  });

  function setShopTab(value){
    shopTab=value==='upgrades'?'upgrades':'trees';
    document.querySelectorAll('[data-shop]').forEach(b=>{const on=b.dataset.shop===shopTab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    $('shop-items').setAttribute('aria-labelledby',shopTab==='trees'?'tab-trees':'tab-upgrades');renderShop();
  }
  document.querySelector('.shop-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setShopTab(e.key==='Home'?'trees':e.key==='End'?'upgrades':shopTab==='trees'?'upgrades':'trees');$(shopTab==='trees'?'tab-trees':'tab-upgrades').focus();});
  $('panel-close').addEventListener('click',()=>navigate('jardim'));
  $('game-panel').addEventListener('close',()=>{if(currentView!=='jardim')navigate('jardim');});

  window.addEventListener("resize", () => {
    if (currentView === "conquistas") drawCharts();
  });
  window.addEventListener("hashchange", () =>
    navigate(location.hash.slice(1), true),
  );
  window.addEventListener("pagehide", () => {
    sync(false);
    persist();
  });
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
      sync(true);
      persist();
      if (audio.ctx) await audio.ctx.suspend();
    } else {
      const r = sync(false);
      if (r.seconds > 30)
        toast(
          `Enquanto você esteve fora: +${fmt(r.gained, 1)} folhas em ${duration(r.seconds)}.`,
        );
      if (audio.enabled && audio.ctx) await audio.ctx.resume();
      render();
      showNextCard();
    }
  });
  setInterval(() => {
    if (document.hidden) return;
    sync(true);
    render();
    showNextCard();
    if (Date.now() - persistAt > 4000) {
      persist();
      persistAt = Date.now();
    }
  }, 1000);
  navigate(location.hash.slice(1) || "jardim");
  if (!dirty) persist();
  if (loadNote) toast(loadNote, dirty);
  if (offline?.seconds > 30) {
    text("dialog-eyebrow", "BEM-VINDO DE VOLTA");
    dialog(
      "A floresta continuou viva.",
      `Em ${duration(offline.seconds)}, sua floresta produziu ${fmt(offline.gained, 1)} folhas. Água, solo, luz e mudanças de clima foram calculados.${offline.skipped ? " O limite de produção offline é de 7 dias por ausência." : ""} Eventos de emergência ficam pausados enquanto você está fora.`,
      [{ label: "Voltar a cuidar", primary: true }],
    );
  } else showNextCard();
})();
