# EverTree · Edição Regeneração

Jogo de reflorestamento para o projeto de IHC. HTML, CSS, SVG e JavaScript puro; não exige internet, cadastro, CDN ou instalação de dependências.

## Executar

- Abra `index.html` com dois cliques no Edge, Chrome ou Firefox.
- Para uma origem local estável, com Node.js instalado: `npm start`, depois acesse `http://127.0.0.1:8765`.
- `npm test`: executa os testes da simulação.
- `npm run build`: gera a pasta `dist/`, compatível com `hosting.json`.

O save é específico do navegador e da origem. Ao alternar entre arquivo local e servidor, use **Preferências & save → Baixar JSON / Copiar código → Importar**.

## O que foi implementado

1. **Jornada ambiental:** terreno degradado, limpeza gradual, céu que muda de cor, rio, flora, fauna e quatro fases de regeneração.
2. **Animações:** copas ao vento, nuvens, água corrente, chuva, pássaros, borboleta, partículas de cuidado e feedback de eventos. SVG e CSS locais, respeitando `prefers-reduced-motion` e a preferência interna.
3. **Cultivo:** árvores plantadas em inventário, custos crescentes, consumo individual de água, nutrientes e luz. Ipê-amarelo, jacarandá-da-bahia e sequoia-costeira têm cards com informações e fontes. A sequoia exige uma expedição à Costa do Pacífico.
4. **Estratégia:** quatro estações (3 minutos cada), previsão a cada minuto; chuva, seca, regadores acumulados, captação, compostagem, manejo de luz e viveiros. A eficiência cai quando os recursos não sustentam a demanda.
5. **Emergências:** incêndios e pragas, com oito ações em 30 segundos. Sucesso dá 35 folhas e um regador. Falha reduz a produção em 35% por 90 segundos; não apaga árvores. Um aviso no topo permite chegar ao evento a partir de qualquer tela.
6. **Polinização:** duas receitas fictícias, 35% de chance; cada terceira tentativa global garante o híbrido quando a receita é compatível. Cada tentativa custa 180 folhas, 25 água e 25 nutrientes. Tentativas sem híbrido devolvem 15 nutrientes. As árvores parentais permanecem.
7. **Prestígio:** doe uma floresta com 100% de recuperação e 5.000 folhas produzidas. Ganhe `floor(sqrt(folhas / 5000) × 3)` sementes ancestrais e invista em produção permanente (+50% por nível), reposição de recursos e novos biomas. Há dependências entre as habilidades.
8. **Estatísticas:** produção por minuto, cliques por intervalo, tabela acessível, períodos selecionáveis e distribuição de árvores entre biomas atuais e florestas doadas. Gráficos Canvas locais com inspeção por cursor ou teclado; nenhuma biblioteca remota é necessária.
9. **Som procedural:** Web Audio gera vento, água, pássaros e notas pentatônicas em camadas. Ativação explícita, volume suave e pausa quando a aba fica oculta.
10. **Persistência:** JSON, código `ET2.` em Base64, validação de estrutura/limites, confirmação de substituição, cópia anterior ao importar e migração do save v1. Base64 é transporte, não criptografia.

## Simulação online e offline

`engine.js` contém funções independentes do DOM. A interface passa timestamps para `advance`. O tempo é acumulado em milissegundos inteiros; a simulação avança em passos de um segundo, seguindo a mesma sequência de estações, reposição, consumo, bônus e taxas em ambos os modos.

- Limite de **7 dias de produção por ausência**, informado no retorno quando aplicado.
- Os milissegundos restantes ficam no save; recarregar não duplica ganhos.
- Emergências são geradas pelo tempo de jogo ativo. Emergências já iniciadas ficam pausadas durante a ausência.
- O histórico mantém 240 amostras a cada 30 segundos (2 horas). Cliques de cada intervalo são armazenados separadamente para evitar distorções ao descartar amostras antigas.
- A produção offline não usa simplesmente a taxa final multiplicada pelo tempo: reexecuta o consumo e o clima, incluindo períodos de escassez.
- Os valores representam a economia do jogo, não modelos científicos de restauração, previsão do tempo ou estimativas de carbono real.

