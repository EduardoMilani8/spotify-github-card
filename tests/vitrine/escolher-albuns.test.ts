import { describe, expect, it } from 'vitest'
import { escolherAlbuns } from '../../src/vitrine/escolher-albuns.js'
import type { AlbumSpotify, ItemPlaylist } from '../../src/vitrine/tipos.js'

const album = (id: string | null, images = [{ url: `https://i.scdn.co/${id}`, width: 300, height: 300 }]): AlbumSpotify => ({
  id,
  name: `Álbum ${id}`,
  artists: [{ name: 'A' }, { name: 'B' }],
  images,
})
const faixa = (a: AlbumSpotify): ItemPlaylist => ({ item: { type: 'track', is_local: false, album: a } })
const ids = (itens: ItemPlaylist[]) => escolherAlbuns(itens).map((a) => a.id)

describe('escolherAlbuns', () => {
  it('converte a faixa no álbum dela', () => {
    expect(escolherAlbuns([faixa(album('a'))])).toEqual([
      { id: 'a', nome: 'Álbum a', artistas: 'A, B', capaUrl: 'https://i.scdn.co/a' },
    ])
  })
  it('mantém a ordem da playlist e para em 3', () => {
    expect(ids(['a', 'b', 'c', 'd'].map((i) => faixa(album(i))))).toEqual(['a', 'b', 'c'])
  })
  it('álbum repetido conta uma vez, e o seguinte entra no lugar', () => {
    expect(ids(['a', 'a', 'b', 'c', 'd'].map((i) => faixa(album(i))))).toEqual(['a', 'b', 'c'])
  })
  it('ignora item nulo, podcast, arquivo local e álbum sem id', () => {
    const itens: ItemPlaylist[] = [
      { item: null },
      { item: { type: 'episode' } },
      { item: { type: 'track', is_local: true, album: album('x') } },
      faixa(album(null)),
      faixa(album('a')),
    ]
    expect(ids(itens)).toEqual(['a'])
  })
  it('álbum sem imagens → capaUrl null', () => {
    expect(escolherAlbuns([faixa(album('a', []))])[0].capaUrl).toBeNull()
  })
  it('playlist vazia → []', () => {
    expect(escolherAlbuns([])).toEqual([])
  })
})
