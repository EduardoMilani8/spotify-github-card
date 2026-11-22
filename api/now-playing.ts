import { CABECALHOS_SEM_CACHE, dependenciasPadrao, gerarCard } from '../src/gerar-card.js'
import { estadoMock } from '../src/mocks.js'
import { renderizarCard } from '../src/render-svg.js'

export async function GET(request: Request): Promise<Response> {
  const agora = new Date()
  const mock = new URL(request.url).searchParams.get('mock')
  const estado = mock ? estadoMock(mock, agora) : null
  const svg = estado ? renderizarCard(estado, null, agora) : await gerarCard(dependenciasPadrao())
  return new Response(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', ...CABECALHOS_SEM_CACHE },
  })
}
