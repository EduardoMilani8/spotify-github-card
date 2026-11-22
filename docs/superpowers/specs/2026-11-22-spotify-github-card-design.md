# Spotify "Now Playing" card para o perfil do GitHub — Design

Data: 2026-11-22
Status: aguardando revisão

## 1. Objetivo

Mostrar no topo do perfil do GitHub um card animado com a música que o dono do
perfil está ouvindo no Spotify. Quando nada estiver tocando (ou estiver pausado),
o card mostra a última música ouvida. O card é público: qualquer visitante do
perfil vê.

O README do perfil contém **apenas** o card. Abaixo dele seguem os repositórios
fixados (Pinned) nativos do GitHub.

### Fora do escopo

- Suporte a outros usuários do Spotify (o app tem um único usuário: o dono).
- Exibir podcasts/episódios.
- Persistência/banco de dados.
- Versões diferentes do card para tema claro e escuro do GitHub.

## 2. Restrições externas

- **Spotify Development Mode (regras de fev/2026):** exige que o dono do app
  tenha Spotify Premium; 1 Client ID por desenvolvedor; até 5 usuários por app.
  O dono tem Premium. Se a assinatura cair, o card passa a mostrar o estado
  "vazio" (ver seção 6).
- **README do GitHub não executa JavaScript.** O card é uma imagem SVG; animações
  só via CSS dentro do SVG.
- **Proxy de imagens do GitHub (Camo)** faz cache das imagens e desiste de
  respostas lentas. O endpoint deve responder rápido e com cabeçalhos anti-cache.
- **SVG dentro de `<img>` não carrega recursos externos.** A capa do álbum precisa
  ser embutida em base64.
- **Vercel, plano Hobby (gratuito):** sem prazo de expiração para uso pessoal.

## 3. Visual (aprovado)

Card de 460×150 (viewBox), exibido com `width="440"` no README. Como é vetorial,
o tamanho pode ser ajustado só no README, sem novo deploy.

- **Fundo:** `#0e4429` (verde do gráfico de contribuições do GitHub), cantos
  arredondados (rx 10). Igual em tema claro e escuro.
- **Disco de vinil** (esquerda, centro em 78,75, raio 60): preto `#010409`, com
  sulcos concêntricos e um reflexo sutil.
- **Capa do álbum** no centro do disco, recortada em círculo (`<clipPath>`, raio
  25), com um anel `#39d353`. Gira junto com o disco.
- **Braço do toca-discos:** pivô em (156,20), agulha apoiada na borda do disco.
- **Textos** (a partir de x=178):
  - Selo de estado: `TOCANDO AGORA` ou `ÚLTIMA OUVIDA`, 11px, `#9be9a8`,
    espaçamento entre letras 1.5.
  - Nome da música: 20px, branco, peso 500.
  - `Artista · Álbum`: 13px, branco 75% de opacidade.
- **Equalizador:** grade 5×3 de quadradinhos 8×8 (rx 2) no estilo do gráfico de
  contribuições, nas cores `#9be9a8`, `#40c463`, `#39d353`, acendendo e apagando
  com atrasos diferentes.
- **Rodapé:** logo do Spotify em branco + texto `no Spotify` (tocando) ou
  `há X min no Spotify` (última ouvida).

### Estados visuais

| Estado | Disco | Braço | Equalizador | Selo | Rodapé |
|---|---|---|---|---|---|
| `tocando` | gira (4s/volta) | sobre o disco | animado | TOCANDO AGORA | no Spotify |
| `ultima` | parado | afastado (rotate −38°) | apagado (opacidade 0.2) | ÚLTIMA OUVIDA | há X min no Spotify |
| `vazio` | parado, selo verde liso no lugar da capa | afastado | apagado | — | Nada tocando por aqui |

O servidor gera o SVG já no estado correto. Não há JavaScript no SVG.

### Nomes longos (nunca cortar o texto)

Aplicado ao nome da música e à linha `Artista · Álbum`, cada um com sua largura
disponível (~270 unidades do viewBox, de x=178 até a margem direita).

1. Estimar a largura do texto: `caracteres × fontSize × 0.56` (fator médio para
   fonte sans-serif, com margem de segurança).
2. Se couber no tamanho padrão → usa o tamanho padrão.
3. Senão, reduzir a fonte até o mínimo (música: 20 → 16px; artista: 13 → 11px).
4. Se ainda não couber no mínimo → **rolagem (marquee)**: o texto fica dentro de
   um `<clipPath>` com a largura disponível e uma animação CSS o desloca até o
   final, pausa, e volta (ciclo de ~9s, pausas nas pontas). A distância do
   deslocamento é calculada no servidor a partir da largura estimada.

