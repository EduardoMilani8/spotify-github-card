import { CABECALHOS_SEM_CACHE, dependenciasPadrao, obterEstado, urlDestino } from '../src/gerar-card.js'

export async function GET(_request: Request): Promise<Response> {
  const estado = await obterEstado(dependenciasPadrao())
  return new Response(null, {
    status: 302,
    headers: { Location: urlDestino(estado), ...CABECALHOS_SEM_CACHE },
  })
}
