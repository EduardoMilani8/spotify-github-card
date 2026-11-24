import type { SpotifyImagem } from '../tipos.js'

export interface AlbumSpotify {
  id: string | null
  name: string
  artists: { name: string }[]
  images: SpotifyImagem[]
}

export interface ItemPlaylist {
  item: { type: string; is_local?: boolean; album?: AlbumSpotify } | null
}

export interface ItensPlaylist {
  items: ItemPlaylist[]
}

export interface Album {
  id: string
  nome: string
  artistas: string
  capaUrl: string | null
}
