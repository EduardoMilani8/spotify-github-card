import { CABECALHOS_SEM_CACHE, dependenciasPadrao } from '../src/gerar-card.js'
import { gerarPainel } from '../src/painel/gerar-painel.js'
import { dadosMock } from '../src/painel/mocks.js'
import { lerParte, renderizarPainel } from '../src/painel/render-painel.js'

export async function GET(request: Request): Promise<Response> {
  const agora = new Date()
  const params = new URL(request.url).searchParams
  const parte = lerParte(params.get('parte'))
  const mock = params.get('mock')
  const dados = mock ? dadosMock(mock, agora) : null
  const svg = dados ? renderizarPainel(dados, agora, parte) : await gerarPainel(dependenciasPadrao(), undefined, parte)
  return new Response(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', ...CABECALHOS_SEM_CACHE },
  })
}
