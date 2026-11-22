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
