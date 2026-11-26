import { readFileSync } from 'node:fs'
import { XMLValidator } from 'fast-xml-parser'
import { describe, expect, it, vi } from 'vitest'
import { criarMemo, gerarPainel } from '../../src/painel/gerar-painel.js'

const RSS = readFileSync(new URL('../fixtures/letterboxd.xml', import.meta.url), 'utf8')
const ID = '37i9dQZF1DXcBWIGoYBM5M'
const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
const imagem = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } })
const faixa = { type: 'track', name: 'Musica Real', artists: [{ name: 'Artista Real' }], album: { name: 'A', images: [{ url: 'https://i.scdn.co/capa', width: 300, height: 300 }] }, external_urls: {} }
const album = (id: string) => ({
  item: { type: 'track', is_local: false, album: { id, name: `Album ${id}`, artists: [{ name: 'X' }], images: [{ url: `https://i.scdn.co/${id}`, width: 300, height: 300 }] } },
})
const ENV = {
  SPOTIFY_CLIENT_ID: 'id',
  SPOTIFY_CLIENT_SECRET: 's',
  SPOTIFY_REFRESH_TOKEN: 'rt',
  SPOTIFY_SHOWCASE_PLAYLIST: ID,
  LETTERBOXD_USER: 'gozousado',
}

interface Rotas {
  spotify?: () => Response
  rss?: () => Response
}

function criarDeps(rotas: Rotas = {}, env: Record<string, string | undefined> = ENV) {
  let agora = new Date('2026-11-25T12:00:00Z')
  const fetchFn = vi.fn(async (url: string | URL | Request) => {
    const u = String(url)
    if (u.includes('accounts.spotify.com') || u.includes('api.spotify.com')) {
      if (rotas.spotify) return rotas.spotify()
      if (u.includes('/api/token')) return json(200, { access_token: 'at' })
      if (u.includes('currently-playing')) return json(200, { is_playing: true, currently_playing_type: 'track', item: faixa })
      if (u.includes('recently-played')) return json(200, { items: [] })
      if (u.includes('/playlists/')) return json(200, { items: ['a', 'b', 'c'].map(album) })
    }
    if (u.includes('letterboxd.com')) return (rotas.rss ?? (() => new Response(RSS)))()
    if (u.includes('i.scdn.co') || u.includes('ltrbxd.com')) return imagem()
    throw new Error(`rota inesperada: ${u}`)
  })
  const deps = {
    env,
    fetchFn: fetchFn as typeof fetch,
    agora: () => agora,
    log: vi.fn(),
  }
  const chamadas = (trecho: string) => fetchFn.mock.calls.filter(([u]) => String(u).includes(trecho)).length
  const avancar = (ms: number) => {
    agora = new Date(agora.getTime() + ms)
  }
  return { deps, chamadas, avancar }
}