## Arquitetura

| Arquivo                 | Responsabilidade                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.js`             | Estado versionado, economia, clima, eventos, RNG, regras de prestígio, simulação offline e validação de saves. Exportação UMD para navegador e Node. |
| `app.js`                | Navegação, renderização, controles acessíveis, gráficos, diálogos, importação/exportação e persistência.                                             |
| `audio.js`              | Síntese procedural com AudioContext e controle de camadas.                                                                                           |
| `index.html`            | Sete telas, cenário SVG, controles e diálogo modal.                                                                                                  |
| `styles.css`            | Identidade visual, layouts responsivos e animações.                                                                                                  |
| `tests/engine.test.cjs` | Testes determinísticos com `node:test`, sem dependências.                                                                                            |
| `scripts/`              | Servidor local e cópia dos arquivos para distribuição.                                                                                               |

A versão original foi preservada em um ZIP de backup entregue junto ao projeto. Nenhuma publicação ou push remoto foi realizado.

## Roteiro de apresentação

1. Abra **Meu ecossistema** e cuide da muda pelo mouse ou teclado.
2. Em **Espécies & cultivo**, plante mais árvores e consulte os cards ecológicos.
3. Observe entrada e demanda dos três recursos. Faça uma melhoria para compensar o consumo.
4. Em **Preferências & save**, abra a **demonstração temporária**. O save real é preservado; atualizar a página ou voltar ao save real encerra a demonstração.
5. Teste seca e regador, incêndio e pragas pelos botões da faixa de demonstração.
6. No laboratório, escolha ipê + jacarandá e realize a polinização. Continue até descobrir Aurora.
7. No diário, escolha o período, passe o cursor no gráfico e use as setas do teclado. Os dados iniciais da demonstração são fictícios e identificados pela faixa da demonstração.
8. Em **Reflorestamento global**, adquira Raízes ancestrais → Ciclo da vida → Horizontes vivos. Escolha Costa do Pacífico e doe a floresta. Confira o reinício e o bônus permanente.
9. Copie um código ou baixe o JSON. Importe a cópia e confira a confirmação. Um JSON inválido deve ser rejeitado sem alterar a partida.
10. Volte ao save real antes de terminar. Feche e reabra para verificar o resumo offline.

## Fontes dos cards

Consulta em 6 de novembro de 2026. As fontes são abertas pelo jogador em outra aba; a partida funciona sem acessá-las.

- [Ipê-amarelo — EcoCâmara](https://www2.camara.leg.br/a-camara/estruturaadm/gestao-na-camara-dos-deputados/responsabilidade-social-e-ambiental/ecocamara/recursos/bosque-dos-constituintes/flora-local/as-20-especies-originais/ipe-amarelo): polinização por abelhas, sementes dispersas pelo vento e uso na recuperação de áreas degradadas. O nome científico segue a nomenclatura apresentada pela fonte.
- [Jacarandá-da-bahia — EcoCâmara](https://www2.camara.leg.br/a-camara/estruturaadm/gestao-na-camara-dos-deputados/responsabilidade-social-e-ambiental/ecocamara/recursos/bosque-dos-constituintes/flora-local/as-20-especies-originais/jacaranda-da-bahia): ocorrência e conservação.
- [Coast Redwood — National Park Service](https://www.nps.gov/articles/000/coast-redwood.htm): distribuição na costa do Pacífico dos EUA e contribuição da neblina para o ecossistema.

Híbridos intergenéricos, multiplicadores, consumo, estações e restauração em minutos são mecânicas fictícias. Não se destinam a orientar plantios reais.

## Limites do protótipo

Save local sem conta ou sincronização entre aparelhos. Use uma aba por partida. Não há servidor de jogo nem proteção antitrapaça; um save editado pelo próprio jogador pode alterar a economia. A validação evita dados malformados, referências desconhecidas e valores fora dos limites, mas não autentica a autoria do progresso. As florestas doadas mantêm os 200 registros mais recentes.
