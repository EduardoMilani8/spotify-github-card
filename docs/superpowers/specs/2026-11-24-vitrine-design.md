# Vitrine de álbuns ao lado do card — Design

Data: 2026-11-24
Status: aguardando revisão
Relacionado: [card "Now Playing"](2026-11-22-spotify-github-card-design.md)

## 1. Objetivo

Preencher o espaço vazio à direita do card do vinil, no README do perfil, com uma
**vitrine de 3 álbuns escolhidos a dedo** pelo dono do perfil. A seleção muda uma
vez por mês e deve ser fácil de trocar: sem código e sem deploy.

### Fora do escopo

- Mais de 3 álbuns na vitrine.
- Histórico das vitrines passadas.
- Escolha automática de álbuns (top artistas, mais ouvidos etc.).
- Ajustes de animação por usuário (velocidade, tempo de destaque).

## 2. Fonte dos álbuns: uma playlist do Spotify

- O dono cria uma playlist (ex.: "Vitrine") e coloca **uma música de cada álbum**.
- A vitrine mostra o **álbum** de cada música, nunca a música: capa, nome do álbum
  e artistas do álbum.
- A ordem da playlist é a ordem da vitrine.
- A playlist é indicada pela variável de ambiente `SPOTIFY_SHOWCASE_PLAYLIST`, que
  aceita o link (`https://open.spotify.com/playlist/<id>?si=...`) ou só o `<id>`.

### Regra de seleção (`escolherAlbuns`)

Percorre os itens da playlist em ordem e devolve **até 3 álbuns distintos**:

- Ignora itens sem faixa (`item` nulo), episódios de podcast (`type !== 'track'`)
  e arquivos locais (`is_local: true` ou álbum sem `id`).
- Dois itens do mesmo álbum (mesmo `album.id`) contam uma vez só; vale o primeiro.
- Para assim que juntar 3.

### Restrições da API (verificadas em 2026-11-24)

- Endpoint: `GET /v1/playlists/{id}/items`. O antigo `/tracks` foi removido nas
  mudanças de fev/2026, e o novo só devolve o conteúdo de playlists **do próprio
  usuário** (ou em que ele colabora). Cada entrada traz a faixa no campo `item`.
- O token atual tem só `user-read-currently-playing user-read-recently-played`.
  `GET /me/playlists` respondeu `403 Insufficient client scope`. O script
  `npm run token` passa a pedir também `playlist-read-private`, e o dono gera o
  token de novo uma vez.
- A chamada usa `limit=20` e `fields` para trazer só o necessário:
  `items(item(type,is_local,album(id,name,artists(name),images)))`.

## 3. Visual (aprovado): carrossel

Imagem de 400×150 (viewBox), fundo `#0e4429`, mesma linguagem do card do vinil.
Exibida com `width="383"` ao lado do card com `width="440"`, os dois ficam com a
mesma altura (~143,5px).

### Elementos

- **Cabeçalho** à esquerda: `ON DISPLAY · NOVEMBER` (en) ou
  `EM EXPOSIÇÃO · NOVEMBRO` (pt), 10px, `#9be9a8`, espaçamento 1.5. O mês é o mês
  atual em UTC no momento da requisição.
- **Indicador** à direita: 3 quadradinhos de 8×8 (rx 2) no estilo da grade de
  commits; o do álbum em destaque fica `#39d353`, os outros `#006d32`.
- **Brilho** verde radial pulsando atrás da posição central (4s).
- **Sombra no piso**: elipse escura sob a área dos discos.
- **Cada álbum**:
  - capa 84×84 (rx 3), com a imagem embutida;
  - vinil atrás da capa (r 40, sulcos, reflexo); o selo central é a **própria capa**
    recortada em círculo (r 12) com aro `#39d353`, como no card principal;
  - reflexo da capa no chão: cópia espelhada com máscara em degradê (30%→0);
  - camada de escurecimento (`#0e4429`) para dar profundidade nas laterais.
- **Título** centralizado embaixo (y 138, 11px): `Álbum · Artistas`, com os
  artistas em 65% de opacidade. Um texto por álbum, visível só quando o álbum está
  na frente.