describe('gerarPainel', () => {
  it('caminho feliz: música, álbuns, review e top 4', async () => {
    const { deps } = criarDeps()
    const svg = await gerarPainel(deps, criarMemo())
    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toContain('class="tocando"')
    expect(svg).toContain('Musica Real')
    expect(svg).toContain('Album a')
    expect(svg).toContain('>Aftersun<')
    expect(svg).toContain('Rocky')
    expect(svg).toContain('data:image/jpeg;base64,AQID')
  })

  it('Letterboxd fora: música intacta, review vazia', async () => {
    const { deps } = criarDeps({ rss: () => new Response('x', { status: 500 }) })
    const svg = await gerarPainel(deps, criarMemo())
    expect(svg).toContain('Musica Real')
    expect(svg).toContain('nenhuma review por aqui ainda')
    expect(deps.log).toHaveBeenCalled()
  })

  it('Spotify fora: review e top 4 intactos', async () => {
    const { deps } = criarDeps({ spotify: () => json(500, {}) })
    const svg = await gerarPainel(deps, criarMemo())
    expect(svg).toContain('class="vazio"')
    expect(svg).toContain('vitrine em breve')
    expect(svg).toContain('>Aftersun<')
    expect(svg).toContain('Rocky')
  })

  it('sem LETTERBOXD_USER: review vazia e log', async () => {
    const { deps } = criarDeps({}, { ...ENV, LETTERBOXD_USER: undefined })
    const svg = await gerarPainel(deps, criarMemo())
    expect(svg).toContain('nenhuma review por aqui ainda')
    expect(deps.log).toHaveBeenCalled()
  })

  it('memo: reaproveita por 1h; tocando agora é buscado sempre', async () => {
    const { deps, chamadas, avancar } = criarDeps()
    const memo = criarMemo()
    await gerarPainel(deps, memo)
    avancar(59 * 60_000)
    await gerarPainel(deps, memo)
    expect(chamadas('letterboxd.com')).toBe(1)
    expect(chamadas('/playlists/')).toBe(1)
    expect(chamadas('currently-playing')).toBe(2)
    avancar(2 * 60_000)
    await gerarPainel(deps, memo)
    expect(chamadas('letterboxd.com')).toBe(2)
  })

  it('memo: depois de erro, tenta de novo em 60s', async () => {
    let falhar = true
    const { deps, chamadas, avancar } = criarDeps({ rss: () => (falhar ? new Response('x', { status: 503 }) : new Response(RSS)) })
    const memo = criarMemo()
    await gerarPainel(deps, memo)
    avancar(30_000)
    await gerarPainel(deps, memo)
    expect(chamadas('letterboxd.com')).toBe(1)
    falhar = false
    avancar(31_000)
    const svg = await gerarPainel(deps, memo)
    expect(chamadas('letterboxd.com')).toBe(2)
    expect(svg).toContain('>Aftersun<')
  })

  it('memo: falha passageira de uma parte mantém o valor bom anterior dessa parte', async () => {
    let falhar = false
    const { deps, avancar } = criarDeps({ rss: () => (falhar ? new Response('x', { status: 503 }) : new Response(RSS)) })
    const memo = criarMemo()
    await gerarPainel(deps, memo)
    falhar = true
    avancar(61 * 60_000)
    const svg = await gerarPainel(deps, memo)
    expect(svg).toContain('>Aftersun<')
    expect(svg).toContain('Album a')
    expect(memo.expiraEm - deps.agora().getTime()).toBe(60_000)
  })

  it('resposta 200 que não é RSS (página de desafio) conta como erro: memo de 60s', async () => {
    const { deps } = criarDeps({ rss: () => new Response('<!DOCTYPE html><html><body>Just a moment...</body></html>') })
    const memo = criarMemo()
    await gerarPainel(deps, memo)
    expect(memo.expiraEm - deps.agora().getTime()).toBe(60_000)
    expect(deps.log).toHaveBeenCalled()
  })

  it('a capa da música começa a baixar sem esperar os dados lentos', async () => {
    const { deps } = criarDeps()
    let soltarPlaylist: () => void = () => {}
    const playlistPresa = new Promise<void>((r) => (soltarPlaylist = r))
    const original = deps.fetchFn
    const pedidos: string[] = []
    deps.fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url)
      pedidos.push(u)
      if (u.includes('/playlists/')) await playlistPresa
      return original(url, init)
    }) as typeof fetch
    const painel = gerarPainel(deps, criarMemo())
    await vi.waitFor(() => expect(pedidos.some((u) => u.includes('i.scdn.co/capa'))).toBe(true))
    soltarPlaylist()
    await painel
  })

  it('parte filmes não consulta o Spotify do tocando agora', async () => {
    const { deps, chamadas } = criarDeps()
    const svg = await gerarPainel(deps, criarMemo(), 'filmes')
    expect(svg).toContain('>Aftersun<')
    expect(chamadas('currently-playing')).toBe(0)
  })
})