## 4. Arquitetura

```
GitHub (Camo) ──► Vercel GET /api/now-playing
                    1. refresh token → access token
                    2. GET /v1/me/player/currently-playing
                    3. se não estiver tocando → GET /v1/me/player/recently-played?limit=1
                    4. baixa a capa (menor imagem ≥ 64px) → base64
                    5. monta o SVG
                    └─► 200 image/svg+xml, Cache-Control: no-cache, no-store, max-age=0
```

README do perfil:

```html
<a href="https://<app>.vercel.app/api/open">
  <img src="https://<app>.vercel.app/api/now-playing" width="440" alt="Música que estou ouvindo no Spotify">
</a>
```

### Configuração (uma vez)

1. Criar app no Spotify Developer Dashboard → `SPOTIFY_CLIENT_ID`,
   `SPOTIFY_CLIENT_SECRET`. Redirect URI: `http://127.0.0.1:8888/callback`.
2. Rodar localmente `scripts/get-refresh-token.ts`: abre o login do Spotify com os
   escopos `user-read-currently-playing` e `user-read-recently-played`, recebe o
   código no callback local e imprime o `SPOTIFY_REFRESH_TOKEN`.
3. Cadastrar as três variáveis nas Environment Variables da Vercel. Nunca no
   código ou no repositório (`.env` no `.gitignore`).

## 5. Componentes

Stack: TypeScript, Vercel Functions (sem framework), Vitest.

| Arquivo | Responsabilidade | Depende de |
|---|---|---|
| `src/spotify.ts` | Trocar refresh token por access token; buscar "tocando agora" e "tocadas recentemente"; baixar capa em base64. Timeout curto por chamada. | `fetch` |
| `src/escolher-estado.ts` | **Função pura.** Recebe a resposta de "tocando agora" e a de "recentes" e devolve `{ tipo: 'tocando' \| 'ultima' \| 'vazio', musica?, tocadaEm? }`. Regra: só é `tocando` se houver item do tipo música **e** `is_playing === true`; senão usa a última música do histórico; sem histórico → `vazio`. | — |
| `src/texto.ts` | `escaparXml`, estimativa de largura, ajuste de fonte/marquee, formatação de "há X min/h/dias". | — |
| `src/render-svg.ts` | Recebe o estado + capa base64 e devolve a string SVG. Não sabe nada de Spotify. | `texto.ts` |
| `api/now-playing.ts` | Liga as peças, define cabeçalhos, trata erros. Aceita `?mock=tocando\|ultima\|vazio\|longo` para prévia sem Spotify. | todos acima |
| `api/open.ts` | Redireciona (302) para a URL da música atual/última no Spotify; sem música → perfil do usuário no Spotify. | `spotify.ts`, `escolher-estado.ts` |
| `scripts/get-refresh-token.ts` | Fluxo de autorização local, executado uma vez. | — |

## 6. Erros e casos especiais

Regra geral: **o endpoint sempre responde 200 com um SVG válido.** Erros vão para
o log da Vercel (`console.error`), nunca para o card.

| Situação | Resultado |
|---|---|
| Tocando música | estado `tocando` |
| Pausado / nada tocando (`204`) | estado `ultima` |
| Tocando podcast/episódio | ignorado → estado `ultima` |
| Histórico vazio | estado `vazio` |
| Spotify indisponível, token inválido/revogado, Premium expirado, timeout | estado `vazio` |
| Capa indisponível (ex.: arquivo local) | selo verde liso no centro do disco |
| Texto com `& < > " '` | escapado antes de entrar no SVG |
| Nome longo | ajuste de fonte → marquee (seção 3) |

## 7. Testes

- **Unitários (Vitest):**
  - `escolher-estado`: tocando, pausado com item, 204 + histórico, podcast,
    histórico vazio, entradas nulas.
  - `texto`: escape de XML; estimativa de largura; escolha de fonte/marquee nos
    três cenários; "há X min" (minutos, horas, dias).
  - `render-svg`: o SVG gerado é XML válido em cada estado; contém/omite as
    classes de animação conforme o estado; nome com caracteres especiais não
    quebra o XML.
- **Prévia manual:** `vercel dev` + `/api/now-playing?mock=...` no navegador para
  conferir cada estado visualmente.
- **Teste real:** deploy na Vercel e conferência no README do perfil.

## 8. Contribuição do usuário (modo aprendizado)

`src/escolher-estado.ts` será escrita pelo usuário (≈10 linhas), com assinatura,
tipos e testes preparados antes.
