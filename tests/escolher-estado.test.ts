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
  it('pausada e histórico indisponível → a própria faixa pausada, sem horário', () => {
    expect(escolherEstado(tocando('Pausada', false), null)).toEqual({
      tipo: 'ultima',
      musica: expect.objectContaining({ nome: 'Pausada' }),
      tocadaEm: null,
    })
  })
  it('pausada e histórico vazio → a própria faixa pausada', () => {
    expect(escolherEstado(tocando('Pausada', false), { items: [] })).toMatchObject({
      tipo: 'ultima',
      musica: { nome: 'Pausada' },
    })
  })
  it('tocando mesmo com histórico indisponível → tocando', () => {
    expect(escolherEstado(tocando('Atual'), null)).toMatchObject({ tipo: 'tocando' })
  })
})