### Animação (ciclo de 12s, 4s por álbum)

Todos os elementos de um álbum usam a mesma animação com o mesmo atraso, via a
variável CSS `--d` (0s, -8s, -4s). Posições da órbita (`translate`, `scale`,
`skewY`, sempre nessa ordem para a interpolação funcionar):

| Momento | Posição | translate | scale | skewY |
|---|---|---|---|---|
| 0–25% | frente | 200, 68 | 1, 1 | 0° |
| 29,2% | meio do caminho | 138, 71 | .78, .84 | 5° |
| 33,3–58,3% | esquerda | 78, 73 | .56, .68 | 10° |
| 62,5% | atrás (pequeno, no alto) | 200, 50 | .34, .38 | 0° |
| 66,6–91,6% | direita | 322, 73 | .56, .68 | -10° |
| 95,8% | meio do caminho | 262, 71 | .78, .84 | -5° |

- Cada transição usa duas curvas: `cubic-bezier(.55,0,1,.6)` acelerando até o meio
  e `cubic-bezier(0,.4,.35,1.08)` freando com leve balanço.
- As rotas **não se cruzam**: no instante em que um disco passa por trás
  (x 184–216), os outros ocupam x 106–174 e 226–294. Por isso a ordem dos
  elementos no SVG não importa (o SVG não tem z-index animável).
- **Escurecimento**: 0 na frente, .45 nas laterais, .75 atrás.
- **Vinil**: desliza 32px para a direita entre 3% e 10%, fica fora até 20% e volta
  até 25%. Gira sem parar (2,2s por volta) num grupo interno, separado do grupo que
  desliza.
- **Título**: aparece subindo 6px entre 0% e 5%, some entre 22% e 26%.
- **Indicador**: aceso de 0% a 25%.

### Nomes longos (nunca cortar)

Mesma regra do card: o título tenta de 11px até 9px; se ainda não couber em 360px,
rola de um lado para o outro (marquee) com `clipPath`, reaproveitando
`ajustarTexto` e o padrão de `linha()` do `render-svg.ts`.

### Menos de 3 álbuns

- **1 ou 2 álbuns**: ficam parados, lado a lado e centralizados, em tamanho de
  destaque, com o vinil para fora girando e o título de cada um embaixo. Sem
  órbita, sem indicador.
- **0 álbuns**: estado vazio (seção 5).

## 4. Arquitetura

```
GET /api/showcase?lang=en|pt&mock=...
  └─ gerarVitrine(deps, idioma)
       ├─ obterAccessToken            (reaproveitado de src/spotify.ts)
       ├─ buscarItensPlaylist(id)     → JSON bruto da playlist
       ├─ escolherAlbuns(itens)       → Album[] (até 3), função pura
       ├─ baixarCapaBase64 × 3        (reaproveitado, em paralelo)
       └─ renderizarVitrine(albuns, capas, agora, idioma) → SVG
```

- **Endpoint independente** do `/api/now-playing`: uma falha na playlist não afeta
  o card do vinil, e vice-versa.
- **Cache em duas camadas**:
  - `Cache-Control: no-cache, no-store, max-age=0`, para o Camo do GitHub não
    congelar a imagem;
  - `CDN-Cache-Control: max-age=3600, stale-while-revalidate=86400`, para a CDN da
    Vercel guardar o SVG pronto por 1h.
  - Custo: uma troca na playlist leva até 1h para aparecer.
- **Clique**: o `<a>` do README aponta direto para o link da playlist. Não precisa
  de endpoint de redirecionamento.

### Componentes novos

| Arquivo | Responsabilidade |
|---|---|
| `src/vitrine/tipos.ts` | `Album {id, nome, artistas, capaUrl}` e os tipos da resposta da playlist |
| `src/vitrine/playlist.ts` | `lerIdPlaylist(valor)` (link ou ID → ID), `buscarItensPlaylist(token, id, fetchFn)` |
| `src/vitrine/escolher-albuns.ts` | `escolherAlbuns(itens): Album[]`, a regra da seção 2 |
| `src/vitrine/render-vitrine.ts` | `renderizarVitrine(albuns, capas, agora, idioma)` |
| `src/vitrine/gerar-vitrine.ts` | orquestra token → playlist → álbuns → capas → SVG, com fallback |
| `api/showcase.ts` | handler `GET`, lê `lang` e `mock` |

