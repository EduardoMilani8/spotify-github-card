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
