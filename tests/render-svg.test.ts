import { XMLValidator } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { renderizarCard } from '../src/render-svg.js'
import type { Estado, Musica } from '../src/tipos.js'

const agora = new Date('2026-11-22T12:00:00Z')
const musica = (nome = 'Validation'): Musica => ({
  nome,
  artistas: 'Artista',
  album: 'Validation (Deluxe)',
  capaUrl: 'https://i.scdn.co/300',
  url: 'https://open.spotify.com/track/1',
})
const CAPA = 'data:image/jpeg;base64,AAAA'
const tocando: Estado = { tipo: 'tocando', musica: musica() }
const ultima: Estado = { tipo: 'ultima', musica: musica(), tocadaEm: new Date('2026-11-22T11:55:00Z') }
const vazio: Estado = { tipo: 'vazio' }

describe('renderizarCard', () => {
  it.each([
    ['tocando', tocando],
    ['ultima', ultima],
    ['vazio', vazio],
  ])('gera XML válido no estado %s', (_, estado) => {
    expect(XMLValidator.validate(renderizarCard(estado, CAPA, agora))).toBe(true)
  })

  it('tocando: classe de animação, selo e braço sobre o disco', () => {
    const svg = renderizarCard(tocando, CAPA, agora)
    expect(svg).toContain('class="tocando"')
    expect(svg).toContain('TOCANDO AGORA')
    expect(svg).not.toContain('rotate(-38 156 20)')
    expect(svg).toContain('>no Spotify<')
    expect(svg).toContain('fill="#0e4429"')
  })

  it('ultima: braço afastado, selo e tempo decorrido', () => {
    const svg = renderizarCard(ultima, CAPA, agora)
    expect(svg).toContain('class="ultima"')
    expect(svg).toContain('ÚLTIMA OUVIDA')
    expect(svg).toContain('rotate(-38 156 20)')
    expect(svg).toContain('há 5 min no Spotify')
  })

  it('vazio: mensagem, sem selo e sem capa', () => {
    const svg = renderizarCard(vazio, CAPA, agora)
    expect(svg).toContain('Nada tocando por aqui')
    expect(svg).not.toContain('TOCANDO AGORA')
    expect(svg).not.toContain('ÚLTIMA OUVIDA')
    expect(svg).not.toContain('<image')
  })

  it('com capa usa <image> recortada; sem capa usa selo verde', () => {
    expect(renderizarCard(tocando, CAPA, agora)).toContain(`href="${CAPA}"`)
    const semCapa = renderizarCard(tocando, null, agora)
    expect(semCapa).not.toContain('<image')
    expect(semCapa).toContain('r="25" fill="#39d353"')
  })

  it('escapa caracteres especiais e continua XML válido', () => {
    const svg = renderizarCard({ tipo: 'tocando', musica: musica('Rock & Roll <3') }, CAPA, agora)
    expect(svg).toContain('Rock &amp; Roll &lt;3')
    expect(XMLValidator.validate(svg)).toBe(true)
  })

  it('nome longo: rolagem com keyframes e texto completo presente', () => {
    const longo = 'Um nome de música absurdamente longo (feat. Outro Artista) - Remastered'
    const svg = renderizarCard({ tipo: 'tocando', musica: musica(longo) }, CAPA, agora)
    expect(svg).toContain('@keyframes rolar-titulo')
    expect(svg).toContain('clip-path="url(#recorte-titulo)"')
    expect(svg).toContain(longo)
    expect(XMLValidator.validate(svg)).toBe(true)
  })

  it('nome curto: sem rolagem', () => {
    expect(renderizarCard(tocando, CAPA, agora)).not.toContain('@keyframes rolar-titulo')
  })
})
