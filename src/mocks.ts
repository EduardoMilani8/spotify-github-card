import type { Estado, Musica } from './tipos.js'

const base: Musica = {
  nome: 'Validation',
  artistas: 'Artist',
  album: 'Validation (Deluxe)',
  capaUrl: null,
  url: 'https://open.spotify.com/',
}

/** Nomes aceitos em ?mock= (inglês) e os nomes antigos em português, mantidos por compatibilidade. */
const ALIASES: Record<string, 'tocando' | 'pausada' | 'ultima' | 'vazio' | 'longo'> = {
  playing: 'tocando',
  last: 'ultima',
  paused: 'pausada',
  empty: 'vazio',
  long: 'longo',
  tocando: 'tocando',
  ultima: 'ultima',
  pausada: 'pausada',
  vazio: 'vazio',
  longo: 'longo',
}

export function estadoMock(nome: string, agora: Date): Estado | null {
  switch (ALIASES[nome]) {
    case 'tocando':
      return { tipo: 'tocando', musica: base }
    case 'pausada':
      return { tipo: 'pausada', musica: base }
    case 'ultima':
      return { tipo: 'ultima', musica: base, tocadaEm: new Date(agora.getTime() - 12 * 60_000) }
    case 'vazio':
      return { tipo: 'vazio' }
    case 'longo':
      return {
        tipo: 'tocando',
        musica: {
          ...base,
          nome: 'A Ridiculously Long Song Title (feat. Another Artist) - Remastered Deluxe Version',
          artistas: 'Artist One, Artist Two, Artist Three, Artist Four',
        },
      }
    default:
      return null
  }
}
