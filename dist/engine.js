/* EverTree simulation. Shared by the browser and Node tests; no DOM or wall clock inside rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EverTree = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = 2,
    MAX_OFFLINE = 7 * 86400;
  const SPECIES = [
    {
      id: "muda",
      name: "Muda pioneira",
      latin: "Primeiros passos",
      color: "#79a75c",
      cost: 20,
      threshold: 0,
      rate: 0.4,
      needs: [0.1, 0.06, 0.1],
      region: "all",
      fact: "Uma floresta diversa precisa de diferentes espécies e de condições adequadas de solo e água. Esta muda representa o início da sua restauração.",
      source: null,
    },
    {
      id: "ipe",
      name: "Ipê-amarelo",
      latin: "Tabebuia serratifolia",
      color: "#e5ba48",
      cost: 90,
      threshold: 80,
      rate: 1.6,
      needs: [0.19, 0.1, 0.36],
      region: "br",
      fact: "Suas flores são polinizadas por abelhas e suas sementes aladas se dispersam pelo vento. É utilizado na recuperação de áreas degradadas.",
      source:
        "https://www2.camara.leg.br/a-camara/estruturaadm/gestao-na-camara-dos-deputados/responsabilidade-social-e-ambiental/ecocamara/recursos/bosque-dos-constituintes/flora-local/as-20-especies-originais/ipe-amarelo",
    },
    {
      id: "jacaranda",
      name: "Jacarandá-da-bahia",
      latin: "Dalbergia nigra",
      color: "#558579",
      cost: 260,
      threshold: 300,
      rate: 4,
      needs: [0.45, 0.32, 0.22],
      region: "br",
      fact: "Árvore da Mata Atlântica, ameaçada pela exploração e pela perda de habitat. Proteger sua floresta é parte da conservação desta espécie.",
      source:
        "https://www2.camara.leg.br/a-camara/estruturaadm/gestao-na-camara-dos-deputados/responsabilidade-social-e-ambiental/ecocamara/recursos/bosque-dos-constituintes/flora-local/as-20-especies-originais/jacaranda-da-bahia",
    },
    {
      id: "sequoia",
      name: "Sequoia-costeira",
      latin: "Sequoia sempervirens",
      color: "#376a61",
      cost: 700,
      threshold: 1500,
      rate: 10,
      needs: [1.1, 0.45, 0.4],
      region: "temperada",
      fact: "Nativa da costa do Pacífico dos EUA, recebe água da neblina. O gotejamento das copas também beneficia o solo da floresta. Não é uma espécie nativa do Brasil.",
      source: "https://www.nps.gov/articles/000/coast-redwood.htm",
    },
    {
      id: "aurora",
      name: "Aurora",
      latin: "Híbrido fictício · raro",
      color: "#b18bd2",
      cost: 850,
      threshold: 0,
      rate: 12,
      needs: [0.5, 0.5, 0.6],
      region: "all",
      hybrid: true,
      fact: "Descoberta fictícia de ipê + jacarandá. Produz 3× a taxa-base do jacarandá. O cruzamento entre essas espécies é uma fantasia do jogo, não uma afirmação botânica.",
    },
    {
      id: "lumina",
      name: "Lúmina",
      latin: "Híbrido fictício · lendário",
      color: "#d2b56e",
      cost: 1400,
      threshold: 0,
      rate: 24,
      needs: [0.9, 0.65, 0.9],
      region: "all",
      hybrid: true,
      fact: "Descoberta fictícia de muda + sequoia. Produz 2,4× a taxa-base da sequoia. Esta combinação é uma mecânica de coleção, sem correspondência com a reprodução real.",
    },
  ];
  const BIOMES = [
    {
      id: "atlantica",
      name: "Mata Atlântica",
      region: "América do Sul",
      desc: "Água abundante, luz filtrada.",
      income: [1, 0.65, 1.2],
      bonus: 1,
    },
    {
      id: "cerrado",
      name: "Cerrado",
      region: "América do Sul",
      desc: "Mais luz, água exige planejamento.",
      income: [0.65, 0.7, 1.8],
      bonus: 1.2,
    },
    {
      id: "temperada",
      name: "Costa do Pacífico",
      region: "América do Norte",
      desc: "Névoa e umidade para as sequoias.",
      income: [1.4, 0.6, 1.1],
      bonus: 1.4,
    },
  ];
  const UPGRADES = [
    {
      id: "luvas",
      name: "Mãos que restauram",
      purpose: "Colha mais folhas sempre que cuidar da árvore.",
      desc: "+2 folhas por clique.",
      cost: 30,
      icon: "✦",
    },
    {
      id: "cisterna",
      name: "Captação de chuva",
      purpose: "Armazene a chuva para abastecer as raízes.",
      desc: "+0,8 água/s e +50 de capacidade por nível.",
      cost: 65,
      icon: "◈",
    },
    {
      id: "composto",
      name: "Compostagem",
      purpose: "Transforme matéria orgânica em nutrientes para o solo.",
      desc: "+0,5 nutrientes/s e +50 de capacidade por nível.",
      cost: 65,
      icon: "♧",
    },
    {
      id: "luz",
      name: "Manejo de clareiras",
      purpose: "Abra espaço na copa para a entrada de luz.",
      desc: "+0,7 luz/s e +50 de capacidade por nível.",
      cost: 65,
      icon: "☼",
    },
    {
      id: "viveiro",
      name: "Rede de viveiros",
      purpose: "Cultive mudas que aumentam a produção de toda a floresta.",
      desc: "+25% de produção das árvores por nível.",
      cost: 150,
      icon: "⌂",
    },
  ];
  const SKILLS = [
    {
      id: "growth", branch: "natureza", name: "Raízes ancestrais", base: 1, max: 8,
      desc: "As raízes das florestas antigas alimentam os novos brotos.",
      benefit: "+50% de folhas das árvores e dos cliques por nível.",
    },
    {
      id: "resilience", branch: "natureza", name: "Ciclo da vida", base: 2, max: 5,
      requires: "growth", desc: "A matéria orgânica nutre o próximo ciclo da floresta.",
      benefit: "+25% de reposição de água, nutrientes e luz por nível.",
    },
    {
      id: "biomes", branch: "natureza", name: "Horizontes vivos", base: 2, max: 1,
      requires: "resilience", desc: "Leve sua experiência para paisagens com outros ritmos de crescimento.",
      benefit: "Libera Cerrado e Costa do Pacífico como destinos de expedição.",
    },
    {
      id: "harvest", branch: "tecnologia", name: "Coletores solares", base: 1, max: 4,
      desc: "Pequenos coletores sustentam o viveiro durante a sua ausência.",
      benefit: "+0,5 folha por segundo por nível, inclusive fora do jogo.",
    },
    {
      id: "machinery", branch: "tecnologia", name: "Rede autônoma", base: 2, max: 3,
      requires: "harvest", desc: "Conecte os coletores para coordenar as colheitas.",
      benefit: "+100% da produção dos coletores solares por nível.",
    },
    {
      id: "restoration", branch: "ecologia", name: "Solo regenerado", base: 1, max: 3,
      desc: "O solo volta a reter água e acelera a recuperação do vale.",
      benefit: "+20% ao índice de recuperação ambiental por nível, até 100%.",
    },
    {
      id: "diversity", branch: "ecologia", name: "Corredor de fauna", base: 2, max: 3,
      requires: "restoration", desc: "Os animais espalham sementes entre as copas de espécies diferentes.",
      benefit: "+5% de produção das árvores por espécie plantada e por nível.",
    },
    {
      id: "heritage", branch: "sabedoria", name: "Banco de sementes", base: 2, max: 3,
      desc: "Reserve parte das sementes de cada floresta para as futuras gerações.",
      benefit: "+1 semente ancestral por doação e por nível.",
    },
    {
      id: "practice", branch: "sabedoria", name: "Saber de campo", base: 2, max: 4,
      requires: "heritage", desc: "Os registros das expedições ensinam a colher sem danificar os brotos.",
      benefit: "+25% de folhas por clique por nível.",
    },
  ];
  const BADGES = [
    {
      id: "first",
      name: "Primeiro gesto",
      desc: "Restaure com seu primeiro clique.",
      test: (s) => s.clicks >= 1,
    },
    {
      id: "hands",
      name: "Mãos à terra",
      desc: "Dê 50 cliques de cuidado.",
      test: (s) => s.clicks >= 50,
    },
    {
      id: "diversity",
      name: "Biodiversidade",
      desc: "Tenha três espécies na floresta.",
      test: (s) => Object.values(s.trees).filter((n) => n > 0).length >= 3,
    },
    {
      id: "guardian",
      name: "Guardião",
      desc: "Resolva um evento ambiental.",
      test: (s) => s.rescues >= 1,
    },
    {
      id: "hybrid",
      name: "Nova descoberta",
      desc: "Descubra seu primeiro híbrido.",
      test: (s) => s.discovered.some((id) => ["aurora", "lumina"].includes(id)),
    },
    {
      id: "world",
      name: "Além do horizonte",
      desc: "Doe sua primeira floresta.",
      test: (s) => s.meta.donations >= 1,
    },
  ];
  const SEASONS = ["Primavera", "Verão", "Outono", "Inverno"];
  const WEATHER = {
    sol: { name: "Céu aberto", icon: "☀", income: [1, 1, 1.2], yield: 1, effect: "A luz solar se repõe 20% mais rápido." },
    chuva: { name: "Chuva", icon: "☂", income: [2.2, 1.1, 0.6], yield: 1.25, effect: "Reposição de água ×2,2, nutrientes ×1,1 e luz ×0,6. Produção de folhas +25%." },
    seca: { name: "Seca", icon: "◌", income: [0.2, 0.75, 1.5], yield: 0.6, effect: "Reposição de água ×0,2, nutrientes ×0,75 e luz ×1,5. Produção −40%. O regador protege a produção por 60 segundos." },
    tempestade: { name: "Tempestade", icon: "ϟ", income: [2.8, 1, 0.45], yield: 0.9, effect: "O temporal multiplica a reposição de água por 2,8. A luz cai a 45% e a produção a 90%." },
    migracao: { name: "Migração de aves", icon: "⌁", income: [1, 1.5, 1], yield: 1.15, effect: "A revoada dispersa sementes. Reposição de nutrientes +50% e produção de folhas +15%." },
    mutirao: { name: "Grande reflorestamento", icon: "❧", income: [1, 1, 1], yield: 1.55, effect: "A regeneração em conjunto aumenta a produção de folhas em 55% durante este minuto." },
  };
  const keys = SPECIES.map((x) => x.id);
  const emptyCounts = (ids) => Object.fromEntries(ids.map((id) => [id, 0]));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function fresh(now = Date.now()) {
    return {
      version: VERSION,
      leaves: 0,
      lifetime: 0,
      clicks: 0,
      clean: 0,
      age: 0,
      tick: 0,
      lastSaved: now,
      seed: 72619,
      resources: { water: 70, soil: 70, sun: 70 },
      trees: { ...emptyCounts(keys), muda: 1 },
      upgrades: emptyCounts(UPGRADES.map((x) => x.id)),
      activeSpecies: "muda",
      biome: "atlantica",
      cans: 3,
      wateredUntil: 0,
      damageUntil: 0,
      event: null,
      eventClock: 0,
      nextEvent: 105,
      rescues: 0,
      hybridAttempts: 0,
      discovered: ["muda"],
      badges: [],
      meta: {
        seeds: 0,
        totalSeeds: 0,
        donations: 0,
        skills: emptyCounts(SKILLS.map((k) => k.id)),
        archives: [],
      },
      history: [],
      settings: { sound: false, motion: true },
    };
  }
  function random(s) {
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    return s.seed / 4294967296;
  }
  function climate(s) {
    const season = Math.floor(s.age / 180) % 4,
      slot = Math.floor(s.age / 60),
      n = (Math.imul(slot + 37, 2654435761) >>> 0) % 100;
    let weather =
      n < (season === 1 ? 45 : 20)
        ? "seca"
        : n < (season === 3 ? 75 : 60)
          ? "chuva"
          : "sol";
    // Ecological events share the climate clock, including during offline replay.
    if (slot % 8 === 7 && recovery(s) >= 40) weather = "mutirao";
    else if (slot % 6 === 2 && recovery(s) >= 18) weather = "migracao";
    else if (slot > 0 && slot % 3 === 0 && weather === "chuva") weather = "tempestade";
    return {
      season: SEASONS[season],
      weather,
      ...WEATHER[weather],
      remaining: 60 - (s.age % 60),
    };
  }
  function recovery(s) {
    const restored = s.clean * 0.45 + s.lifetime / 90;
    return clamp(restored * (1 + 0.2 * s.meta.skills.restoration), 0, 100);
  }
  function capacities(s) {
    return {
      water: 120 + 50 * s.upgrades.cisterna,
      soil: 120 + 50 * s.upgrades.composto,
      sun: 120 + 50 * s.upgrades.luz,
    };
  }
  function budget(s) {
    const c = climate(s),
      b = BIOMES.find((b) => b.id === s.biome),
      r = 1 + s.meta.skills.resilience * 0.25;
    const income = [
      b.income[0] + s.upgrades.cisterna * 0.8,
      b.income[1] + s.upgrades.composto * 0.5,
      b.income[2] + s.upgrades.luz * 0.7,
    ].map((v, i) => v * c.income[i] * r);
    let base = 0, plantedSpecies = 0;
    const demand = [0, 0, 0];
    SPECIES.forEach((t) => {
      base += t.rate * s.trees[t.id];
      if (s.trees[t.id] > 0) plantedSpecies++;
      t.needs.forEach((n, i) => (demand[i] += n * s.trees[t.id]));
    });
    const names = ["water", "soil", "sun"];
    const efficiency = Math.min(
      1,
      ...demand.map((v, i) =>
        v ? (s.resources[names[i]] + income[i]) / v : 1,
      ),
    );
    const weatherYield =
      c.weather === "seca" && s.wateredUntil > s.age ? 1 : c.yield;
    const potential =
      base *
      (1 + s.upgrades.viveiro * 0.25) *
      (1 + s.meta.skills.growth * 0.5) *
      (1 + 0.05 * plantedSpecies * s.meta.skills.diversity) *
      b.bonus *
      weatherYield *
      (s.damageUntil > s.age ? 0.65 : 1);
    const automated = 0.5 * s.meta.skills.harvest * (1 + s.meta.skills.machinery);
    return {
      income,
      demand,
      efficiency,
      rate: potential * efficiency + automated,
      potential: potential + automated,
    };
  }
  function gain(s, n) {
    s.leaves += n;
    s.lifetime += n;
  }
  function clickRate(s) {
    return (2 + s.upgrades.luvas * 2) * (1 + s.meta.skills.growth * 0.5) *
      (1 + s.meta.skills.practice * 0.25);
  }
  function unlock(s) {
    const added = [];
    SPECIES.filter((t) => !t.hybrid).forEach((t) => {
      if (s.lifetime >= t.threshold && !s.discovered.includes(t.id)) {
        s.discovered.push(t.id);
        added.push(t.id);
      }
    });
    BADGES.forEach((b) => {
      if (!s.badges.includes(b.id) && b.test(s)) s.badges.push(b.id);
    });
    return added;
  }
  function collect(s) {
    const n = clickRate(s);
    gain(s, n);
    s.clicks++;
    s.clean = clamp(s.clean + 0.6, 0, 100);
    return { amount: n, unlocks: unlock(s) };
  }
  function step(s, online) {
    s.age++;
    const b = budget(s),
      cap = capacities(s),
      names = ["water", "soil", "sun"];
    names.forEach(
      (key, i) =>
        (s.resources[key] = clamp(
          s.resources[key] + b.income[i] - b.demand[i] * b.efficiency,
          0,
          cap[key],
        )),
    );
    gain(s, b.rate);
    if (s.age % 120 === 0) s.cans = Math.min(20, s.cans + 1);
    // Hazards use active play time. Offline time cannot silently destroy a forest.
    if (online) {
      s.eventClock++;
      if (s.event) {
        s.event.left--;
        if (s.event.left <= 0) {
          s.event = null;
          s.damageUntil = s.age + 90;
        }
      } else if (s.eventClock >= s.nextEvent) {
        s.event = {
          type: random(s) < 0.5 ? "fire" : "pests",
          hits: 0,
          target: 8,
          left: 30,
        };
        s.nextEvent = s.eventClock + 120 + Math.floor(random(s) * 90);
      }
    }
    if (s.age % 30 === 0) {
      s.history.push({
        age: s.age,
        rate: b.rate * 60,
        clicks: s.clicks,
        clickDelta: s.clicks - (s.history.at(-1)?.clicks || 0),
        leaves: s.lifetime,
      });
      if (s.history.length > 240) s.history.shift();
    }
  }
  function advance(s, now, online = false) {
    let elapsed = Math.max(0, (now - s.lastSaved) / 1000),
      skipped = 0;
    if (!online && elapsed > MAX_OFFLINE) {
      skipped = elapsed - MAX_OFFLINE;
      elapsed = MAX_OFFLINE;
    }
    s.lastSaved = Math.max(s.lastSaved, now);
    const totalMs = Math.round(s.tick * 1000) + Math.round(elapsed * 1000),
      seconds = Math.floor(totalMs / 1000);
    s.tick = (totalMs % 1000) / 1000;
    const before = s.leaves;
    for (let i = 0; i < seconds; i++) step(s, online);
    return { seconds, gained: s.leaves - before, skipped, unlocks: unlock(s) };
  }
  const PURCHASE_QUANTITIES = [1, 10, 50];
  const PURCHASE_LIMIT = 100;

  function cost(s, type, id, quantity = 1) {
    if (!PURCHASE_QUANTITIES.includes(quantity)) return Infinity;
    const trees = type === "tree";
    const catalog = trees ? SPECIES : type === "upgrade" ? UPGRADES : [];
    const item = catalog.find((entry) => entry.id === id);
    if (!item) return Infinity;
    const level = (trees ? s.trees : s.upgrades)[id];
    if (level + quantity > PURCHASE_LIMIT) return Infinity;
    const growth = trees ? 1.24 : 1.65;
    let total = 0;
    for (let index = level; index < level + quantity; index++)
      total += Math.ceil(item.cost * growth ** index);
    return total;
  }
  function eligible(s, t) {
    return (
      s.discovered.includes(t.id) &&
      (t.region === "all" ||
        (t.region === "temperada"
          ? s.biome === "temperada"
          : s.biome !== "temperada"))
    );
  }
  function quotePurchase(s, type, id, quantity = 1) {
    const tree = type === "tree";
    const catalog = tree ? SPECIES : type === "upgrade" ? UPGRADES : [];
    const item = catalog.find((entry) => entry.id === id);
    const price = cost(s, type, id, quantity);
    let message = "";
    if (!item) message = "Item desconhecido.";
    else if (!PURCHASE_QUANTITIES.includes(quantity)) message = "Quantidade inválida.";
    else if (tree && !eligible(s, item)) message = "Descubra a espécie e escolha seu bioma de origem.";
    else if (!Number.isFinite(price)) message = "O lote excede o limite de 100.";
    else if (s.leaves < price) message = "Você precisa de mais folhas.";
    return { ok: !message, message, price, item };
  }

  function buy(s, type, id, quantity = 1) {
    const quote = quotePurchase(s, type, id, quantity);
    if (!quote.ok) return quote;
    s.leaves -= quote.price;
    const tree = type === "tree";
    const inventory = tree ? s.trees : s.upgrades;
    inventory[id] += quantity;
    if (tree) s.activeSpecies = id;
    unlock(s);
    return {
      ok: true,
      message: tree
        ? `${quote.item.name} ×${quantity} · plantio concluído!`
        : `${quote.item.name} · nível ${inventory[id]}!`,
    };
  }
  function water(s) {
    if (s.cans < 1)
      return { ok: false, message: "Espere a próxima recarga de regador." };
    s.cans--;
    s.resources.water = Math.min(capacities(s).water, s.resources.water + 65);
    s.wateredUntil = s.age + 60;
    return {
      ok: true,
      message: "Rega aplicada: +65 água e proteção contra seca por 60s.",
    };
  }
  function tend(s, key) {
    if (!["water", "soil", "sun"].includes(key)) return;
    const cap = capacities(s);
    s.resources[key] = Math.min(cap[key], s.resources[key] + 12);
    s.clean = Math.min(100, s.clean + 0.25);
  }
  function clearedTargets(event) {
    // Older expeditions saved the number of completed actions only.
    return event.cleared ?? Array.from({ length: event.hits }, (_, i) => i);
  }
  function rescue(s, targetId) {
    const event = s.event;
    if (!event) return { ok: false };
    const cleared = clearedTargets(event);
    if (targetId === undefined) {
      targetId = 0;
      while (cleared.includes(targetId)) targetId++;
    }
    if (!Number.isInteger(targetId) || targetId < 0 || targetId >= event.target || cleared.includes(targetId))
      return { ok: false };
    event.cleared = [...cleared, targetId];
    event.hits = event.cleared.length;
    if (s.event.hits >= s.event.target) {
      s.event = null;
      s.rescues++;
      gain(s, 35);
      s.cans = Math.min(20, s.cans + 1);
      unlock(s);
      return {
        ok: true,
        done: true,
        message: "Ecossistema protegido! +35 folhas e +1 regador.",
      };
    }
    return { ok: true, done: false };
  }
  function cross(s, a, b) {
    if (a === b || !s.trees[a] || !s.trees[b])
      return {
        ok: false,
        message: "Escolha duas espécies diferentes que você plantou.",
      };
    if (s.leaves < 180 || s.resources.water < 25 || s.resources.soil < 25)
      return {
        ok: false,
        message: "São necessárias 180 folhas, 25 água e 25 nutrientes.",
      };
    s.leaves -= 180;
    s.resources.water -= 25;
    s.resources.soil -= 25;
    s.hybridAttempts++;
    const pair = [a, b].sort().join("+"),
      id =
        pair === "ipe+jacaranda"
          ? "aurora"
          : pair === "muda+sequoia"
            ? "lumina"
            : null;
    const roll = random(s);
    if (id && (roll < 0.35 || s.hybridAttempts % 3 === 0)) {
      const first = !s.discovered.includes(id);
      if (first) s.discovered.push(id);
      s.trees[id] = Math.min(100, s.trees[id] + 1);
      s.activeSpecies = id;
      unlock(s);
      return {
        ok: true,
        discovery: id,
        message: `${SPECIES.find((t) => t.id === id).name} ${first ? "descoberta" : "cultivada"}! Uma árvore foi plantada.`,
      };
    }
    s.resources.soil = Math.min(capacities(s).soil, s.resources.soil + 15);
    return {
      ok: true,
      message:
        "A polinização rendeu +15 nutrientes. Tente uma das receitas do laboratório.",
    };
  }
  function prestigeReward(s) {
    return Math.floor(Math.sqrt(s.lifetime / 5000) * 3) + s.meta.skills.heritage;
  }
  function canPrestige(s) {
    return s.lifetime >= 5000 && recovery(s) >= 100;
  }
  function prestige(s, biome, now) {
    if (
      !canPrestige(s) ||
      !BIOMES.some((b) => b.id === biome) ||
      (biome !== "atlantica" && !s.meta.skills.biomes)
    )
      return null;
    const n = fresh(now),
      earned = prestigeReward(s);
    n.meta = clone(s.meta);
    n.meta.seeds += earned;
    n.meta.totalSeeds += earned;
    n.meta.donations++;
    n.meta.archives.push({
      biome: s.biome,
      trees: Object.values(s.trees).reduce((a, b) => a + b, 0),
      leaves: s.lifetime,
    });
    n.meta.archives = n.meta.archives.slice(-200);
    n.settings = clone(s.settings);
    n.discovered = [...s.discovered];
    n.badges = [...s.badges];
    n.rescues = s.rescues;
    n.biome = biome;
    n.seed = s.seed;
    unlock(n);
    return n;
  }
  function skillCost(s, id) {
    const skill = SKILLS.find((k) => k.id === id);
    return skill ? skill.base * (s.meta.skills[id] + 1) : Infinity;
  }
  function learn(s, id) {
    const k = SKILLS.find((k) => k.id === id);
    if (!k || s.meta.skills[id] >= k.max)
      return { ok: false, message: "Habilidade já completa." };
    if (k.requires && !s.meta.skills[k.requires])
      return { ok: false, message: "Desbloqueie a habilidade anterior." };
    const price = skillCost(s, id);
    if (s.meta.seeds < price)
      return { ok: false, message: "Sementes ancestrais insuficientes." };
    s.meta.seeds -= price;
    s.meta.skills[id]++;
    return { ok: true, message: `${k.name} desbloqueado!` };
  }
  function validate(input, now = Date.now()) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      input.version !== VERSION
    )
      throw new Error("Formato de save incompatível. Use um save EverTree v2.");
    const out = fresh(now);
    const number = (v, label, max = 1e15, integer = false) => {
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        v < 0 ||
        v > max ||
        (integer && !Number.isInteger(v))
      )
        throw new Error(`Valor inválido: ${label}.`);
      return v;
    };
    [
      "leaves",
      "lifetime",
      "clean",
      "clicks",
      "age",
      "tick",
      "lastSaved",
      "seed",
      "cans",
      "wateredUntil",
      "damageUntil",
      "eventClock",
      "nextEvent",
      "rescues",
      "hybridAttempts",
    ].forEach((k) => (out[k] = number(input[k], k)));
    if (
      out.clean > 100 ||
      out.cans > 20 ||
      out.tick >= 1 ||
      out.leaves > out.lifetime + 0.01 ||
      out.lastSaved > now + 300000 ||
      out.lastSaved < 946684800000
    )
      throw new Error("Save fora dos limites esperados.");
    [
      "clicks",
      "age",
      "seed",
      "cans",
      "eventClock",
      "nextEvent",
      "rescues",
      "hybridAttempts",
    ].forEach((k) => number(out[k], k, k === "seed" ? 4294967295 : 1e12, true));
    keys.forEach(
      (k) => (out.trees[k] = number(input.trees?.[k], k, 100, true)),
    );
    UPGRADES.forEach(
      (u) =>
        (out.upgrades[u.id] = number(input.upgrades?.[u.id], u.id, 100, true)),
    );
    const cap = capacities(out);
    Object.keys(out.resources).forEach(
      (k) => (out.resources[k] = number(input.resources?.[k], k, cap[k])),
    );
    if (
      !keys.includes(input.activeSpecies) ||
      !BIOMES.some((b) => b.id === input.biome)
    )
      throw new Error("Espécie ou bioma desconhecido.");
    out.activeSpecies = input.activeSpecies;
    out.biome = input.biome;
    const list = (arr, allowed) => {
      if (
        !Array.isArray(arr) ||
        arr.length > allowed.length ||
        arr.some((x) => !allowed.includes(x))
      )
        throw new Error("Coleção inválida.");
      return [...new Set(arr)];
    };
    out.discovered = list(input.discovered, keys);
    out.badges = list(
      input.badges,
      BADGES.map((b) => b.id),
    );
    if (
      keys.some((id) => out.trees[id] > 0 && !out.discovered.includes(id)) ||
      !out.trees[out.activeSpecies]
    )
      throw new Error("Árvores inconsistentes no save.");
    ["seeds", "totalSeeds", "donations"].forEach(
      (k) => (out.meta[k] = number(input.meta?.[k], k, 1e9, true)),
    );
    SKILLS.forEach(
      (k) =>
        (out.meta.skills[k.id] = number(
          input.meta?.skills?.[k.id] === undefined && !["growth", "resilience", "biomes"].includes(k.id)
            ? 0 : input.meta?.skills?.[k.id],
          k.id,
          k.max,
          true,
        )),
    );
    if (
      out.meta.seeds > out.meta.totalSeeds ||
      SKILLS.some((k) => out.meta.skills[k.id] > 0 && k.requires && !out.meta.skills[k.requires]) ||
      (out.biome !== "atlantica" && !out.meta.skills.biomes)
    )
      throw new Error("Progressão ancestral inconsistente.");
    if (!Array.isArray(input.meta.archives) || input.meta.archives.length > 200)
      throw new Error("Histórico global inválido.");
    out.meta.archives = input.meta.archives.map((a) => {
      if (!BIOMES.some((b) => b.id === a.biome))
        throw new Error("Bioma inválido.");
      return {
        biome: a.biome,
        trees: number(a.trees, "árvores", 600, true),
        leaves: number(a.leaves, "folhas"),
      };
    });
    if (!Array.isArray(input.history) || input.history.length > 240)
      throw new Error("Estatísticas inválidas.");
    let previous = -1;
    out.history = input.history.map((h) => {
      const row = {};
      ["age", "rate", "clicks", "leaves"].forEach(
        (k) => (row[k] = number(h[k], k)),
      );
      if (row.age <= previous || row.age > out.age)
        throw new Error("Ordem do histórico inválida.");
      row.clickDelta = number(h.clickDelta ?? 0, "cliques no intervalo");
      previous = row.age;
      return row;
    });
    if (input.event !== null) {
      const e = input.event;
      if (!e || !["fire", "pests"].includes(e.type) || e.target !== 8)
        throw new Error("Evento inválido.");
      out.event = {
        type: e.type,
        target: 8,
        hits: number(e.hits, "ações", 7, true),
        left: number(e.left, "tempo", 30, true),
      };
      if (e.cleared !== undefined) {
        if (!Array.isArray(e.cleared) || e.cleared.length !== out.event.hits ||
            new Set(e.cleared).size !== e.cleared.length ||
            e.cleared.some(id => !Number.isInteger(id) || id < 0 || id >= out.event.target))
          throw new Error("Alvos do evento inválidos.");
        out.event.cleared = [...e.cleared];
      }
    }
    out.settings = {
      sound: input.settings?.sound === true,
      motion: input.settings?.motion !== false,
    };
    return out;
  }
  function migrate(old, now = Date.now()) {
    const s = fresh(now);
    const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.min(v, 1e12) : 0);
    s.leaves = num(old.leaves);
    s.lifetime = Math.max(s.leaves, num(old.lifetime));
    s.clicks = Math.floor(num(old.clicks));
    s.upgrades.luvas = Math.min(
      100,
      Math.floor(num(old.owned?.agua) + num(old.owned?.adubo) * 3),
    );
    s.trees.muda = Math.min(
      100,
      1 +
        Math.floor(
          num(old.owned?.regador) * 2 + num(old.owned?.jardineiro) * 10,
        ),
    );
    s.clean = Math.min(100, s.clicks * 0.6);
    unlock(s);
    return s;
  }
  function encode(s) {
    const raw = JSON.stringify(s);
    return (
      "ET2." +
      (typeof btoa === "function"
        ? btoa(raw)
        : Buffer.from(raw).toString("base64"))
    );
  }
  function decode(str, now) {
    if (typeof str !== "string" || str.length > 1500000)
      throw new Error("Save muito grande.");
    let raw = str.trim();
    if (raw.startsWith("ET2.")) {
      try {
        raw =
          typeof atob === "function"
            ? atob(raw.slice(4))
            : Buffer.from(raw.slice(4), "base64").toString();
      } catch {
        throw new Error("Código de transferência inválido.");
      }
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("JSON ou código de transferência inválido.");
    }
    return validate(parsed, now);
  }
  return {
    VERSION,
    MAX_OFFLINE,
    SPECIES,
    BIOMES,
    UPGRADES,
    SKILLS,
    BADGES,
    fresh,
    climate,
    recovery,
    capacities,
    budget,
    advance,
    collect,
    clickRate,
    cost,
    quotePurchase,
    PURCHASE_QUANTITIES,
    buy,
    eligible,
    water,
    tend,
    rescue,
    clearedTargets,
    cross,
    prestigeReward,
    canPrestige,
    prestige,
    skillCost,
    learn,
    validate,
    migrate,
    encode,
    decode,
    unlock,
    clone,
  };
});
