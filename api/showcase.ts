import { dependenciasPadrao } from '../src/gerar-card.js'
import { lerIdioma } from '../src/idioma.js'
import { albunsMock } from '../src/mocks.js'
import { CABECALHOS_VITRINE, CABECALHOS_VITRINE_DEGRADADA, gerarVitrine } from '../src/vitrine/gerar-vitrine.js'
import { renderizarVitrine } from '../src/vitrine/render-vitrine.js'

export async function GET(request: Request): Promise<Response> {
  const agora = new Date()
  const params = new URL(request.url).searchParams
  const idioma = lerIdioma(params.get('lang'))
  const mock = params.get('mock')
  const albuns = mock ? albunsMock(mock) : null
  const { svg, degradada } = albuns
    ? { svg: renderizarVitrine(albuns, albuns.map(() => null), agora, idioma), degradada: false }
    : await gerarVitrine(dependenciasPadrao(), idioma)
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      ...(degradada ? CABECALHOS_VITRINE_DEGRADADA : CABECALHOS_VITRINE),
    },
  })
}
