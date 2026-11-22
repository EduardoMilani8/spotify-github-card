import { CABECALHOS_SEM_CACHE, dependenciasPadrao, gerarCard } from '../src/gerar-card.js'
import { lerIdioma } from '../src/idioma.js'
import { estadoMock } from '../src/mocks.js'
import { renderizarCard } from '../src/render-svg.js'

export async function GET(request: Request): Promise<Response> {
  const agora = new Date()
  const params = new URL(request.url).searchParams
  const idioma = lerIdioma(params.get('lang'))
  const mock = params.get('mock')
  const estado = mock ? estadoMock(mock, agora) : null
  const svg = estado ? renderizarCard(estado, null, agora, idioma) : await gerarCard(dependenciasPadrao(), idioma)
  return new Response(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', ...CABECALHOS_SEM_CACHE },
  })
}
