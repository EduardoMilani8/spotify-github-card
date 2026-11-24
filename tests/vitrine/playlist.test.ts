import { describe, expect, it, vi } from 'vitest'
import { buscarItensPlaylist, lerIdPlaylist } from '../../src/vitrine/playlist.js'

const ID = '37i9dQZF1DXcBWIGoYBM5M'
const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

describe('lerIdPlaylist', () => {
  it.each([
    [`https://open.spotify.com/playlist/${ID}?si=abc123`, ID],
    [`https://open.spotify.com/playlist/${ID}`, ID],
    [ID, ID],
    [`spotify:playlist:${ID}`, ID],
    [`  ${ID}  `, ID],
  ])('%s → id', (valor, esperado) => {
    expect(lerIdPlaylist(valor)).toBe(esperado)
  })

  it.each([undefined, null, '', 'abc', `https://open.spotify.com/album/${ID}`])('%s → null', (valor) => {
    expect(lerIdPlaylist(valor)).toBeNull()
  })
})

describe('buscarItensPlaylist', () => {
  it('pede só os campos necessários, com limite 20', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { items: [] }))
    expect(await buscarItensPlaylist('at', ID, fetchFn)).toEqual({ items: [] })
    const [url, init] = fetchFn.mock.calls[0]
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe(`https://api.spotify.com/v1/playlists/${ID}/items`)
    expect(u.searchParams.get('limit')).toBe('20')
    expect(u.searchParams.get('fields')).toBe('items(item(type,is_local,album(id,name,artists(name),images)))')
    expect(init.headers.Authorization).toBe('Bearer at')
  })

  it('lança erro em HTTP de falha (ex.: 403 sem escopo)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(403, { error: { status: 403 } }))
    await expect(buscarItensPlaylist('at', ID, fetchFn)).rejects.toThrow(/HTTP 403/)
  })
})
