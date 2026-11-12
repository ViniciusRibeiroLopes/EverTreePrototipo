# 🌿 EverTree — Cada Gesto Regenera

> **Projeto final da disciplina de Interação Humano-Computador**
> Jogo educativo de reflorestamento desenvolvido com HTML, CSS, SVG e JavaScript puro — sem frameworks, sem dependências externas, sem instalação.

---

## O Conceito

**EverTree** é um jogo de incremento ambiental em que o jogador assume o papel de guardião de uma reserva ecológica degradada. A cada cuidado, folha colhida ou árvore plantada, o vale vai deixando de ser uma paisagem industrial e se tornando uma floresta viva.

A experiência é construída em torno de uma ideia simples: **o cuidado tem impacto visível**. A paisagem muda em tempo real conforme a recuperação avança — fábricas somem, vegetação brota, fauna aparece.

---

## Como Executar

```bash
# Opção 1 — sem instalação
# Abra index.html diretamente no Edge, Chrome ou Firefox

# Opção 2 — servidor local estável (recomendado para save persistente)
npm start
# Acesse http://127.0.0.1:8765
```

> [!NOTE]
> O save fica no navegador e é vinculado à origem. Ao trocar entre `file://` e `localhost`, use **Preferências & save → Baixar JSON** para transferir o progresso.

```bash
npm test      # Testes da simulação (sem dependências)
npm run build # Gera public/ pronto para hospedagem estática
```

---

## Funcionalidades

### 🌄 Jornada Ambiental
O vale passa por **5 estágios** — de *Vale industrial* até *Paraíso natural*. A paisagem é pintada em Canvas com camadas que reagem à recuperação real: fábricas, brotos, pássaros, capivara e neblina aparecem ou somem conforme o progresso.

### 🌳 Cultivo Estratégico
Plante **4 espécies reais** (Muda pioneira, Ipê-amarelo, Jacarandá-da-bahia, Sequoia-costeira) e **2 híbridos fictícios** (Aurora, Lúmina). Cada espécie consome água, nutrientes e luz individualmente — gerencie os recursos antes de expandir. Cards com fontes científicas acompanham cada descoberta.

### 🌦️ Clima Dinâmico
**4 estações de 3 minutos**, com 6 tipos de tempo: sol, chuva, seca, tempestade, migração de aves e grande reflorestamento. Cada clima altera a reposição de recursos e a produção de folhas. Use o **regador** para proteger a floresta durante a seca.

### 🔥 Emergências Ambientais
**Incêndios e pragas** surgem durante a partida. 8 focos aparecem pelo vale; você tem 30 segundos para eliminá-los clicando. Resolver a emergência dá 35 folhas e +1 regador. Falhar reduz a produção por 90 segundos.

### ⚗️ Laboratório de Polinização
Combine duas espécies plantadas para tentar criar um híbrido fictício. Duas receitas ocultas, **35% de chance** por tentativa — mas toda 3ª tentativa global garante o híbrido se a receita for compatível.

### ✧ Prestígio e Legado
Doe uma floresta recuperada (100% + 5.000 folhas) e ganhe **sementes ancestrais**. Reinvista em 9 habilidades permanentes distribuídas em quatro ramos: Natureza, Tecnologia, Ecologia e Sabedoria. Desbloqueie novos biomas — **Cerrado** e **Costa do Pacífico**.

### 📊 Diário da Floresta
Gráficos de produção por minuto e cliques por intervalo, com inspeção por cursor ou teclado. Tabela acessível com dados brutos. Distribuição de árvores entre biomas atuais e florestas doadas. Tudo em Canvas local, sem biblioteca externa.

### 🔊 Paisagem Sonora
Som gerado por **Web Audio API** em camadas: vento, água corrente, pássaros e notas pentatônicas suaves. Intensidade varia com a recuperação do vale. Ativação explícita; pausa automática quando a aba fica em segundo plano.

### 💾 Save Portável
Exporte como **JSON** ou copie um **código ET2** em Base64. Importe em qualquer navegador. Validação completa de estrutura e limites — um save adulterado é rejeitado sem apagar o progresso existente.

---

## Simulação Offline

O jogo continua mesmo com a aba fechada. O motor (`engine.js`) é **independente do DOM** e replay o clima, consumo e estações tick a tick ao reabrir:

| Detalhe | Valor |
|---|---|
| Limite de produção offline | 7 dias |
| Precisão de tempo | Milissegundos; recarregar não duplica ganhos |
| Emergências offline | Pausadas; não destroem a floresta silenciosamente |
| Histórico de amostras | 240 pontos × 30 s = 2 horas de gráfico |

---

## Arquitetura Técnica

