# Painel único: música + Letterboxd — Design

Data: 2026-11-25
Status: aguardando revisão
Origem: issue EduardoMilani8/spotify-github-card#1 (protótipo aprovado em
`card-github-prototipo.svg`, anexado à issue)
Relacionado: [card "Now Playing"](2026-11-22-spotify-github-card-design.md),
[vitrine](2026-11-24-vitrine-design.md)

## 1. Objetivo

Trocar as duas imagens atuais do README do perfil (vinil + vitrine) por **um painel
só**, com cara de repositório do GitHub e 4 quadros: tocando agora, álbuns do mês,
última review do Letterboxd e top 4 filmes. O visual é o do protótipo da issue;
esta spec fixa só o que o protótipo não responde (dados, falhas, cache).

### Fora do escopo

- Tudo o que a issue lista como descartado (Steam, livro de visitas, etc.).
- Mudar as rotas atuais: `/api/now-playing` e `/api/showcase` ficam como estão,
  servindo de reserva até o painel estar firme.
- Versão em inglês: o painel é **só em português** (sem `?lang`).

## 2. Visual

Segue a issue e o protótipo à risca: SVG 840×356, fundo `#0d1117`, cores do
Primer, cabeçalho `eduardo / gostos` + `Public`, 4 quadros de 392×140 em 2×2
(x 20.5 e 427.5; y 48.5 e 198.5). Detalhes por quadro estão na issue; abaixo, só
as regras que dependem dos dados.

- **Sem prefixo `p5`**: ids e keyframes ganham prefixo por quadro (`m-` música,
  `a-` álbuns, `r-` review, `t-` top 4) para não colidir dentro do mesmo SVG.
- **`prefers-reduced-motion`**: tudo para; ficam visíveis o 1º título do carrossel
  e o 1º filme do top 4.
- Todo texto externo passa por `escaparXml`.

### 2.1 `tocando-agora`

| Estado (de `escolherEstado`) | Bolinha | Disco / braço | Texto do rodapé |
|---|---|---|---|
| `tocando` | verde + anel pulsando | gira 4s, braço vibra | `ao vivo no Spotify` |
| `pausada` | cinza `#6e7681` | parado, braço em -38° | `pausado no Spotify` |
| `ultima` | cinza | parado, braço em -38° | `tocada ${tempoDecorrido}` (pt) |
| `vazio` | cinza | parado, sem capa | `nada tocando agora` |

Estado vai como classe na raiz do SVG (`class="tocando"` etc.). Nome da música
(18px) e artistas (13px) usam `ajustarTexto` com largura 210px: diminuem até o
mínimo e depois rolam, como no card atual.

### 2.2 `albuns-do-mes`

O carrossel de `render-vitrine.ts` com os mesmos tempos, embrulhado em
`translate(479.5 72) scale(.72)`, sombra `#0d1117`, indicadores em
`translate(775 64)`, mês em minúsculas ao lado do título (`novembro`, UTC).
1–2 álbuns: o modo estático da vitrine. 0 álbuns: três vinis esmaecidos +
`vitrine em breve`.

### 2.3 Última review (Letterboxd)

- **Fonte**: `https://letterboxd.com/${LETTERBOXD_USER}/rss/` (usuário
  `gozousado`). Verificado em 2026-11-25: 52 itens, 50 reviews e 2 listas.
- **Regra de escolha**: primeiro item do RSS que tenha `letterboxd:filmTitle` **e**
  texto de review. Listas (sem `filmTitle`) e registros só de diário (sem texto)
  são pulados.
- **Campos**:
  - título do quadro = `filmTitle` (14px, `#4493f8`, corta com "…" se passar de
    ~200px);
  - estrelas = `memberRating` (0.5–5.0) em ★ cheias + ½; sem nota, sem estrelas;
  - trecho = texto da `description` sem HTML, sem a `<img>` do pôster e sem o
    aviso de spoiler, espaços colapsados; quebra em **até 2 linhas** de ~290px
    (14px) e a 2ª termina em "…" se sobrar texto; entre aspas “ ”;
  - pôster = `src` da `<img>` da `description`, trocando o tamanho
    `0-600-0-900` por `0-150-0-225` (56×84 na tela, nítido em tela 2×);
  - rodapé = `review de ${dia} ${mês abreviado}` usando `watchedDate`
    (ex.: `review de 9 ago`), mais as 3 bolinhas do Letterboxd paradas.
- **Vazio** (RSS fora do ar, sem reviews, usuário não configurado): título
  `ultima-review`, texto `nenhuma review por aqui ainda`, sem pôster.

### 2.4 `top-4-filmes`

Lista fixa em `src/painel/top4.ts`, trocada à mão:

| Título | Ano | Direção | Pôster (`a.ltrbxd.com`, 70×105) |
|---|---|---|---|
| Rocky | 1976 | John G. Avildsen | `51090-rocky` |
| Raiders of the Lost Ark | 1981 | Steven Spielberg | `51965-raiders-of-the-lost-ark` |
| Uncut Gems | 2019 | Josh Safdie, Benny Safdie | `404266-uncut-gems` |
| Bingo: O Rei das Manhãs | 2017 | Daniel Rezende | `362368-bingo-the-king-of-the-mornings` |

