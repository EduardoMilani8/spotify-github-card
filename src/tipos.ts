export interface SpotifyImagem { url: string; width: number | null; height: number | null }
export interface SpotifyFaixa {
  type: 'track'
  name: string
  artists: { name: string }[]
  album: { name: string; images: SpotifyImagem[] }
  external_urls: { spotify?: string }
}
export interface SpotifyEpisodio { type: 'episode'; name: string }
export interface TocandoAgora {
  is_playing: boolean
  currently_playing_type: string
  item: SpotifyFaixa | SpotifyEpisodio | null
}
export interface TocadasRecentes { items: { track: SpotifyFaixa; played_at: string }[] }
export interface Musica { nome: string; artistas: string; album: string; capaUrl: string | null; url: string }
export type Estado =
  | { tipo: 'tocando'; musica: Musica }
  | { tipo: 'ultima'; musica: Musica; tocadaEm: Date | null }
  | { tipo: 'vazio' }
