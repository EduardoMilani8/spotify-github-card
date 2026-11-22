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