```
IHC/
├── index.html          # 7 telas, reserva, controles e diálogos
├── engine.js           # Motor: estado, economia, clima, RNG, prestígio, validação (UMD)
├── app.js              # UI: navegação, render, gráficos, save, acessibilidade
├── audio.js            # Síntese procedural com AudioContext
├── scene.js            # Paisagem Canvas em camadas + animações
├── styles.css          # Estilos base compartilhados
├── game.css            # Layout da reserva e viveiro
├── upgrades.css        # Controles de compra em lote
├── legacy.css          # Árvore de habilidades e legado
├── scene.css           # Fundo e transições da paisagem
├── images/
│   ├── valley.jpg              # Fundo — vale degradado
│   ├── valley-restored.jpg     # Fundo — vale restaurado
│   └── *.png                   # 6 ilustrações de espécies
├── tests/              # Testes determinísticos (node:test, sem deps)
└── scripts/            # Servidor local e build de distribuição
```

> [!IMPORTANT]
> Zero dependências de produção. Nenhum CDN, nenhum framework, nenhum bundle. O jogo abre com dois cliques em qualquer máquina.

---

## Decisões de Design (IHC)

| Princípio | Como foi aplicado |
|---|---|
| **Feedback imediato** | A paisagem muda ao plantar; partículas animam cada cuidado; toasts confirmam toda ação |
| **Affordance visual** | Botões com ícone + rótulo; barra de progresso sempre visível; alerta de emergência no topo global |
| **Acessibilidade** | Navegação completa por teclado; `aria-label` em todos os controles; gráfico inspecionável com setas; respeita `prefers-reduced-motion` |
| **Prevenção de erros** | Confirmação antes de substituir save; validação de import rejeita sem alterar o estado atual |
| **Transparência** | Cards com fontes reais; aviso explícito sobre mecânicas fictícias; fórmulas de prestígio expostas |
| **Progressão legível** | Próxima descoberta sempre visível; custo do próximo lote calculado na UI; habilidades mostram pré-requisitos |

---

## Espécies e Fontes

> Consulta em 6 de novembro de 2026. As fontes abrem em nova aba; o jogo funciona sem elas.

- 🌼 **Ipê-amarelo** (*Tabebuia serratifolia*) — [EcoCâmara](https://www2.camara.leg.br/a-camara/estruturaadm/gestao-na-camara-dos-deputados/responsabilidade-social-e-ambiental/ecocamara/recursos/bosque-dos-constituintes/flora-local/as-20-especies-originais/ipe-amarelo): polinização por abelhas, sementes dispersas pelo vento, uso na recuperação de áreas degradadas.
- 🌿 **Jacarandá-da-bahia** (*Dalbergia nigra*) — [EcoCâmara](https://www2.camara.leg.br/a-camara/estruturaadm/gestao-na-camara-dos-deputados/responsabilidade-social-e-ambiental/ecocamara/recursos/bosque-dos-constituintes/flora-local/as-20-especies-originais/jacaranda-da-bahia): espécie ameaçada da Mata Atlântica.
- 🌲 **Sequoia-costeira** (*Sequoia sempervirens*) — [National Park Service](https://www.nps.gov/articles/000/coast-redwood.htm): neblina da costa do Pacífico e contribuição ao solo.
- ✦ **Aurora** e **Lúmina** — híbridos fictícios criados no laboratório do jogo. Cruzamentos intergenéricos e multiplicadores de produção são mecânicas de jogo, sem correspondência botânica real.

---

## Roteiro de Demonstração

> Para a apresentação, use o **modo demonstração** em Preferências & save → Abrir demonstração. O save real fica intacto.

1. **Reserva** — cuide da muda (mouse ou teclado) e observe as partículas e o contador de folhas.
2. **Coleção** — plante Ipê e Jacarandá; leia os cards ecológicos; observe os recursos caindo.
3. **Melhorias** — compre Captação de chuva para equilibrar a água.
4. **Demonstração** — ative seca → use o regador. Depois ative incêndio → clique nos focos para apagá-los.
5. **Laboratório** — combine Ipê + Jacarandá até descobrir Aurora.
6. **Diário** — passe o cursor nos gráficos; use as setas do teclado para inspecionar os pontos.
7. **Legado** — compre Raízes ancestrais, Ciclo da vida, Horizontes vivos. Doe para a Costa do Pacífico.
8. **Save** — baixe o JSON, importe de volta, confirme. Tente importar um arquivo inválido.
9. Feche e reabra a aba para ver o **resumo de produção offline**.

---

## Limitações Conhecidas

- Save local: sem conta, sem sincronização entre dispositivos.
- Uma aba por partida (duas abas compartilham o mesmo `localStorage`).
- Sem servidor de jogo ou autenticação de progresso — a validação bloqueia dados malformados, não autoria.
- As florestas doadas mantêm os **200 registros mais recentes**.

---

*Projeto entregue para a disciplina de IHC — novembro de 2026. Código preservado em ZIP de backup junto à entrega. Nenhum push remoto foi realizado.*