### Mudanças em arquivos existentes

- `src/idioma.ts`: textos da vitrine (cabeçalho, nomes dos meses, estado vazio,
  rótulo de acessibilidade).
- `src/spotify.ts`: `getApi` passa a aceitar a URL base, para chamar `/playlists`
  além de `/me/player`.
- `src/musica.ts`: `escolherImagemCapa` reaproveitado sem mudanças.
- `src/mocks.ts`: mocks da vitrine.
- `scripts/get-refresh-token.ts`: acrescenta `playlist-read-private` aos escopos.
- `.env.example`: `SPOTIFY_SHOWCASE_PLAYLIST=`.
- `README.md`: seção opcional "Album showcase" com o passo a passo.

## 5. Erros e casos especiais

A resposta é **sempre 200 com um SVG válido**, como no card do vinil.

| Situação | Resultado |
|---|---|
| `SPOTIFY_SHOWCASE_PLAYLIST` ausente ou inválida | estado vazio + log |
| Falha no token, 403/404 na playlist, timeout | estado vazio + log |
| Resposta em formato inesperado | estado vazio + log |
| Playlist sem álbuns válidos | estado vazio |
| Capa que falha ao baixar | vinil e capa com selo verde liso (`#39d353`), sem imagem |
| Erro ao montar o SVG | estado vazio |

**Estado vazio**: cabeçalho normal, três vinis parados e esmaecidos em fila e o
texto `Showcase coming soon` (en) / `Vitrine em breve` (pt).

Todos os textos que vêm do Spotify passam por `escaparXml`.

## 6. Testes

- `escolherAlbuns`: ordem preservada; álbum repetido conta uma vez; ignora
  `item` nulo, episódio e arquivo local; corta em 3; lista vazia → `[]`.
- `lerIdPlaylist`: link com `?si=`, link sem query, ID puro, `spotify:playlist:<id>`,
  valor vazio ou lixo → `null`.
- `buscarItensPlaylist`: monta a URL com `fields` e `limit`; erro HTTP lança.
- `renderizarVitrine`: XML válido com 3, 2, 1 e 0 álbuns; 3 álbuns → classe de
  órbita e 3 indicadores; 1–2 → sem órbita; mês e idioma no cabeçalho; nome longo
  → rolagem; caracteres especiais escapados.
- `gerarVitrine`: com `fetchFn` falso, o caminho feliz e cada linha da tabela de
  erros.
- `api/showcase`: status 200, `Content-Type` SVG e os dois cabeçalhos de cache;
  `?mock=showcase` e `?mock=empty`.

## 7. Configuração (uma vez)

1. Rodar `npm run token` de novo e trocar `SPOTIFY_REFRESH_TOKEN` no `.env` e na
   Vercel.
2. Criar a playlist e colar o link em `SPOTIFY_SHOWCASE_PLAYLIST` (`.env` e
   Vercel), depois fazer Redeploy.
3. No README do perfil, as duas imagens lado a lado:

```html
<a href="https://spotify-github-card.vercel.app/api/open"><img src="https://spotify-github-card.vercel.app/api/now-playing" width="440" alt="What I'm listening to on Spotify"></a>
<a href="https://open.spotify.com/playlist/<id>"><img src="https://spotify-github-card.vercel.app/api/showcase" width="383" alt="Albums on display this month"></a>
```

As duas tags ficam na mesma linha para o GitHub não inserir quebra entre elas. Em
telas estreitas, a vitrine desce para baixo do card naturalmente.

## 8. Contribuição do usuário (modo aprendizado)

O dono implementa `escolherAlbuns` (seção 2): regra pura de lista para lista, com
decisões reais de filtragem e deduplicação, coberta pelos testes da seção 6.
