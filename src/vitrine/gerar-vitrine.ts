import type { Dependencias } from '../gerar-card.js'
import type { Idioma } from '../idioma.js'
import { baixarCapaBase64, lerCredenciais, obterAccessToken } from '../spotify.js'
import { escolherAlbuns } from './escolher-albuns.js'
import { buscarItensPlaylist, lerIdPlaylist } from './playlist.js'
import { renderizarVitrine } from './render-vitrine.js'
import type { Album } from './tipos.js'

export const CABECALHOS_VITRINE: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, max-age=0',
  'CDN-Cache-Control': 'max-age=3600, stale-while-revalidate=86400',
}

/** Vitrine montada depois de um erro: a CDN guarda só por 60s, para a próxima tentativa vir logo. */
export const CABECALHOS_VITRINE_DEGRADADA: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, max-age=0',
  'CDN-Cache-Control': 'max-age=60',
}

export interface ResultadoVitrine {
  svg: string
  /** true quando algo falhou (configuração, Spotify ou capa) e o SVG não é o "de verdade". */
  degradada: boolean
}

export async function obterAlbuns(deps: Dependencias): Promise<{ albuns: Album[]; erro: boolean }> {
  const id = lerIdPlaylist(deps.env.SPOTIFY_SHOWCASE_PLAYLIST)
  if (!id) {
    deps.log('SPOTIFY_SHOWCASE_PLAYLIST ausente ou inválida', null)
    return { albuns: [], erro: true }
  }
  try {
    const token = await obterAccessToken(lerCredenciais(deps.env), deps.fetchFn)
    const dados = await buscarItensPlaylist(token, id, deps.fetchFn)
    return { albuns: escolherAlbuns(Array.isArray(dados?.items) ? dados.items : []), erro: false }
  } catch (erro) {
    deps.log('Falha ao ler a playlist da vitrine', erro)
    return { albuns: [], erro: true }
  }
}

export async function gerarVitrine(deps: Dependencias, idioma: Idioma = 'en'): Promise<ResultadoVitrine> {
  const { albuns, erro } = await obterAlbuns(deps)
  try {
    const capas = await Promise.all(
      albuns.map((a) => (a.capaUrl ? baixarCapaBase64(a.capaUrl, deps.fetchFn) : Promise.resolve(null))),
    )
    const capaFalhou = albuns.some((a, i) => a.capaUrl !== null && capas[i] === null)
    return { svg: renderizarVitrine(albuns, capas, deps.agora(), idioma), degradada: erro || capaFalhou }
  } catch (falha) {
    deps.log('Falha ao montar a vitrine', falha)
    return { svg: renderizarVitrine([], [], deps.agora(), idioma), degradada: true }
  }
}
