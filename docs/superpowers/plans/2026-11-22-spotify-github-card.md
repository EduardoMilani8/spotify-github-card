# Spotify GitHub Card — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um endpoint na Vercel que devolve um SVG animado (vinil) com a música que o dono está ouvindo no Spotify, ou a última ouvida, para exibir no README do perfil do GitHub.

**Architecture:** Funções puras (`texto`, `musica`, `escolher-estado`, `render-svg`) fazem toda a lógica e são testadas isoladamente; `spotify.ts` é a única camada que fala HTTP, com `fetch` injetável; `gerar-card.ts` orquestra tudo com dependências injetadas; `api/*.ts` são cascas finas no formato Web (`export async function GET(request: Request)`) das Vercel Functions.

**Tech Stack:** Node 22, TypeScript (ESM, `module: NodeNext`), Vitest, tsx (script local), fast-xml-parser (só nos testes), Vercel Functions.

**Spec:** `docs/superpowers/specs/2026-11-22-spotify-github-card-design.md`

## Global Constraints

- Fundo do card: `#0e4429`; viewBox `0 0 460 150`; README usa `width="440"`.
- Disco: centro (78,75), raio 60, cor `#010409`; capa recortada em círculo de raio 25 com anel `#39d353`.
- Braço: pivô (156,20); fora do estado `tocando` recebe `transform="rotate(-38 156 20)"`.
- Textos começam em x=178; largura disponível 266. Nome: 20px → mín. 16px. Artista/álbum: 13px → mín. 11px. Fator de largura 0.56 (1.0 para code point ≥ U+2E80).
- Selo: `TOCANDO AGORA` / `ÚLTIMA OUVIDA`, 11px, `#9be9a8`, letter-spacing 1.5. Vazio: sem selo, nome = `Nada tocando por aqui`.
- Rodapé: `no Spotify` (tocando e vazio) ou `<tempo> no Spotify` (última).
- Equalizador: 5×3 quadrados 8×8, rx 2, cores por linha `#9be9a8`, `#40c463`, `#39d353`.
- `/api/now-playing` **sempre** responde 200 `image/svg+xml` com `Cache-Control: no-cache, no-store, max-age=0`.
- Escopos do Spotify: `user-read-currently-playing user-read-recently-played`. Redirect URI: `http://127.0.0.1:8888/callback`.
- Segredos só em `.env` (ignorado pelo git) e nas Environment Variables da Vercel: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
- Imports relativos entre arquivos TS usam extensão `.js` (exigência do ESM/NodeNext).
- Textos visíveis em português do Brasil.

## Review Focus

1. **Faixa sem capa** (arquivo local, `album.images` vazio) → card renderiza com selo verde liso, sem `<image>`. Teste na Task 2 (`escolherImagemCapa([])`) e Task 6 (capa nula).
2. **Credenciais ausentes ou refresh token revogado (401)** → card `vazio` com status 200, erro só no log. Teste na Task 6.
3. **Spotify lento (timeout/AbortError) ou uma das duas chamadas falhando** → se a outra chamada respondeu, usa ela; se o token falhou, `vazio`. Teste na Task 6.
4. **Nome em japonês/coreano ou com emoji** → largura estimada maior, cai para rolagem em vez de vazar da borda. Teste na Task 1.
5. **Download da capa falha ou responde content-type estranho** → card sem capa (falha) ou `image/jpeg` como padrão (content-type inválido não entra no SVG). Teste na Task 5.

---

## Estrutura de arquivos

```
package.json, tsconfig.json, vitest.config.ts, .env.example, README.md
src/tipos.ts            tipos da API do Spotify e do domínio (Musica, Estado)
src/texto.ts            escape XML, largura estimada, ajuste de fonte/rolagem, tempo decorrido
src/musica.ts           conversão faixa do Spotify → Musica; escolha da imagem da capa
src/escolher-estado.ts  regra tocando/última/vazio  ← ESCRITA PELO USUÁRIO
src/render-svg.ts       Estado + capa → string SVG
src/spotify.ts          HTTP com o Spotify (token, tocando agora, recentes, capa)
src/mocks.ts            estados de exemplo para ?mock=
src/gerar-card.ts       orquestração com dependências injetadas
api/now-playing.ts      GET → SVG
api/open.ts             GET → 302 para a música
scripts/get-refresh-token.ts  login local, roda uma vez
tests/*.test.ts
```

---

### Task 1: Projeto base + utilitários de texto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`
- Create: `src/texto.ts`
- Test: `tests/texto.test.ts`

**Interfaces:**
- Produces:
  - `escaparXml(texto: string): string`
  - `larguraEstimada(texto: string, fontSize: number): number`
  - `interface AjusteTexto { fontSize: number; rolagem: number }` (rolagem = px a deslocar; 0 = sem rolagem)
  - `ajustarTexto(texto: string, larguraMax: number, fontPadrao: number, fontMin: number): AjusteTexto`
  - `tempoDecorrido(desde: Date, agora: Date): string`

- [ ] **Step 1: Criar os arquivos de configuração**

`package.json`:
```json
{
  "name": "spotify-github-card",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "token": "tsx --env-file=.env scripts/get-refresh-token.ts"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "api", "scripts", "tests"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
})
```

`.env.example`:
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

Run: `npm install -D typescript vitest tsx fast-xml-parser @types/node`
Expected: instala sem erros; `package-lock.json` criado.

- [ ] **Step 2: Escrever os testes que falham**

