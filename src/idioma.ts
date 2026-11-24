export type Idioma = 'en' | 'pt'

export interface Textos {
  seloTocando: string
  seloUltima: string
  seloPausada: string
  rotuloPausada: string
  vazio: string
  noSpotify: string
  rotuloTocando: string
  rotuloUltima: string
  rotuloVazio: string
  agoraHaPouco: string
  minutos: (n: number) => string
  horas: (n: number) => string
  dias: (n: number) => string
  vitrineTitulo: string
  meses: string[]
  vitrineVazia: string
  rotuloVitrine: (lista: string) => string
}

export const TEXTOS: Record<Idioma, Textos> = {
  en: {
    seloTocando: 'NOW PLAYING',
    seloUltima: 'LAST PLAYED',
    seloPausada: 'PAUSED',
    rotuloPausada: 'Paused',
    vazio: 'Nothing playing right now',
    noSpotify: 'on Spotify',
    rotuloTocando: 'Now playing',
    rotuloUltima: 'Last played',
    rotuloVazio: 'Nothing playing on Spotify',
    agoraHaPouco: 'just now',
    minutos: (n) => `${n} min ago`,
    horas: (n) => `${n} h ago`,
    dias: (n) => (n === 1 ? '1 day ago' : `${n} days ago`),
    vitrineTitulo: 'ON DISPLAY',
    meses: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
    vitrineVazia: 'Showcase coming soon',
    rotuloVitrine: (lista) => `On display: ${lista}`,
  },
  pt: {
    seloTocando: 'TOCANDO AGORA',
    seloUltima: 'ÚLTIMA OUVIDA',
    seloPausada: 'PAUSADA',
    rotuloPausada: 'Pausada',
    vazio: 'Nada tocando por aqui',
    noSpotify: 'no Spotify',
    rotuloTocando: 'Tocando agora',
    rotuloUltima: 'Última ouvida',
    rotuloVazio: 'Nada tocando no Spotify',
    agoraHaPouco: 'agora há pouco',
    minutos: (n) => `há ${n} min`,
    horas: (n) => `há ${n} h`,
    dias: (n) => (n === 1 ? 'há 1 dia' : `há ${n} dias`),
    vitrineTitulo: 'EM EXPOSIÇÃO',
    meses: ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'],
    vitrineVazia: 'Vitrine em breve',
    rotuloVitrine: (lista) => `Em exposição: ${lista}`,
  },
}

/** Converte o valor de ?lang= num idioma suportado; qualquer outro valor vira inglês. */
export function lerIdioma(valor: string | null | undefined): Idioma {
  return valor?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}
