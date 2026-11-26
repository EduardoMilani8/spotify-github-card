import { obterEstado, type Dependencias } from '../gerar-card.js'
import { baixarCapaBase64 } from '../spotify.js'
import { obterAlbuns } from '../vitrine/gerar-vitrine.js'
import type { Album } from '../vitrine/tipos.js'
import { buscarRss, escolherReview } from './letterboxd.js'
import { renderizarPainel } from './render-painel.js'
import type { Review } from './tipos.js'
import { TOP4 } from './top4.js'

const UMA_HORA = 60 * 60_000
const UM_MINUTO = 60_000

/** O que muda devagar (álbuns, review, pôsteres): guardado na memória da função. */
interface DadosLentos {
  albuns: Album[]
  capasAlbuns: (string | null)[]
  review: Review | null
  posterReview: string | null
  postersTop4: (string | null)[]
}

export interface Memo {
  valor: DadosLentos | null
  expiraEm: number
}

export const criarMemo = (): Memo => ({ valor: null, expiraEm: 0 })

/** Memo da instância: sobrevive entre requisições enquanto a função estiver quente. */
const MEMO_DA_INSTANCIA = criarMemo()

const VAZIOS: DadosLentos = { albuns: [], capasAlbuns: [], review: null, posterReview: null, postersTop4: [] }

const baixar = (url: string | null, deps: Dependencias): Promise<string | null> =>
  url ? baixarCapaBase64(url, deps.fetchFn) : Promise.resolve(null)

async function lerAlbuns(deps: Dependencias): Promise<{ albuns: Album[]; capas: (string | null)[]; erro: boolean }> {
  const { albuns, erro } = await obterAlbuns(deps)
  const capas = await Promise.all(albuns.map((a) => baixar(a.capaUrl, deps)))
  const capaFalhou = albuns.some((a, i) => a.capaUrl !== null && capas[i] === null)
  return { albuns, capas, erro: erro || capaFalhou }
}

async function lerReview(deps: Dependencias): Promise<{ review: Review | null; poster: string | null; erro: boolean }> {
  const usuario = deps.env.LETTERBOXD_USER?.trim()
  if (!usuario) {
    deps.log('LETTERBOXD_USER ausente', null)
    return { review: null, poster: null, erro: true }
  }
  try {
    const review = escolherReview(await buscarRss(usuario, deps.fetchFn))
    const poster = await baixar(review?.posterUrl ?? null, deps)
    return { review, poster, erro: review?.posterUrl ? poster === null : false }
  } catch (erro) {
    deps.log('Falha ao ler o RSS do Letterboxd', erro)
    return { review: null, poster: null, erro: true }
  }
}

async function buscarDadosLentos(deps: Dependencias): Promise<{ dados: DadosLentos; erro: boolean }> {
  const [alb, rev, postersTop4] = await Promise.all([
    lerAlbuns(deps),
    lerReview(deps),
    Promise.all(TOP4.map((f) => baixar(f.posterUrl, deps))),
  ])
  return {
    dados: { albuns: alb.albuns, capasAlbuns: alb.capas, review: rev.review, posterReview: rev.poster, postersTop4 },
    erro: alb.erro || rev.erro || postersTop4.some((p) => p === null),
  }
}

/** Devolve os dados lentos do memo; busca de novo depois de 1h (ou 60s se a última busca teve erro). */
async function dadosLentos(deps: Dependencias, memo: Memo): Promise<DadosLentos> {
  const agora = deps.agora().getTime()
  if (memo.valor && agora < memo.expiraEm) return memo.valor
  try {
    const { dados, erro } = await buscarDadosLentos(deps)
    memo.valor = dados
    memo.expiraEm = agora + (erro ? UM_MINUTO : UMA_HORA)
    return dados
  } catch (erro) {
    deps.log('Falha inesperada nos dados do painel', erro)
    return memo.valor ?? VAZIOS
  }
}

export async function gerarPainel(deps: Dependencias, memo: Memo = MEMO_DA_INSTANCIA): Promise<string> {
  const [estado, lentos] = await Promise.all([obterEstado(deps), dadosLentos(deps, memo)])
  try {
    const capa = estado.tipo === 'vazio' ? null : await baixar(estado.musica.capaUrl, deps)
    return renderizarPainel({ estado, capa, ...lentos, top4: TOP4 }, deps.agora())
  } catch (erro) {
    deps.log('Falha ao montar o painel', erro)
    return renderizarPainel({ estado: { tipo: 'vazio' }, capa: null, ...VAZIOS, top4: TOP4 }, deps.agora())
  }
}