URLs completas (com `?v=`) ficam no arquivo. O CDN só aceita tamanhos da lista
dele: `0-70-0-105` funciona (~4,5 KB), `0-80-0-120` dá 403.
Pôster que falhar ao baixar vira um retângulo `#161b22` com borda, sem quebrar o
destaque animado.

## 3. Arquitetura

```
GET /api/painel?mock=...
  └─ gerarPainel(deps)
       ├─ obterEstado(deps) + capa       (src/gerar-card.ts, sem mudanças)
       ├─ dadosLentos(deps)              (memo de 1h na instância)
       │    ├─ obterAlbuns + capas       (src/vitrine/gerar-vitrine.ts)
       │    ├─ buscarReview(user)        → RSS → escolherReview → pôster
       │    └─ pôsteres do top 4
       └─ renderizarPainel(dados, agora) → SVG
```

- As três frentes rodam em paralelo (`Promise.all`), cada uma com seu `catch`:
  **cada parte falha sozinha** e cai no próprio estado vazio.
- **Cache**:
  - `Cache-Control: no-cache, no-store, max-age=0` (camo) e **sem cache na CDN**:
    o quadro "tocando agora" precisa ser exato, como no card atual.
  - Para não bater no Letterboxd e na playlist a cada visita, álbuns, review e
    pôsteres ficam num **memo em memória da função** (variável de módulo) por 1h;
    se a última tentativa falhou, o memo dura só 60s. Instância fria = busca de
    novo, o que é aceitável.
  - Custo: trocar a playlist ou publicar review leva até 1h por instância.
- **Link**: o `<a>` do README aponta para `/api/open` (música atual), já que o
  GitHub só permite um link por imagem.
- **Tamanho**: capa atual + 3 álbuns (~50 KB cada em base64) + 5 pôsteres
  pequenos (~30 KB juntos) ≈ 230 KB. Aceitável; se passar de 400 KB, reduzir as
  capas dos álbuns é o próximo passo.

### Componentes novos

| Arquivo | Responsabilidade |
|---|---|
| `src/painel/letterboxd.ts` | `buscarRss(user, fetchFn)`, `escolherReview(xml): Review \| null` (pura, usa `fast-xml-parser`) |
| `src/painel/top4.ts` | lista fixa `TOP4: Filme[]` |
| `src/painel/tipos.ts` | `Review`, `Filme`, `DadosPainel` |
| `src/painel/quebrar-texto.ts` | `quebrarLinhas(texto, larguraMax, fontSize, maxLinhas)` com "…" |
| `src/painel/render-painel.ts` | `renderizarPainel(dados, agora)`: monta os 4 quadros |
| `src/painel/gerar-painel.ts` | orquestra, memo de 1h, fallbacks |
| `api/painel.ts` | handler `GET`, lê `mock` |

### Reaproveitamento sem copiar código

- `render-svg.ts` e `render-vitrine.ts` passam a exportar as **peças** do disco
  e do carrossel (markup + CSS, com prefixo de id como parâmetro), e os cards
  atuais usam as mesmas peças. Os testes atuais garantem que os cards não mudam.
- `fast-xml-parser` sai de `devDependencies` para `dependencies` (agora roda em
  produção).
- `.env.example`: `LETTERBOXD_USER=`.

## 4. Mocks

`/api/painel?mock=` aceita `playing`, `paused`, `last`, `empty` (música, como já
existe) e usa álbuns, review e top 4 de exemplo sem rede. `mock=empty` deixa
**todos** os quadros no estado vazio.

## 5. Testes

- `escolherReview`: RSS de exemplo (recorte do real, salvo em `tests/fixtures/`)
  → filme, nota, trecho limpo, pôster redimensionado, data; pula lista; pula item
  sem texto; tira aviso de spoiler; RSS vazio ou XML quebrado → `null`.
- `quebrarLinhas`: cabe em 1 linha; quebra em 2; corta com "…"; palavra gigante.
- Estrelas: 4.5 → ★★★★½; 1.0 → ★; sem nota → nada.
- `renderizarPainel`: XML válido; classe do estado na raiz; ids sem colisão
  (nenhum `id` repetido); 0/1–2/3 álbuns; review vazia; reduced motion.
- `gerarPainel`: caminho feliz com `fetchFn` falso; Letterboxd fora → música
  intacta; Spotify fora → review e top 4 intactos; memo reaproveita e expira.
- Cards atuais: os testes existentes continuam passando depois da extração das
  peças.
- `api/painel`: 200, SVG, cabeçalhos, mocks.

## 6. Riscos

- **Letterboxd bloquear a Vercel** (Cloudflare): não dá para testar sem deploy. Se
  acontecer, o quadro mostra o estado vazio e o resto funciona; aí avaliamos
  alternativa.
- **Memo por instância**: com várias instâncias, cada uma busca uma vez por hora.
  Tráfego de perfil é baixo, então tudo bem.

## 7. Troca no perfil (com aprovação)

Depois do deploy e de conferir em produção, o README do perfil troca as duas
`<img>` por:

```html
<a href="https://spotify-github-card.vercel.app/api/open"><img src="https://spotify-github-card.vercel.app/api/painel" width="840" alt="Música e filmes do Eduardo"></a>
```

Voltar atrás = restaurar as duas `<img>` antigas.

## 8. Contribuição do usuário (modo aprendizado)

O dono implementa `escolherReview` (seção 2.3): decide quais itens do RSS contam
como review e limpa o texto, coberto pelos testes da seção 5.
