import { escolherImagemCapa } from '../musica.js'
import type { Album, AlbumSpotify, ItemPlaylist } from './tipos.js'

export const MAX_ALBUNS = 3

export function paraAlbum(album: AlbumSpotify & { id: string }): Album {
  return {
    id: album.id,
    nome: album.name,
    artistas: album.artists.map((a) => a.name).join(', '),
    capaUrl: escolherImagemCapa(album.images),
  }
}

/**
 * Percorre a playlist em ordem e devolve até MAX_ALBUNS álbuns distintos.
 * - Ignora item nulo, item que não é 'track', arquivo local (is_local) e álbum sem id.
 * - Mesmo album.id duas vezes: vale o primeiro.
 * Use paraAlbum(album) para converter.
 */
export function escolherAlbuns(itens: ItemPlaylist[]): Album[] {
  const albuns: Album[] = []
  const vistos = new Set<string>()
  for (const { item } of itens) {
    const album = item?.album
    if (item?.type !== 'track' || item.is_local || !album?.id || vistos.has(album.id)) continue
    vistos.add(album.id)
    albuns.push(paraAlbum({ ...album, id: album.id }))
    if (albuns.length === MAX_ALBUNS) break
  }
  return albuns
}
