# EverTree — Protótipo Web de IHC

Projeto acadêmico de média fidelidade, desenvolvido em HTML, CSS e JavaScript puro com base na proposta do EverTree.

## Como abrir

1. Extraia o arquivo ZIP.
2. Abra `dist/index.html` com dois cliques no Chrome, Edge ou Firefox.
3. Clique na árvore e explore o menu à esquerda (ou a barra inferior no celular).

Não é preciso instalar programas, usar banco de dados ou criar uma conta. Tudo funciona sem internet.

## As quatro telas

1. **Meu jardim:** árvore clicável, saldo de folhas, ganhos por clique/segundo e próxima meta.
2. **Melhorias:** compra de upgrades manuais e automatizados; preços aumentam a cada compra.
3. **Minha floresta:** desbloqueio e seleção de quatro espécies e três biomas, cada um com multiplicador próprio.
4. **Conquistas:** estatísticas, seis medalhas, bônus temporário de 2× folhas e ferramentas de teste.

## Teste rápido para o Simon e os participantes

1. Clique na árvore até conseguir comprar **Água fresquinha** (15 folhas).
2. Compre a melhoria e perceba o aumento de folhas por clique.
3. Depois, em **Conquistas**, clique em **Simular progresso** para liberar mais conteúdo imediatamente.
4. Volte à tela **Melhorias** e observe a produção automática.
5. Em **Minha floresta**, selecione outra árvore e compare os multiplicadores.
6. Atualize o navegador: o progresso continua salvo.
7. Use **Recomeçar** (em Conquistas) para iniciar outra avaliação do zero.

O botão **Simular progresso** substitui os dados da sessão por dados fictícios de demonstração. Não representa respostas nem resultados reais da pesquisa.

## Requisitos da proposta representados

| Grupo | Funcionalidade |
| --- | --- |
| RF01–RF02 | Executado no navegador com visual adaptável para computadores e celulares. |
| RF03–RF04 | Clique na árvore e atualização imediata das folhas. |
| RF05–RF08 | Melhorias para clique e produção contínua por segundo. |
| RF09–RF10 | Espécies e biomas desbloqueados por progresso, com multiplicadores. |
| RF11–RF12 | Estatísticas, medalhas e bônus temporários. |
| RF13 | Salvamento no `localStorage`, inclusive com produção automática ao retornar (limitada a uma hora offline). |

Este é um protótipo para testar usabilidade, não a versão definitiva de um jogo. A economia e as metas são números ajustáveis na constante `upgrades`, `species`, `biomes` e `achievements` em `dist/app.js`.

## Onde alterar

- `dist/index.html`: conteúdo e estrutura das quatro telas.
- `dist/styles.css`: cores, fontes, espaçamento e responsividade.
- `dist/app.js`: regras do jogo, compras, desbloqueios e salvamento.
- `PESQUISA-IHC.md`: perguntas de avaliação e quadro para registrar feedback real.
- `capturas/`: imagens das quatro telas para incluir no documento da disciplina.

## Observações para o documento de IHC

As telas usam linguagem simples, navegação visível, feedback imediato após cada ação e botões indisponíveis com preço explícito. Essas escolhas são hipóteses de interface: devem ser validadas com pessoas próximas e ajustadas após ouvir os pontos positivos e negativos.

Trabalho acadêmico: EverTree — FATEC Sorocaba, 2026.
