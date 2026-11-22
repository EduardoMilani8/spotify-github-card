import type { Estado, Musica } from './tipos.js'

const base: Musica = {
  nome: 'Validation',
  artistas: 'Artista',
  album: 'Validation (Deluxe)',
  capaUrl: null,
  url: 'https://open.spotify.com/',
}

export function estadoMock(nome: string, agora: Date): Estado | null {
  switch (nome) {
    case 'tocando':
      return { tipo: 'tocando', musica: base }
    case 'ultima':
      return { tipo: 'ultima', musica: base, tocadaEm: new Date(agora.getTime() - 12 * 60_000) }
    case 'vazio':
      return { tipo: 'vazio' }
    case 'longo':
      return {
        tipo: 'tocando',
        musica: {
          ...base,
          nome: 'Um nome de música absurdamente longo (feat. Outro Artista) - Remastered Deluxe Version',
          artistas: 'Artista Um, Artista Dois, Artista Três, Artista Quatro',
        },
      }
    default:
      return null
  }
}
