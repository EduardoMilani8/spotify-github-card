import type { Filme } from './tipos.js'

const POSTER = 'https://a.ltrbxd.com/resized/film-poster'

/**
 * Top 4 filmes do painel. O RSS do Letterboxd não traz os favoritos, então a lista é
 * fixa: para trocar um filme, mude título, ano, direção e pôster aqui.
 * Pôster: na página do filme no Letterboxd, a URL da imagem com o tamanho trocado
 * para `0-70-0-105` (o CDN recusa tamanhos fora da lista dele).
 */
export const TOP4: Filme[] = [
  {
    titulo: 'Rocky',
    ano: 1976,
    direcao: 'John G. Avildsen',
    posterUrl: `${POSTER}/5/1/0/9/0/51090-rocky-0-70-0-105-crop.jpg?v=da48c9eb5a`,
  },
  {
    titulo: 'Raiders of the Lost Ark',
    ano: 1981,
    direcao: 'Steven Spielberg',
    posterUrl: `${POSTER}/5/1/9/6/5/51965-raiders-of-the-lost-ark-0-70-0-105-crop.jpg?v=2b066bfd52`,
  },
  {
    titulo: 'Uncut Gems',
    ano: 2019,
    direcao: 'Josh Safdie, Benny Safdie',
    posterUrl: `${POSTER}/4/0/4/2/6/6/404266-uncut-gems-0-70-0-105-crop.jpg?v=670cb7034d`,
  },
  {
    titulo: 'Bingo: O Rei das Manhãs',
    ano: 2017,
    direcao: 'Daniel Rezende',
    posterUrl: `${POSTER}/3/6/2/3/6/8/362368-bingo-the-king-of-the-mornings-0-70-0-105-crop.jpg?v=54bc8aa285`,
  },
]
