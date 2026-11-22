export type Idioma = 'en' | 'pt'

export interface Textos {
  seloTocando: string
  seloUltima: string
  vazio: string
  noSpotify: string
  rotuloTocando: string
  rotuloUltima: string
  rotuloVazio: string
  agoraHaPouco: string
  minutos: (n: number) => string
  horas: (n: number) => string
  dias: (n: number) => string
}

export const TEXTOS: Record<Idioma, Textos> = {
  en: {
    seloTocando: 'NOW PLAYING',
    seloUltima: 'LAST PLAYED',
    vazio: 'Nothing playing right now',
    noSpotify: 'on Spotify',
    rotuloTocando: 'Now playing',
    rotuloUltima: 'Last played',
    rotuloVazio: 'Nothing playing on Spotify',
    agoraHaPouco: 'just now',
    minutos: (n) => `${n} min ago`,
    horas: (n) => `${n} h ago`,
    dias: (n) => (n === 1 ? '1 day ago' : `${n} days ago`),
  },
  pt: {
    seloTocando: 'TOCANDO AGORA',
    seloUltima: 'ÚLTIMA OUVIDA',
    vazio: 'Nada tocando por aqui',
    noSpotify: 'no Spotify',
    rotuloTocando: 'Tocando agora',
    rotuloUltima: 'Última ouvida',
    rotuloVazio: 'Nada tocando no Spotify',
    agoraHaPouco: 'agora há pouco',
    minutos: (n) => `há ${n} min`,
    horas: (n) => `há ${n} h`,
    dias: (n) => (n === 1 ? 'há 1 dia' : `há ${n} dias`),
  },
}

/** Converte o valor de ?lang= num idioma suportado; qualquer outro valor vira inglês. */
export function lerIdioma(valor: string | null | undefined): Idioma {
  return valor?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}
