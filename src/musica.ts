import type { Musica, SpotifyFaixa, SpotifyImagem } from './tipos.js'

const LARGURA_MINIMA_CAPA = 100

export function escolherImagemCapa(imagens: SpotifyImagem[]): string | null {
  if (imagens.length === 0) return null
  const porLargura = [...imagens].sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  const adequada = porLargura.find((i) => (i.width ?? 0) >= LARGURA_MINIMA_CAPA)
  return (adequada ?? porLargura[porLargura.length - 1]).url
}

export function paraMusica(faixa: SpotifyFaixa): Musica {
  return {
    nome: faixa.name,
    artistas: faixa.artists.map((a) => a.name).join(', '),
    album: faixa.album.name,
    capaUrl: escolherImagemCapa(faixa.album.images),
    url: faixa.external_urls?.spotify ?? 'https://open.spotify.com/',
  }
}
