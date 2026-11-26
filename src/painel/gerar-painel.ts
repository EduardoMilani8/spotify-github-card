import { obterEstado, type Dependencias } from '../gerar-card.js'
import { baixarCapaBase64 } from '../spotify.js'
import type { Estado } from '../tipos.js'
import { obterAlbuns } from '../vitrine/gerar-vitrine.js'
import type { Album } from '../vitrine/tipos.js'
import { buscarRss, escolherReview } from './letterboxd.js'
import { renderizarPainel, type PartePainel } from './render-painel.js'
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
  /** Busca em andamento: visitas que chegam enquanto ela roda esperam a mesma, em vez de buscar de novo. */
  emAndamento: Promise<DadosLentos> | null
}

export const criarMemo = (): Memo => ({ valor: null, expiraEm: 0, emAndamento: null })

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
    const xml = await buscarRss(usuario, deps.fetchFn)
    // Uma página de desafio ou de erro pode vir com status 200: sem <rss>, é falha, não "sem review".
    if (!/<rss[\s>]/.test(xml)) throw new Error('Resposta do Letterboxd não é um RSS')
    const review = escolherReview(xml)
    const poster = await baixar(review?.posterUrl ?? null, deps)
    return { review, poster, erro: review?.posterUrl ? poster === null : false }
  } catch (erro) {
    deps.log('Falha ao ler o RSS do Letterboxd', erro)
    return { review: null, poster: null, erro: true }
  }
}

/**
 * Busca as três partes; a que falhar mantém o valor bom anterior (se houver),
 * e qualquer falha encurta o memo para 60s.
 */
async function buscarDadosLentos(deps: Dependencias, anterior: DadosLentos | null): Promise<{ dados: DadosLentos; erro: boolean }> {
  const [alb, rev, postersNovos] = await Promise.all([
    lerAlbuns(deps),
    lerReview(deps),
    Promise.all(TOP4.map((f) => baixar(f.posterUrl, deps))),
  ])
  const manterAlbuns = alb.erro && anterior !== null
  const manterReview = rev.erro && anterior !== null
  return {
    dados: {
      albuns: manterAlbuns ? anterior.albuns : alb.albuns,
      capasAlbuns: manterAlbuns ? anterior.capasAlbuns : alb.capas,
      review: manterReview ? anterior.review : rev.review,
      posterReview: manterReview ? anterior.posterReview : rev.poster,
      postersTop4: postersNovos.map((p, i) => p ?? anterior?.postersTop4[i] ?? null),
    },
    erro: alb.erro || rev.erro || postersNovos.some((p) => p === null),
  }
}

/** Devolve os dados lentos do memo; busca de novo depois de 1h (ou 60s se a última busca teve erro). */
function dadosLentos(deps: Dependencias, memo: Memo): Promise<DadosLentos> {
  const agora = deps.agora().getTime()
  if (memo.valor && agora < memo.expiraEm) return Promise.resolve(memo.valor)
  memo.emAndamento ??= atualizarMemo(deps, memo, agora).finally(() => {
    memo.emAndamento = null
  })
  return memo.emAndamento
}

async function atualizarMemo(deps: Dependencias, memo: Memo, agora: number): Promise<DadosLentos> {
  try {
    const { dados, erro } = await buscarDadosLentos(deps, memo.valor)
    memo.valor = dados
    memo.expiraEm = agora + (erro ? UM_MINUTO : UMA_HORA)
    return dados
  } catch (erro) {
    deps.log('Falha inesperada nos dados do painel', erro)
    return memo.valor ?? VAZIOS
  }
}

/** Estado do Spotify já com a capa: a capa baixa assim que o estado chega, sem esperar os dados lentos. */
async function musicaComCapa(deps: Dependencias): Promise<{ estado: Estado; capa: string | null }> {
  const estado = await obterEstado(deps)
  return { estado, capa: estado.tipo === 'vazio' ? null : await baixar(estado.musica.capaUrl, deps) }
}

export async function gerarPainel(deps: Dependencias, memo: Memo = MEMO_DA_INSTANCIA, parte: PartePainel = 'completo'): Promise<string> {
  // A metade dos filmes não mostra a música: não precisa consultar o Spotify do "tocando agora".
  const musica = parte === 'filmes' ? Promise.resolve({ estado: { tipo: 'vazio' } as Estado, capa: null }) : musicaComCapa(deps)
  const [{ estado, capa }, lentos] = await Promise.all([musica, dadosLentos(deps, memo)])
  try {
    return renderizarPainel({ estado, capa, ...lentos, top4: TOP4 }, deps.agora(), parte)
  } catch (erro) {
    deps.log('Falha ao montar o painel', erro)
    return renderizarPainel({ estado: { tipo: 'vazio' }, capa: null, ...VAZIOS, top4: TOP4 }, deps.agora(), parte)
  }
}
