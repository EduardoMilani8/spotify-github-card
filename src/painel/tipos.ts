import type { Estado } from '../tipos.js'
import type { Album } from '../vitrine/tipos.js'

export interface Review {
  filme: string
  /** 0.5 a 5, em passos de meia estrela; null quando o item não tem nota. */
  nota: number | null
  /** Texto da review sem HTML, sem aviso de spoiler e com espaços colapsados. */
  trecho: string
  posterUrl: string | null
  /** Data em que o filme foi assistido (YYYY-MM-DD), como vem do RSS. */
  assistidoEm: string
}

export interface Filme {
  titulo: string
  ano: number
  direcao: string
  posterUrl: string
}

export interface DadosPainel {
  estado: Estado
  capa: string | null
  albuns: Album[]
  capasAlbuns: (string | null)[]
  review: Review | null
  posterReview: string | null
  top4: Filme[]
  postersTop4: (string | null)[]
}