`tests/texto.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ajustarTexto, escaparXml, larguraEstimada, tempoDecorrido } from '../src/texto.js'

describe('escaparXml', () => {
  it('escapa os cinco caracteres especiais do XML', () => {
    expect(escaparXml(`Rock & Roll <3 "a" 'b' >`)).toBe('Rock &amp; Roll &lt;3 &quot;a&quot; &apos;b&apos; &gt;')
  })
  it('não altera texto comum', () => {
    expect(escaparXml('Validation')).toBe('Validation')
  })
})

describe('larguraEstimada', () => {
  it('usa 0.56 × fontSize por caractere comum', () => {
    expect(larguraEstimada('abcd', 10)).toBeCloseTo(22.4)
  })
  it('conta caracteres largos (CJK, emoji) como 1.0 × fontSize', () => {
    expect(larguraEstimada('夜に駆ける', 10)).toBeCloseTo(50)
    expect(larguraEstimada('🎵', 10)).toBeCloseTo(10)
  })
})

describe('ajustarTexto', () => {
  it('mantém a fonte padrão quando cabe', () => {
    expect(ajustarTexto('Validation', 266, 20, 16)).toEqual({ fontSize: 20, rolagem: 0 })
  })
  it('reduz a fonte quando não cabe no padrão mas cabe acima do mínimo', () => {
    const texto = 'x'.repeat(26) // 26 × 0.56 × 20 = 291 > 266; com 18 → 262 ≤ 266
    expect(ajustarTexto(texto, 266, 20, 16)).toEqual({ fontSize: 18, rolagem: 0 })
  })
  it('usa rolagem no tamanho mínimo quando nem o mínimo cabe', () => {
    const texto = 'x'.repeat(40) // 40 × 0.56 × 16 = 358.4 → rola 93 (arredondado para cima)
    expect(ajustarTexto(texto, 266, 20, 16)).toEqual({ fontSize: 16, rolagem: 93 })
  })
  it('nome japonês longo rola em vez de vazar', () => {
    const aj = ajustarTexto('夜に駆ける夜に駆ける夜に駆ける夜に駆ける', 266, 20, 16)
    expect(aj.fontSize).toBe(16)
    expect(aj.rolagem).toBeGreaterThan(0)
  })
  it('texto vazio não rola', () => {
    expect(ajustarTexto('', 266, 13, 11)).toEqual({ fontSize: 13, rolagem: 0 })
  })
})

describe('tempoDecorrido', () => {
  const agora = new Date('2026-11-22T12:00:00Z')
  const antes = (ms: number) => new Date(agora.getTime() - ms)
  const MIN = 60_000
  it('menos de 1 minuto', () => expect(tempoDecorrido(antes(30_000), agora)).toBe('agora há pouco'))
  it('minutos', () => expect(tempoDecorrido(antes(12 * MIN), agora)).toBe('há 12 min'))
  it('horas', () => expect(tempoDecorrido(antes(3 * 60 * MIN), agora)).toBe('há 3 h'))
  it('um dia', () => expect(tempoDecorrido(antes(25 * 60 * MIN), agora)).toBe('há 1 dia'))
  it('vários dias', () => expect(tempoDecorrido(antes(5 * 24 * 60 * MIN), agora)).toBe('há 5 dias'))
  it('data no futuro (relógio adiantado) vira "agora há pouco"', () => {
    expect(tempoDecorrido(new Date(agora.getTime() + 5 * MIN), agora)).toBe('agora há pouco')
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/texto.test.ts`
Expected: FAIL — não encontra `../src/texto.js`.

- [ ] **Step 4: Implementar**

`src/texto.ts`:
```ts
const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export function escaparXml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

const FATOR_COMUM = 0.56
const FATOR_LARGO = 1.0
const INICIO_LARGOS = 0x2e80

export function larguraEstimada(texto: string, fontSize: number): number {
  let total = 0
  for (const caractere of texto) {
    const largo = (caractere.codePointAt(0) ?? 0) >= INICIO_LARGOS
    total += fontSize * (largo ? FATOR_LARGO : FATOR_COMUM)
  }
  return total
}

export interface AjusteTexto {
  fontSize: number
  rolagem: number
}

export function ajustarTexto(
  texto: string,
  larguraMax: number,
  fontPadrao: number,
  fontMin: number,
): AjusteTexto {
  for (let fontSize = fontPadrao; fontSize >= fontMin; fontSize--) {
    if (larguraEstimada(texto, fontSize) <= larguraMax) return { fontSize, rolagem: 0 }
  }
  return { fontSize: fontMin, rolagem: Math.ceil(larguraEstimada(texto, fontMin) - larguraMax) }
}

export function tempoDecorrido(desde: Date, agora: Date): string {
  const minutos = Math.floor((agora.getTime() - desde.getTime()) / 60_000)
  if (minutos < 1) return 'agora há pouco'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/texto.test.ts && npm run typecheck`
Expected: PASS (todos os testes) e typecheck sem erros.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .env.example src/texto.ts tests/texto.test.ts
git commit -m "feat: projeto base e utilitários de texto (escape, largura, rolagem, tempo)"
```

---

### Task 2: Tipos e conversão de faixa → Musica

**Files:**
- Create: `src/tipos.ts`, `src/musica.ts`
- Test: `tests/musica.test.ts`

**Interfaces:**
- Produces (`src/tipos.ts`):
```ts
export interface SpotifyImagem { url: string; width: number | null; height: number | null }
export interface SpotifyFaixa {
  type: 'track'
  name: string
  artists: { name: string }[]
  album: { name: string; images: SpotifyImagem[] }
  external_urls: { spotify: string }
}
export interface SpotifyEpisodio { type: 'episode'; name: string }
export interface TocandoAgora {
  is_playing: boolean
  currently_playing_type: string
  item: SpotifyFaixa | SpotifyEpisodio | null
}
export interface TocadasRecentes { items: { track: SpotifyFaixa; played_at: string }[] }
export interface Musica { nome: string; artistas: string; album: string; capaUrl: string | null; url: string }
export type Estado =
  | { tipo: 'tocando'; musica: Musica }
  | { tipo: 'ultima'; musica: Musica; tocadaEm: Date }
  | { tipo: 'vazio' }
```
- Produces (`src/musica.ts`):
  - `escolherImagemCapa(imagens: SpotifyImagem[]): string | null`
  - `paraMusica(faixa: SpotifyFaixa): Musica`

- [ ] **Step 1: Criar `src/tipos.ts`** com exatamente o bloco acima.

- [ ] **Step 2: Escrever os testes que falham**

`tests/musica.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { escolherImagemCapa, paraMusica } from '../src/musica.js'
import type { SpotifyFaixa } from '../src/tipos.js'

const img = (w: number) => ({ url: `https://i.scdn.co/${w}`, width: w, height: w })

describe('escolherImagemCapa', () => {
  it('escolhe a menor imagem com largura ≥ 100', () => {
    expect(escolherImagemCapa([img(640), img(300), img(64)])).toBe('https://i.scdn.co/300')
  })
  it('sem nenhuma ≥ 100, usa a maior disponível', () => {
    expect(escolherImagemCapa([img(64), img(32)])).toBe('https://i.scdn.co/64')
  })
  it('sem imagens (arquivo local) devolve null', () => {
    expect(escolherImagemCapa([])).toBeNull()
  })
  it('largura nula conta como 0', () => {
    expect(escolherImagemCapa([{ url: 'u', width: null, height: null }])).toBe('u')
  })
})

