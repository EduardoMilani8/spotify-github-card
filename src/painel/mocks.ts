import { albunsMock, estadoMock } from '../mocks.js'
import type { DadosPainel } from './tipos.js'
import { TOP4 } from './top4.js'

/** Dados de exemplo para /api/painel?mock=playing|paused|last|empty|long, sem rede. */
export function dadosMock(nome: string, agora: Date): DadosPainel | null {
  const estado = estadoMock(nome, agora)
  if (!estado) return null
  if (estado.tipo === 'vazio') {
    return { estado, capa: null, albuns: [], capasAlbuns: [], review: null, posterReview: null, top4: TOP4, postersTop4: [] }
  }
  const albuns = albunsMock('showcase') ?? []
  return {
    estado,
    capa: null,
    albuns,
    capasAlbuns: albuns.map(() => null),
    review: {
      filme: 'Aftersun',
      nota: 4.5,
      trecho: 'Sobre lembrar alguém e perceber que você nunca conheceu essa pessoa.',
      posterUrl: null,
      assistidoEm: '2026-11-22',
    },
    posterReview: null,
    top4: TOP4,
    postersTop4: TOP4.map(() => null),
  }
}
