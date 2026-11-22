import { escolherEstado } from './escolher-estado.js'
import { renderizarCard } from './render-svg.js'
import {
  baixarCapaBase64,
  buscarRecentes,
  buscarTocandoAgora,
  lerCredenciais,
  obterAccessToken,
  type FetchFn,
} from './spotify.js'
import type { Estado } from './tipos.js'

export interface Dependencias {
  env: Record<string, string | undefined>
  fetchFn: FetchFn
  agora: () => Date
  log: (mensagem: string, erro: unknown) => void
}

export const CABECALHOS_SEM_CACHE: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, max-age=0',
}

export function dependenciasPadrao(): Dependencias {
  return {
    env: process.env,
    fetchFn: fetch,
    agora: () => new Date(),
    log: (mensagem, erro) => console.error(mensagem, erro),
  }
}

export async function obterEstado(deps: Dependencias): Promise<Estado> {
  let token: string
  try {
    token = await obterAccessToken(lerCredenciais(deps.env), deps.fetchFn)
  } catch (erro) {
    deps.log('Falha ao obter o token do Spotify', erro)
    return { tipo: 'vazio' }
  }
  const [atual, recentes] = await Promise.all([
    buscarTocandoAgora(token, deps.fetchFn).catch((erro) => {
      deps.log('Falha em currently-playing', erro)
      return null
    }),
    buscarRecentes(token, deps.fetchFn).catch((erro) => {
      deps.log('Falha em recently-played', erro)
      return null
    }),
  ])
  try {
    return escolherEstado(atual, recentes)
  } catch (erro) {
    deps.log('Resposta do Spotify em formato inesperado', erro)
    return { tipo: 'vazio' }
  }
}

export async function gerarCard(deps: Dependencias): Promise<string> {
  const estado = await obterEstado(deps)
  try {
    const capaUrl = estado.tipo === 'vazio' ? null : estado.musica.capaUrl
    const capa = capaUrl ? await baixarCapaBase64(capaUrl, deps.fetchFn) : null
    return renderizarCard(estado, capa, deps.agora())
  } catch (erro) {
    deps.log('Falha ao montar o card', erro)
    return renderizarCard({ tipo: 'vazio' }, null, deps.agora())
  }
}

export function urlDestino(estado: Estado): string {
  return estado.tipo === 'vazio' ? 'https://open.spotify.com/' : estado.musica.url
}