describe('paraMusica', () => {
  const faixa: SpotifyFaixa = {
    type: 'track',
    name: 'Validation',
    artists: [{ name: 'Artista A' }, { name: 'Artista B' }],
    album: { name: 'Validation (Deluxe)', images: [img(640), img(300)] },
    external_urls: { spotify: 'https://open.spotify.com/track/1' },
  }
  it('junta artistas com vírgula e copia os campos', () => {
    expect(paraMusica(faixa)).toEqual({
      nome: 'Validation',
      artistas: 'Artista A, Artista B',
      album: 'Validation (Deluxe)',
      capaUrl: 'https://i.scdn.co/300',
      url: 'https://open.spotify.com/track/1',
    })
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/musica.test.ts`
Expected: FAIL — não encontra `../src/musica.js`.

- [ ] **Step 4: Implementar**

`src/musica.ts`:
```ts
import type { Musica, SpotifyFaixa, SpotifyImagem } from './tipos.js'

const LARGURA_MINIMA_CAPA = 100

export function escolherImagemCapa(imagens: SpotifyImagem[]): string | null {
  if (imagens.length === 0) return null
  const porLargura = [...imagens].sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  const adequada = porLargura.find((i) => (i.width ?? 0) >= LARGURA_MINIMA_CAPA)
  return (adequada ?? porLargura[porLargura.length - 1]).url
}

export function paraMusica(faixa: SpotifyFaixa): Musica {
  return {
    nome: faixa.name,
    artistas: faixa.artists.map((a) => a.name).join(', '),
    album: faixa.album.name,
    capaUrl: escolherImagemCapa(faixa.album.images),
    url: faixa.external_urls.spotify,
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/musica.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tipos.ts src/musica.ts tests/musica.test.ts
git commit -m "feat: tipos do Spotify e conversão de faixa para Musica"
```

---

### Task 3: Regra tocando / última / vazio (escrita pelo usuário)

**Files:**
- Create: `src/escolher-estado.ts`
- Test: `tests/escolher-estado.test.ts`

**Interfaces:**
- Consumes: `TocandoAgora`, `TocadasRecentes`, `Estado` de `src/tipos.ts`; `paraMusica` de `src/musica.ts`.
- Produces: `escolherEstado(atual: TocandoAgora | null, recentes: TocadasRecentes | null): Estado`

**Modo aprendizado:** o agente cria os testes e o arquivo com a assinatura e um `throw` no corpo; **o usuário escreve o corpo** (≈10 linhas). A implementação de referência abaixo serve só para conferência depois.

- [ ] **Step 1: Escrever os testes**

`tests/escolher-estado.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { escolherEstado } from '../src/escolher-estado.js'
import type { SpotifyFaixa, TocadasRecentes, TocandoAgora } from '../src/tipos.js'

const faixa = (nome: string): SpotifyFaixa => ({
  type: 'track',
  name: nome,
  artists: [{ name: 'Artista' }],
  album: { name: 'Álbum', images: [] },
  external_urls: { spotify: `https://open.spotify.com/track/${nome}` },
})
const tocando = (nome: string, is_playing = true): TocandoAgora => ({
  is_playing,
  currently_playing_type: 'track',
  item: faixa(nome),
})
const recentes = (nome: string, played_at = '2026-11-22T11:48:00Z'): TocadasRecentes => ({
  items: [{ track: faixa(nome), played_at }],
})

describe('escolherEstado', () => {
  it('música tocando → tocando', () => {
    const e = escolherEstado(tocando('Atual'), recentes('Anterior'))
    expect(e).toMatchObject({ tipo: 'tocando', musica: { nome: 'Atual' } })
  })
  it('música pausada → última do histórico', () => {
    const e = escolherEstado(tocando('Pausada', false), recentes('Anterior'))
    expect(e).toEqual({
      tipo: 'ultima',
      musica: expect.objectContaining({ nome: 'Anterior' }),
      tocadaEm: new Date('2026-11-22T11:48:00Z'),
    })
  })
  it('nada tocando (204 → null) → última do histórico', () => {
    expect(escolherEstado(null, recentes('Anterior'))).toMatchObject({ tipo: 'ultima' })
  })
  it('podcast tocando → última música do histórico', () => {
    const podcast: TocandoAgora = {
      is_playing: true,
      currently_playing_type: 'episode',
      item: { type: 'episode', name: 'Ep. 1' },
    }
    expect(escolherEstado(podcast, recentes('Anterior'))).toMatchObject({ tipo: 'ultima' })
  })
  it('podcast sem item (Spotify manda item null) → última', () => {
    const podcast: TocandoAgora = { is_playing: true, currently_playing_type: 'episode', item: null }
    expect(escolherEstado(podcast, recentes('Anterior'))).toMatchObject({ tipo: 'ultima' })
  })
  it('nada tocando e histórico vazio → vazio', () => {
    expect(escolherEstado(null, { items: [] })).toEqual({ tipo: 'vazio' })
  })
  it('nada tocando e histórico indisponível (null) → vazio', () => {
    expect(escolherEstado(null, null)).toEqual({ tipo: 'vazio' })
  })
  it('tocando mesmo com histórico indisponível → tocando', () => {
    expect(escolherEstado(tocando('Atual'), null)).toMatchObject({ tipo: 'tocando' })
  })
})
```

- [ ] **Step 2: Criar o esqueleto**

`src/escolher-estado.ts`:
```ts
import { paraMusica } from './musica.js'
import type { Estado, TocadasRecentes, TocandoAgora } from './tipos.js'

/**
 * Decide o que o card mostra.
 * - "tocando": há uma MÚSICA (item.type === 'track') e is_playing é true.
 * - "ultima": caso contrário, a primeira faixa de `recentes` (tocadaEm = played_at).
 * - "vazio": sem música tocando e sem histórico.
 * Use paraMusica(faixa) para converter a faixa do Spotify.
 */
export function escolherEstado(atual: TocandoAgora | null, recentes: TocadasRecentes | null): Estado {
  throw new Error('escolherEstado ainda não implementada')
}
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/escolher-estado.test.ts`
Expected: FAIL — "escolherEstado ainda não implementada".

- [ ] **Step 4: Usuário implementa o corpo**

Implementação de referência (para conferir depois):
```ts
export function escolherEstado(atual: TocandoAgora | null, recentes: TocadasRecentes | null): Estado {
  if (atual?.is_playing && atual.item?.type === 'track') {
    return { tipo: 'tocando', musica: paraMusica(atual.item) }
  }
  const ultima = recentes?.items[0]
  if (ultima) {
    return { tipo: 'ultima', musica: paraMusica(ultima.track), tocadaEm: new Date(ultima.played_at) }
  }
  return { tipo: 'vazio' }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/escolher-estado.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/escolher-estado.ts tests/escolher-estado.test.ts
git commit -m "feat: regra de escolha do estado do card (tocando/última/vazio)"
```

---

### Task 4: Renderização do SVG

**Files:**
- Create: `src/render-svg.ts`
- Test: `tests/render-svg.test.ts`

**Interfaces:**
- Consumes: `Estado`, `Musica` de `src/tipos.ts`; `escaparXml`, `ajustarTexto`, `tempoDecorrido`, `AjusteTexto` de `src/texto.ts`.
- Produces: `renderizarCard(estado: Estado, capa: string | null, agora: Date): string` — `capa` é um data URI completo (`data:image/...;base64,...`) ou `null`.

- [ ] **Step 1: Escrever os testes que falham**

`tests/render-svg.test.ts`:
```ts
import { XMLValidator } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { renderizarCard } from '../src/render-svg.js'
import type { Estado, Musica } from '../src/tipos.js'

const agora = new Date('2026-11-22T12:00:00Z')
const musica = (nome = 'Validation'): Musica => ({
  nome,
  artistas: 'Artista',
  album: 'Validation (Deluxe)',
  capaUrl: 'https://i.scdn.co/300',
  url: 'https://open.spotify.com/track/1',
})
const CAPA = 'data:image/jpeg;base64,AAAA'
const tocando: Estado = { tipo: 'tocando', musica: musica() }
const ultima: Estado = { tipo: 'ultima', musica: musica(), tocadaEm: new Date('2026-11-22T11:55:00Z') }
const vazio: Estado = { tipo: 'vazio' }

describe('renderizarCard', () => {
  it.each([
    ['tocando', tocando],
    ['ultima', ultima],
    ['vazio', vazio],
  ])('gera XML válido no estado %s', (_, estado) => {
    expect(XMLValidator.validate(renderizarCard(estado, CAPA, agora))).toBe(true)
  })

  it('tocando: classe de animação, selo e braço sobre o disco', () => {
    const svg = renderizarCard(tocando, CAPA, agora)
    expect(svg).toContain('class="tocando"')
    expect(svg).toContain('TOCANDO AGORA')
    expect(svg).not.toContain('rotate(-38 156 20)')
    expect(svg).toContain('>no Spotify<')
    expect(svg).toContain('fill="#0e4429"')
  })

  it('ultima: braço afastado, selo e tempo decorrido', () => {
    const svg = renderizarCard(ultima, CAPA, agora)
    expect(svg).toContain('class="ultima"')
    expect(svg).toContain('ÚLTIMA OUVIDA')
    expect(svg).toContain('rotate(-38 156 20)')
    expect(svg).toContain('há 5 min no Spotify')
  })

  it('vazio: mensagem, sem selo e sem capa', () => {
    const svg = renderizarCard(vazio, CAPA, agora)
    expect(svg).toContain('Nada tocando por aqui')
    expect(svg).not.toContain('TOCANDO AGORA')
    expect(svg).not.toContain('ÚLTIMA OUVIDA')
    expect(svg).not.toContain('<image')
  })

  it('com capa usa <image> recortada; sem capa usa selo verde', () => {
    expect(renderizarCard(tocando, CAPA, agora)).toContain(`href="${CAPA}"`)
    const semCapa = renderizarCard(tocando, null, agora)
    expect(semCapa).not.toContain('<image')
    expect(semCapa).toContain('r="25" fill="#39d353"')
  })

  it('escapa caracteres especiais e continua XML válido', () => {
    const svg = renderizarCard({ tipo: 'tocando', musica: musica('Rock & Roll <3') }, CAPA, agora)
    expect(svg).toContain('Rock &amp; Roll &lt;3')
    expect(XMLValidator.validate(svg)).toBe(true)
  })

  it('nome longo: rolagem com keyframes e texto completo presente', () => {
    const longo = 'Um nome de música absurdamente longo (feat. Outro Artista) - Remastered'
    const svg = renderizarCard({ tipo: 'tocando', musica: musica(longo) }, CAPA, agora)
    expect(svg).toContain('@keyframes rolar-titulo')
    expect(svg).toContain('clip-path="url(#recorte-titulo)"')
    expect(svg).toContain(longo)
    expect(XMLValidator.validate(svg)).toBe(true)
  })

  it('nome curto: sem rolagem', () => {
    expect(renderizarCard(tocando, CAPA, agora)).not.toContain('@keyframes rolar-titulo')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/render-svg.test.ts`
Expected: FAIL — não encontra `../src/render-svg.js`.

- [ ] **Step 3: Implementar**

`src/render-svg.ts`:
```ts
import { ajustarTexto, escaparXml, tempoDecorrido, type AjusteTexto } from './texto.js'
import type { Estado } from './tipos.js'

const FUNDO = '#0e4429'
const X_TEXTO = 178
const LARGURA_TEXTO = 266
const FONTE = "'Segoe UI', Helvetica, Arial, sans-serif"
const CORES_EQ = ['#9be9a8', '#40c463', '#39d353']
const ATRASOS_EQ = [
  [0.1, 0.3, 0],
  [0.6, 0.2, 0.5],
  [0.4, 0.8, 0.1],
  [0.9, 0.4, 0.7],
  [0.2, 0.6, 0.3],
]

interface LinhaTexto {
  defs: string
  css: string
  elemento: string
}

function linha(
  id: string,
  texto: string,
  aj: AjusteTexto,
  y: number,
  atributos: string,
): LinhaTexto {
  const conteudo = escaparXml(texto)
  if (aj.rolagem === 0) {
    return {
      defs: '',
      css: '',
      elemento: `<text x="${X_TEXTO}" y="${y}" font-size="${aj.fontSize}" ${atributos}>${conteudo}</text>`,
    }
  }
  const altura = aj.fontSize * 1.6
  return {
    defs: `<clipPath id="recorte-${id}"><rect x="${X_TEXTO}" y="${y - aj.fontSize * 1.2}" width="${LARGURA_TEXTO}" height="${altura}"/></clipPath>`,
    css:
      `@keyframes rolar-${id}{0%,15%{transform:translateX(0)}70%,85%{transform:translateX(-${aj.rolagem}px)}100%{transform:translateX(0)}}` +
      `.rolar-${id}{animation:rolar-${id} 9s ease-in-out infinite}`,
    elemento: `<g clip-path="url(#recorte-${id})"><text class="rolar-${id}" x="${X_TEXTO}" y="${y}" font-size="${aj.fontSize}" ${atributos}>${conteudo}</text></g>`,
  }
}

function equalizador(): string {
  const quadrados: string[] = []
  ATRASOS_EQ.forEach((coluna, c) =>
    coluna.forEach((atraso, l) => {
      quadrados.push(
        `<rect x="${c * 10}" y="${l * 10}" width="8" height="8" rx="2" fill="${CORES_EQ[l]}" style="animation-delay:${atraso}s"/>`,
      )
    }),
  )
  return `<g class="eq" transform="translate(${X_TEXTO} 108)">${quadrados.join('')}</g>`
}

export function renderizarCard(estado: Estado, capa: string | null, agora: Date): string {
  const tocando = estado.tipo === 'tocando'
  const titulo = estado.tipo === 'vazio' ? 'Nada tocando por aqui' : estado.musica.nome
  const subtitulo = estado.tipo === 'vazio' ? '' : `${estado.musica.artistas} · ${estado.musica.album}`
  const selo = estado.tipo === 'tocando' ? 'TOCANDO AGORA' : estado.tipo === 'ultima' ? 'ÚLTIMA OUVIDA' : ''
  const rodape =
    estado.tipo === 'ultima' ? `${tempoDecorrido(estado.tocadaEm, agora)} no Spotify` : 'no Spotify'
  const rotulo =
    estado.tipo === 'vazio'
      ? 'Nada tocando no Spotify'
      : `${selo === 'TOCANDO AGORA' ? 'Tocando agora' : 'Última ouvida'}: ${estado.musica.nome} — ${estado.musica.artistas}`

  const linhaTitulo = linha('titulo', titulo, ajustarTexto(titulo, LARGURA_TEXTO, 20, 16), 72,
    `fill="#ffffff" font-weight="500" font-family="${FONTE}"`)
  const linhaSub = linha('sub', subtitulo, ajustarTexto(subtitulo, LARGURA_TEXTO, 13, 11), 95,
    `fill="#ffffff" fill-opacity=".75" font-family="${FONTE}"`)

  const centro =
    capa && estado.tipo !== 'vazio'
      ? `<image href="${capa}" x="53" y="50" width="50" height="50" clip-path="url(#recorte-capa)" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="78" cy="75" r="25" fill="#39d353"/>`

  const css =
    '@keyframes girar{to{transform:rotate(360deg)}}' +
    '@keyframes acender{0%,100%{opacity:.2}50%{opacity:1}}' +
    '.eq rect{opacity:.2}' +
    '.tocando .disco{animation:girar 4s linear infinite;transform-origin:78px 75px}' +
    '.tocando .eq rect{animation:acender 1.1s ease-in-out infinite}' +
    linhaTitulo.css +
    linhaSub.css

  const braco = `<g${tocando ? '' : ' transform="rotate(-38 156 20)"'}>` +
    '<circle cx="156" cy="20" r="7" fill="#d0d7de"/>' +
    '<path d="M 156 20 L 146 46 L 126 62" fill="none" stroke="#d0d7de" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="119" y="58" width="11" height="7" rx="1.5" fill="#ffffff" transform="rotate(-38 124 61)"/>' +
    '</g>'

  const logoSpotify =
    '<g transform="translate(240 122)"><circle cx="7" cy="7" r="7" fill="#ffffff"/>' +
    `<path d="M 3.2 5.3 Q 7.5 3.8 11 5.8 M 3.8 7.6 Q 7.3 6.6 10.2 8.1 M 4.3 9.7 Q 7 9 9.4 10.1" stroke="${FUNDO}" stroke-width="1.3" stroke-linecap="round" fill="none"/></g>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="150" viewBox="0 0 460 150" class="${estado.tipo}" role="img" aria-label="${escaparXml(rotulo)}">`,
    `<title>${escaparXml(rotulo)}</title>`,
    `<style>${css}</style>`,
    `<defs><clipPath id="recorte-capa"><circle cx="78" cy="75" r="25"/></clipPath>${linhaTitulo.defs}${linhaSub.defs}</defs>`,
    `<rect width="460" height="150" rx="10" fill="${FUNDO}"/>`,
    '<g class="disco">',
    '<circle cx="78" cy="75" r="60" fill="#010409"/>',
    '<circle cx="78" cy="75" r="54" fill="none" stroke="#21262d"/>',
    '<circle cx="78" cy="75" r="46" fill="none" stroke="#161b22"/>',
    '<circle cx="78" cy="75" r="38" fill="none" stroke="#21262d"/>',
    '<path d="M 38 40 A 54 54 0 0 1 70 22" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="3"/>',
    centro,
    '<circle cx="78" cy="75" r="25" fill="none" stroke="#39d353" stroke-width="1.5"/>',
    '<circle cx="78" cy="75" r="2.5" fill="#010409"/>',
    '</g>',
    braco,
    selo
      ? `<text x="${X_TEXTO}" y="44" font-size="11" letter-spacing="1.5" fill="#9be9a8" font-family="${FONTE}">${selo}</text>`
      : '',
    linhaTitulo.elemento,
    linhaSub.elemento,
    equalizador(),
    logoSpotify,
    `<text x="260" y="133" font-size="11" fill="#ffffff" fill-opacity=".8" font-family="${FONTE}">${escaparXml(rodape)}</text>`,
    '</svg>',
  ].join('')
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/render-svg.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Conferência visual rápida**

Run:
```bash
npx tsx -e "import {renderizarCard} from './src/render-svg.ts'; import {writeFileSync} from 'node:fs'; writeFileSync('/tmp/card.svg', renderizarCard({tipo:'tocando',musica:{nome:'Validation',artistas:'Artista',album:'Validation (Deluxe)',capaUrl:null,url:''}}, null, new Date()))"
```
Abrir `/tmp/card.svg` no navegador. Expected: card verde, disco girando, quadradinhos acendendo.

- [ ] **Step 6: Commit**

```bash
git add src/render-svg.ts tests/render-svg.test.ts
git commit -m "feat: renderização do card vinil em SVG"
```

---

### Task 5: Cliente do Spotify

**Files:**
- Create: `src/spotify.ts`
- Test: `tests/spotify.test.ts`

**Interfaces:**
- Consumes: `TocandoAgora`, `TocadasRecentes` de `src/tipos.ts`.
- Produces:
  - `type FetchFn = typeof fetch`
  - `interface Credenciais { clientId: string; clientSecret: string; refreshToken: string }`
  - `lerCredenciais(env: Record<string, string | undefined>): Credenciais` (lança erro se faltar alguma)
  - `obterAccessToken(cred: Credenciais, fetchFn?: FetchFn): Promise<string>`
  - `buscarTocandoAgora(token: string, fetchFn?: FetchFn): Promise<TocandoAgora | null>` (204 → `null`)
  - `buscarRecentes(token: string, fetchFn?: FetchFn): Promise<TocadasRecentes>`
  - `baixarCapaBase64(url: string, fetchFn?: FetchFn): Promise<string | null>` (nunca lança)

- [ ] **Step 1: Escrever os testes que falham**

`tests/spotify.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import {
  baixarCapaBase64,
  buscarRecentes,
  buscarTocandoAgora,
  lerCredenciais,
  obterAccessToken,
} from '../src/spotify.js'

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const cred = { clientId: 'id', clientSecret: 'segredo', refreshToken: 'rt' }

describe('lerCredenciais', () => {
  it('lê as três variáveis', () => {
    expect(
      lerCredenciais({ SPOTIFY_CLIENT_ID: 'a', SPOTIFY_CLIENT_SECRET: 'b', SPOTIFY_REFRESH_TOKEN: 'c' }),
    ).toEqual({ clientId: 'a', clientSecret: 'b', refreshToken: 'c' })
  })
  it('lança erro listando as ausentes', () => {
    expect(() => lerCredenciais({ SPOTIFY_CLIENT_ID: 'a' })).toThrow(
      /SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN/,
    )
  })
})

describe('obterAccessToken', () => {
  it('envia Basic auth e refresh_token e devolve o access_token', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { access_token: 'at' }))
    expect(await obterAccessToken(cred, fetchFn)).toBe('at')
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('https://accounts.spotify.com/api/token')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Basic ' + Buffer.from('id:segredo').toString('base64'))
    expect(String(init.body)).toBe('grant_type=refresh_token&refresh_token=rt')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
  it('lança erro quando o Spotify recusa (token revogado)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(400, { error: 'invalid_grant' }))
    await expect(obterAccessToken(cred, fetchFn)).rejects.toThrow(/400/)
  })
})

describe('buscarTocandoAgora', () => {
  it('204 → null', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    expect(await buscarTocandoAgora('at', fetchFn)).toBeNull()
  })
  it('200 → corpo JSON, com Bearer e timeout', async () => {
    const corpo = { is_playing: true, currently_playing_type: 'track', item: null }
    const fetchFn = vi.fn().mockResolvedValue(json(200, corpo))
    expect(await buscarTocandoAgora('at', fetchFn)).toEqual(corpo)
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('https://api.spotify.com/v1/me/player/currently-playing')
    expect(init.headers.Authorization).toBe('Bearer at')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
  it('401 → lança erro', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, {}))
    await expect(buscarTocandoAgora('at', fetchFn)).rejects.toThrow(/401/)
  })
})

describe('buscarRecentes', () => {
  it('pede só a última faixa', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { items: [] }))
    expect(await buscarRecentes('at', fetchFn)).toEqual({ items: [] })
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.spotify.com/v1/me/player/recently-played?limit=1')
  })
})

describe('baixarCapaBase64', () => {
  it('devolve data URI com o content-type da resposta', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }),
    )
    expect(await baixarCapaBase64('https://i.scdn.co/300', fetchFn)).toBe('data:image/png;base64,AQID')
  })
  it('content-type estranho vira image/jpeg', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'text/html"><script>' } }),
    )
    expect(await baixarCapaBase64('u', fetchFn)).toBe('data:image/jpeg;base64,AQID')
  })
  it('falha de rede → null', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('rede'))
    expect(await baixarCapaBase64('u', fetchFn)).toBeNull()
  })
  it('status de erro → null', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('x', { status: 404 }))
    expect(await baixarCapaBase64('u', fetchFn)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/spotify.test.ts`
Expected: FAIL — não encontra `../src/spotify.js`.

- [ ] **Step 3: Implementar**

`src/spotify.ts`:
```ts
import type { TocadasRecentes, TocandoAgora } from './tipos.js'

export type FetchFn = typeof fetch

export interface Credenciais {
  clientId: string
  clientSecret: string
  refreshToken: string
}

const TIMEOUT_MS = 2500
const API = 'https://api.spotify.com/v1/me/player'
const CONTENT_TYPE_IMAGEM = /^image\/[a-z0-9.+-]+$/

export function lerCredenciais(env: Record<string, string | undefined>): Credenciais {
  const nomes = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'] as const
  const ausentes = nomes.filter((n) => !env[n])
  if (ausentes.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${ausentes.join(', ')}`)
  }
  return {
    clientId: env.SPOTIFY_CLIENT_ID!,
    clientSecret: env.SPOTIFY_CLIENT_SECRET!,
    refreshToken: env.SPOTIFY_REFRESH_TOKEN!,
  }
}

export async function obterAccessToken(cred: Credenciais, fetchFn: FetchFn = fetch): Promise<string> {
  const resposta = await fetchFn('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cred.clientId}:${cred.clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: cred.refreshToken }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resposta.ok) throw new Error(`Spotify recusou o refresh token: HTTP ${resposta.status}`)
  const dados = (await resposta.json()) as { access_token: string }
  return dados.access_token
}

async function getApi(caminho: string, token: string, fetchFn: FetchFn): Promise<Response> {
  const resposta = await fetchFn(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resposta.ok) throw new Error(`Spotify ${caminho}: HTTP ${resposta.status}`)
  return resposta
}

export async function buscarTocandoAgora(token: string, fetchFn: FetchFn = fetch): Promise<TocandoAgora | null> {
  const resposta = await getApi('/currently-playing', token, fetchFn)
  if (resposta.status === 204) return null
  return (await resposta.json()) as TocandoAgora
}

export async function buscarRecentes(token: string, fetchFn: FetchFn = fetch): Promise<TocadasRecentes> {
  const resposta = await getApi('/recently-played?limit=1', token, fetchFn)
  return (await resposta.json()) as TocadasRecentes
}

export async function baixarCapaBase64(url: string, fetchFn: FetchFn = fetch): Promise<string | null> {
  try {
    const resposta = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!resposta.ok) return null
    const tipoBruto = (resposta.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase()
    const tipo = CONTENT_TYPE_IMAGEM.test(tipoBruto) ? tipoBruto : 'image/jpeg'
    const bytes = Buffer.from(await resposta.arrayBuffer())
    return `data:${tipo};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/spotify.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/spotify.ts tests/spotify.test.ts
git commit -m "feat: cliente do Spotify com timeout e fetch injetável"
```

---

### Task 6: Orquestração, mocks e endpoints

**Files:**
- Create: `src/mocks.ts`, `src/gerar-card.ts`, `api/now-playing.ts`, `api/open.ts`
- Test: `tests/gerar-card.test.ts`, `tests/api.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1–5.
- Produces:
  - `estadoMock(nome: string, agora: Date): Estado | null` — nomes: `tocando`, `ultima`, `vazio`, `longo`
  - `interface Dependencias { env: Record<string, string | undefined>; fetchFn: FetchFn; agora: () => Date; log: (mensagem: string, erro: unknown) => void }`
  - `dependenciasPadrao(): Dependencias`
  - `obterEstado(deps: Dependencias): Promise<Estado>` (nunca lança)
  - `gerarCard(deps: Dependencias): Promise<string>` (nunca lança)
  - `urlDestino(estado: Estado): string`
  - `CABECALHOS_SEM_CACHE: Record<string, string>`
  - `api/now-playing.ts`: `GET(request: Request): Promise<Response>`
  - `api/open.ts`: `GET(request: Request): Promise<Response>`

- [ ] **Step 1: Escrever os testes que falham**

`tests/gerar-card.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { gerarCard, obterEstado, urlDestino, type Dependencias } from '../src/gerar-card.js'

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const faixa = (nome: string, imagens = [{ url: 'https://i.scdn.co/300', width: 300, height: 300 }]) => ({
  type: 'track',
  name: nome,
  artists: [{ name: 'Artista' }],
  album: { name: 'Álbum', images: imagens },
  external_urls: { spotify: `https://open.spotify.com/track/${nome}` },
})

const ENV = { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 's', SPOTIFY_REFRESH_TOKEN: 'rt' }

interface Rotas {
  token?: () => Response | Promise<Response>
  atual?: () => Response | Promise<Response>
  recentes?: () => Response | Promise<Response>
  capa?: () => Response | Promise<Response>
}

function criarDeps(rotas: Rotas, env: Record<string, string | undefined> = ENV) {
  const log = vi.fn()
  const fetchFn = vi.fn(async (url: string | URL | Request) => {
    const u = String(url)
    if (u.includes('/api/token')) return (rotas.token ?? (() => json(200, { access_token: 'at' })))()
    if (u.includes('currently-playing')) return (rotas.atual ?? (() => new Response(null, { status: 204 })))()
    if (u.includes('recently-played')) return (rotas.recentes ?? (() => json(200, { items: [] })))()
    if (u.includes('i.scdn.co')) {
      return (rotas.capa ?? (() => new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'image/jpeg' } })))()
    }
    throw new Error(`rota inesperada ${u}`)
  }) as unknown as typeof fetch
  const deps: Dependencias = { env, fetchFn, agora: () => new Date('2026-11-22T12:00:00Z'), log }
  return { deps, log }
}

describe('obterEstado', () => {
  it('tocando', async () => {
    const { deps } = criarDeps({ atual: () => json(200, { is_playing: true, currently_playing_type: 'track', item: faixa('Atual') }) })
    expect(await obterEstado(deps)).toMatchObject({ tipo: 'tocando', musica: { nome: 'Atual' } })
  })
  it('variáveis de ambiente ausentes → vazio e log', async () => {
    const { deps, log } = criarDeps({}, {})
    expect(await obterEstado(deps)).toEqual({ tipo: 'vazio' })
    expect(log).toHaveBeenCalled()
  })
  it('refresh token revogado (400) → vazio e log', async () => {
    const { deps, log } = criarDeps({ token: () => json(400, { error: 'invalid_grant' }) })
    expect(await obterEstado(deps)).toEqual({ tipo: 'vazio' })
    expect(log).toHaveBeenCalled()
  })
  it('"tocando agora" estoura o tempo mas o histórico responde → última', async () => {
    const { deps, log } = criarDeps({
      atual: () => Promise.reject(new DOMException('timeout', 'TimeoutError')),
      recentes: () => json(200, { items: [{ track: faixa('Anterior'), played_at: '2026-11-22T11:00:00Z' }] }),
    })
    expect(await obterEstado(deps)).toMatchObject({ tipo: 'ultima', musica: { nome: 'Anterior' } })
    expect(log).toHaveBeenCalled()
  })
  it('histórico falha mas há música tocando → tocando', async () => {
    const { deps } = criarDeps({
      atual: () => json(200, { is_playing: true, currently_playing_type: 'track', item: faixa('Atual') }),
      recentes: () => json(500, {}),
    })
    expect(await obterEstado(deps)).toMatchObject({ tipo: 'tocando' })
  })
})

describe('gerarCard', () => {
  it('embute a capa baixada', async () => {
    const { deps } = criarDeps({ atual: () => json(200, { is_playing: true, currently_playing_type: 'track', item: faixa('Atual') }) })
    expect(await gerarCard(deps)).toContain('href="data:image/jpeg;base64,AQ=="')
  })
  it('falha ao baixar a capa → card sem <image>', async () => {
    const { deps } = criarDeps({
      atual: () => json(200, { is_playing: true, currently_playing_type: 'track', item: faixa('Atual') }),
      capa: () => Promise.reject(new Error('rede')),
    })
    const svg = await gerarCard(deps)
    expect(svg).toContain('Atual')
    expect(svg).not.toContain('<image')
  })
  it('faixa sem capa (arquivo local) não tenta baixar', async () => {
    const { deps } = criarDeps({ atual: () => json(200, { is_playing: true, currently_playing_type: 'track', item: faixa('Local', []) }) })
    const svg = await gerarCard(deps)
    expect(svg).not.toContain('<image')
    expect(deps.fetchFn).not.toHaveBeenCalledWith(expect.stringContaining('i.scdn.co'), expect.anything())
  })
})

describe('urlDestino', () => {
  it('música → link da faixa', () => {
    expect(
      urlDestino({ tipo: 'tocando', musica: { nome: 'a', artistas: 'b', album: 'c', capaUrl: null, url: 'https://open.spotify.com/track/1' } }),
    ).toBe('https://open.spotify.com/track/1')
  })
  it('vazio → página inicial do Spotify', () => {
    expect(urlDestino({ tipo: 'vazio' })).toBe('https://open.spotify.com/')
  })
})
```

`tests/api.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { GET as nowPlaying } from '../api/now-playing.js'

describe('GET /api/now-playing?mock=', () => {
  it.each(['tocando', 'ultima', 'vazio', 'longo'])('mock %s responde SVG 200 sem cache', async (mock) => {
    const resposta = await nowPlaying(new Request(`https://x.vercel.app/api/now-playing?mock=${mock}`))
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
    expect(resposta.headers.get('Cache-Control')).toBe('no-cache, no-store, max-age=0')
    expect(await resposta.text()).toMatch(/^<svg /)
  })
  it('mock longo usa rolagem', async () => {
    const resposta = await nowPlaying(new Request('https://x.vercel.app/api/now-playing?mock=longo'))
    expect(await resposta.text()).toContain('@keyframes rolar-titulo')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/gerar-card.test.ts tests/api.test.ts`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar**

`src/mocks.ts`:
```ts
import type { Estado, Musica } from './tipos.js'

const base: Musica = {
  nome: 'Validation',
  artistas: 'Artista',
  album: 'Validation (Deluxe)',
  capaUrl: null,
  url: 'https://open.spotify.com/',
}

export function estadoMock(nome: string, agora: Date): Estado | null {
  switch (nome) {
    case 'tocando':
      return { tipo: 'tocando', musica: base }
    case 'ultima':
      return { tipo: 'ultima', musica: base, tocadaEm: new Date(agora.getTime() - 12 * 60_000) }
    case 'vazio':
      return { tipo: 'vazio' }
    case 'longo':
      return {
        tipo: 'tocando',
        musica: {
          ...base,
          nome: 'Um nome de música absurdamente longo (feat. Outro Artista) - Remastered Deluxe Version',
          artistas: 'Artista Um, Artista Dois, Artista Três, Artista Quatro',
        },
      }
    default:
      return null
  }
}
```

`src/gerar-card.ts`:
```ts
import { escolherEstado } from './escolher-estado.js'
import { renderizarCard } from './render-svg.js'
import {
  baixarCapaBase64,
  buscarRecentes,
  buscarTocandoAgora,
  lerCredenciais,
  obterAccessToken,
  type FetchFn,
} from './spotify.js'
import type { Estado } from './tipos.js'

export interface Dependencias {
  env: Record<string, string | undefined>
  fetchFn: FetchFn
  agora: () => Date
  log: (mensagem: string, erro: unknown) => void
}

export const CABECALHOS_SEM_CACHE: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, max-age=0',
}

export function dependenciasPadrao(): Dependencias {
  return {
    env: process.env,
    fetchFn: fetch,
    agora: () => new Date(),
    log: (mensagem, erro) => console.error(mensagem, erro),
  }
}

export async function obterEstado(deps: Dependencias): Promise<Estado> {
  let token: string
  try {
    token = await obterAccessToken(lerCredenciais(deps.env), deps.fetchFn)
  } catch (erro) {
    deps.log('Falha ao obter o token do Spotify', erro)
    return { tipo: 'vazio' }
  }
  const [atual, recentes] = await Promise.all([
    buscarTocandoAgora(token, deps.fetchFn).catch((erro) => {
      deps.log('Falha em currently-playing', erro)
      return null
    }),
    buscarRecentes(token, deps.fetchFn).catch((erro) => {
      deps.log('Falha em recently-played', erro)
      return null
    }),
  ])
  return escolherEstado(atual, recentes)
}

export async function gerarCard(deps: Dependencias): Promise<string> {
  const estado = await obterEstado(deps)
  const capaUrl = estado.tipo === 'vazio' ? null : estado.musica.capaUrl
  const capa = capaUrl ? await baixarCapaBase64(capaUrl, deps.fetchFn) : null
  return renderizarCard(estado, capa, deps.agora())
}

export function urlDestino(estado: Estado): string {
  return estado.tipo === 'vazio' ? 'https://open.spotify.com/' : estado.musica.url
}
```

`api/now-playing.ts`:
```ts
import { CABECALHOS_SEM_CACHE, dependenciasPadrao, gerarCard } from '../src/gerar-card.js'
import { estadoMock } from '../src/mocks.js'
import { renderizarCard } from '../src/render-svg.js'

export async function GET(request: Request): Promise<Response> {
  const agora = new Date()
  const mock = new URL(request.url).searchParams.get('mock')
  const estado = mock ? estadoMock(mock, agora) : null
  const svg = estado ? renderizarCard(estado, null, agora) : await gerarCard(dependenciasPadrao())
  return new Response(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', ...CABECALHOS_SEM_CACHE },
  })
}
```

`api/open.ts`:
```ts
import { CABECALHOS_SEM_CACHE, dependenciasPadrao, obterEstado, urlDestino } from '../src/gerar-card.js'

export async function GET(_request: Request): Promise<Response> {
  const estado = await obterEstado(dependenciasPadrao())
  return new Response(null, {
    status: 302,
    headers: { Location: urlDestino(estado), ...CABECALHOS_SEM_CACHE },
  })
}
```

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run typecheck`
Expected: PASS em todos os arquivos de teste; typecheck sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/mocks.ts src/gerar-card.ts api tests/gerar-card.test.ts tests/api.test.ts
git commit -m "feat: endpoints now-playing e open com fallback seguro e mocks"
```

---

### Task 7: Script do refresh token, README e deploy

**Files:**
- Create: `scripts/get-refresh-token.ts`, `README.md`

**Interfaces:**
- Consumes: variáveis `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET` do `.env`.
- Produces: imprime `SPOTIFY_REFRESH_TOKEN=...` no terminal.

- [ ] **Step 1: Criar o script**

`scripts/get-refresh-token.ts`:
```ts
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'

const PORTA = 8888
const REDIRECT_URI = `http://127.0.0.1:${PORTA}/callback`
const ESCOPOS = 'user-read-currently-playing user-read-recently-played'

const clientId = process.env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no arquivo .env')
  process.exit(1)
}

const state = randomBytes(16).toString('hex')
const urlLogin = new URL('https://accounts.spotify.com/authorize')
urlLogin.search = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  scope: ESCOPOS,
  redirect_uri: REDIRECT_URI,
  state,
}).toString()

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT_URI)
  if (url.pathname !== '/callback') {
    res.writeHead(404).end()
    return
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('state inválido')
    return
  }
  const code = url.searchParams.get('code')
  if (!code) {
    res.writeHead(400).end(`Autorização negada: ${url.searchParams.get('error')}`)
    return
  }
  const resposta = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
  })
  const dados = (await resposta.json()) as { refresh_token?: string }
  if (!resposta.ok || !dados.refresh_token) {
    res.writeHead(500).end('Falha ao trocar o código. Veja o terminal.')
    console.error(dados)
    process.exitCode = 1
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Pronto! Pode fechar esta aba.')
    console.log(`\nSPOTIFY_REFRESH_TOKEN=${dados.refresh_token}\n`)
    console.log('Copie a linha acima para o .env e para as Environment Variables da Vercel.')
  }
  servidor.close()
})

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Abra no navegador e autorize:\n\n${urlLogin}\n`)
})
```

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 2: Criar o README do projeto**

`README.md`:
````markdown
# spotify-github-card

Card animado (vinil) com a música que estou ouvindo no Spotify, para o README do perfil do GitHub.

## Configuração (uma vez)

1. Em https://developer.spotify.com/dashboard crie um app (precisa de Spotify Premium).
   - Redirect URI: `http://127.0.0.1:8888/callback`
   - API: Web API
2. Copie `.env.example` para `.env` e preencha `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET`.
3. `npm install` e `npm run token`. Abra o link, autorize, e copie o `SPOTIFY_REFRESH_TOKEN` para o `.env`.

## Desenvolvimento

- `npm test` — testes
- `npx vercel dev` — servidor local em http://localhost:3000
  - `/api/now-playing?mock=tocando|ultima|vazio|longo` — prévias sem Spotify
  - `/api/now-playing` — card real (usa o `.env`)

## Deploy

1. `npx vercel` (primeira vez: cria o projeto) e `npx vercel --prod`.
2. Em Settings → Environment Variables da Vercel, cadastre as três variáveis `SPOTIFY_*` e faça `npx vercel --prod` de novo.

## No perfil do GitHub

No repositório `<seu-usuario>/<seu-usuario>`, o `README.md` contém só:

```html
<a href="https://<app>.vercel.app/api/open">
  <img src="https://<app>.vercel.app/api/now-playing" width="440" alt="Música que estou ouvindo no Spotify">
</a>
```
````

- [ ] **Step 3: Commit**

```bash
git add scripts/get-refresh-token.ts README.md
git commit -m "feat: script do refresh token e README de configuração"
```

- [ ] **Step 4: Configuração real (com o usuário)**

O usuário cria o app no Spotify Dashboard, preenche `.env` e roda `npm run token`.
Expected: terminal imprime `SPOTIFY_REFRESH_TOKEN=...`.

- [ ] **Step 5: Prévia local**

Run: `npx vercel dev` e abrir `http://localhost:3000/api/now-playing?mock=tocando`, `?mock=ultima`, `?mock=vazio`, `?mock=longo` e `http://localhost:3000/api/now-playing`.
Expected: os quatro mocks renderizam corretamente; a rota sem mock mostra a música real (tocar algo no Spotify) e, pausando, muda para "ÚLTIMA OUVIDA" ao recarregar.

- [ ] **Step 6: Deploy e teste no perfil**

Run: `npx vercel --prod` (após cadastrar as variáveis na Vercel).
Expected: `https://<app>.vercel.app/api/now-playing` mostra o card. Atualizar o README do perfil com o snippet e conferir no GitHub; recarregar a página do perfil após trocar de música mostra a nova música.
