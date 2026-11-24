import { describe, expect, it, vi } from 'vitest'
import { CABECALHOS_VITRINE, gerarVitrine } from '../../src/vitrine/gerar-vitrine.js'

const ID = '37i9dQZF1DXcBWIGoYBM5M'
const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
const faixa = (id: string) => ({
  item: {
    type: 'track',
    is_local: false,
    album: { id, name: `Album ${id}`, artists: [{ name: 'Artist' }], images: [{ url: `https://i.scdn.co/${id}`, width: 300, height: 300 }] },
  },
})
const ENV = {
  SPOTIFY_CLIENT_ID: 'id',
  SPOTIFY_CLIENT_SECRET: 's',
  SPOTIFY_REFRESH_TOKEN: 'rt',
  SPOTIFY_SHOWCASE_PLAYLIST: `https://open.spotify.com/playlist/${ID}?si=x`,
}

interface Rotas {
  token?: () => Response
  playlist?: () => Response
  capa?: () => Response
}

function criarDeps(rotas: Rotas = {}, env: Record<string, string | undefined> = ENV) {
  const log = vi.fn()
  const fetchFn = vi.fn(async (url: string | URL | Request) => {
    const u = String(url)
    if (u.includes('/api/token')) return (rotas.token ?? (() => json(200, { access_token: 'at' })))()
    if (u.includes('/playlists/')) return (rotas.playlist ?? (() => json(200, { items: ['a', 'b', 'c'].map(faixa) })))()
    if (u.includes('i.scdn.co'))
      return (rotas.capa ?? (() => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } })))()
    throw new Error(`rota inesperada: ${u}`)
  })
  return { deps: { env, fetchFn: fetchFn as typeof fetch, agora: () => new Date('2026-11-24T12:00:00Z'), log }, log, fetchFn }
}

describe('gerarVitrine', () => {
  it('caminho feliz: carrossel com 3 capas embutidas', async () => {
    const { deps, log } = criarDeps()
    const svg = await gerarVitrine(deps)
    expect(svg).toContain('class="carrossel"')
    expect(svg).toContain('Album a')
    expect(svg.split('data:image/jpeg;base64,').length - 1).toBe(3)
    expect(log).not.toHaveBeenCalled()
  })

  it('sem SPOTIFY_SHOWCASE_PLAYLIST: vazio, log, nenhuma chamada', async () => {
    const { deps, log, fetchFn } = criarDeps({}, { ...ENV, SPOTIFY_SHOWCASE_PLAYLIST: undefined })
    expect(await gerarVitrine(deps)).toContain('class="vazio"')
    expect(log).toHaveBeenCalled()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('token recusado: vazio e log', async () => {
    const { deps, log } = criarDeps({ token: () => json(400, { error: 'invalid_grant' }) })
    expect(await gerarVitrine(deps)).toContain('class="vazio"')
    expect(log).toHaveBeenCalled()
  })

  it('playlist com 403: vazio e log', async () => {
    const { deps, log } = criarDeps({ playlist: () => json(403, { error: { status: 403 } }) })
    expect(await gerarVitrine(deps)).toContain('class="vazio"')
    expect(log).toHaveBeenCalled()
  })

  it.each([
    ['sem items', { nada: 1 }],
    ['items não é lista', { items: 'x' }],
    ['entradas malformadas', { items: [{ item: { type: 'track', album: 'x' } }, {}] }],
  ])('formato inesperado (%s): vazio, sem erro', async (_, corpo) => {
    const { deps } = criarDeps({ playlist: () => json(200, corpo) })
    expect(await gerarVitrine(deps)).toContain('class="vazio"')
  })

  it('capa que falha: carrossel continua, com fallback', async () => {
    const { deps } = criarDeps({ capa: () => new Response(null, { status: 500 }) })
    const svg = await gerarVitrine(deps)
    expect(svg).toContain('class="carrossel"')
    expect(svg).not.toContain('<image')
  })
})

describe('CABECALHOS_VITRINE', () => {
  it('sem cache no GitHub, 1h na CDN da Vercel', () => {
    expect(CABECALHOS_VITRINE).toEqual({
      'Cache-Control': 'no-cache, no-store, max-age=0',
      'CDN-Cache-Control': 'max-age=3600, stale-while-revalidate=86400',
    })
  })
})
