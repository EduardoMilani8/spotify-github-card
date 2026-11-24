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

export async function obterAlbuns(deps: Dependencias): Promise<Album[]> {
  const id = lerIdPlaylist(deps.env.SPOTIFY_SHOWCASE_PLAYLIST)
  if (!id) {
    deps.log('SPOTIFY_SHOWCASE_PLAYLIST ausente ou inválida', null)
    return []
  }
  try {
    const token = await obterAccessToken(lerCredenciais(deps.env), deps.fetchFn)
    const dados = await buscarItensPlaylist(token, id, deps.fetchFn)
    return escolherAlbuns(Array.isArray(dados?.items) ? dados.items : [])
  } catch (erro) {
    deps.log('Falha ao ler a playlist da vitrine', erro)
    return []
  }
}

export async function gerarVitrine(deps: Dependencias, idioma: Idioma = 'en'): Promise<string> {
  const albuns = await obterAlbuns(deps)
  try {
    const capas = await Promise.all(
      albuns.map((a) => (a.capaUrl ? baixarCapaBase64(a.capaUrl, deps.fetchFn) : Promise.resolve(null))),
    )
    return renderizarVitrine(albuns, capas, deps.agora(), idioma)
  } catch (erro) {
    deps.log('Falha ao montar a vitrine', erro)
    return renderizarVitrine([], [], deps.agora(), idioma)
  }
}
