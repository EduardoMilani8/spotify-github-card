import { XMLValidator } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { renderizarPainel } from '../../src/painel/render-painel.js'
import { TOP4 } from '../../src/painel/top4.js'
import type { DadosPainel } from '../../src/painel/tipos.js'
import { escaparXml } from '../../src/texto.js'
import type { Musica } from '../../src/tipos.js'

const AGORA = new Date('2026-11-25T12:00:00Z')
const CAPA = 'data:image/jpeg;base64,AAAA'
const musica: Musica = { nome: 'Nada Será Como Antes', artistas: 'Milton Nascimento, Lô Borges', album: 'Clube da Esquina', capaUrl: null, url: 'https://open.spotify.com/' }
const albuns = ['Um', 'Dois', 'Três'].map((n) => ({ id: n, nome: `Álbum ${n}`, artistas: 'Artista', capaUrl: null }))

const base: DadosPainel = {
  estado: { tipo: 'tocando', musica },
  capa: CAPA,
  albuns,
  capasAlbuns: [CAPA, null, CAPA],
  review: { filme: 'Aftersun', nota: 4.5, trecho: 'Sobre lembrar alguém e perceber que você nunca conheceu essa pessoa de verdade, nem um pouco.', posterUrl: 'x', assistidoEm: '2026-11-22' },
  posterReview: CAPA,
  top4: TOP4,
  postersTop4: [CAPA, null, CAPA, CAPA],
}
const render = (d: Partial<DadosPainel> = {}) => renderizarPainel({ ...base, ...d }, AGORA)
const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])

describe('renderizarPainel', () => {
  it('gera XML válido, recortado nos quadros, com a classe do estado na raiz', () => {
    const svg = render()
    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toMatch(/^<svg[^>]*viewBox="19 43.5 802 300"[^>]*class="tocando"/)
  })

  it('nenhum id repetido e toda referência aponta para um id existente', () => {
    for (const d of [{}, { albuns: albuns.slice(0, 2) }, { albuns: [] }, { review: null }, { estado: { tipo: 'vazio' as const } }]) {
      const svg = render(d)
      const lista = ids(svg)
      expect(new Set(lista).size).toBe(lista.length)
      for (const [, ref] of svg.matchAll(/(?:url\(#|href="#)([^)"]+)/g)) expect(lista).toContain(ref)
    }
  })

  it('sem cabeçalho de repositório', () => {
    for (const t of ['gostos', '>eduardo<', 'Public']) expect(render()).not.toContain(t)
  })

  it('os 4 quadros', () => {
    const svg = render()
    for (const t of ['tocando-agora', 'albuns-do-mes', 'novembro', 'top-4-filmes', 'favoritos no Letterboxd'])
      expect(svg).toContain(t)
  })

  it('texto do rodapé da música por estado', () => {
    expect(render()).toContain('ao vivo no Spotify')
    expect(render({ estado: { tipo: 'pausada', musica } })).toContain('pausado no Spotify')
    expect(render({ estado: { tipo: 'ultima', musica, tocadaEm: new Date(AGORA.getTime() - 12 * 60_000) } })).toContain('tocada há 12 min')
    expect(render({ estado: { tipo: 'vazio' } })).toContain('nada tocando agora')
  })

  it('só tocando tem anel pulsando e braço sobre o disco', () => {
    expect(render()).toContain('class="m-anel"')
    const pausado = render({ estado: { tipo: 'pausada', musica } })
    expect(pausado).not.toContain('class="m-anel"')
    expect(pausado).toContain('rotate(-38 156 20)')
  })

  it('carrossel com 3 álbuns e indicador; estático sem indicador; vazio com mensagem', () => {
    expect(render()).toContain('class="alb"')
    expect(render()).toContain('class="pt"')
    expect(render({ albuns: albuns.slice(0, 2) })).not.toContain('class="pt"')
    expect(render({ albuns: [] })).toContain('vitrine em breve')
  })

  it('review: nome, estrelas, trecho em até 2 linhas com aspas, data', () => {
    const svg = render()
    expect(svg).toContain('>Aftersun<')
    expect(svg).toContain('★★★★½')
    const linhas = [...svg.matchAll(/<text class="r-trecho"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1])
    expect(linhas).toHaveLength(2)
    expect(linhas[0].startsWith('“')).toBe(true)
    expect(linhas[1].endsWith('”')).toBe(true)
    expect(svg).toContain('review de 22 nov no Letterboxd')
  })

  it('review vazia', () => {
    const svg = render({ review: null, posterReview: null })
    expect(svg).toContain('ultima-review')
    expect(svg).toContain('nenhuma review por aqui ainda')
  })

  it('top 4: os quatro nomes e ano · direção', () => {
    const svg = render()
    for (const f of TOP4) {
      expect(svg).toContain(`>${escaparXml(f.titulo)}<`)
      expect(svg).toContain(`>${escaparXml(`${f.ano} · ${f.direcao}`)}<`)
    }
    expect(svg).toContain('Bingo: O Rei das Manhãs')
  })

  it('respeita prefers-reduced-motion', () => {
    expect(render()).toContain('prefers-reduced-motion')
  })

  it('escapa texto externo', () => {
    const svg = render({
      estado: { tipo: 'tocando', musica: { ...musica, nome: 'A <b> & "c"' } },
      review: { ...base.review!, filme: 'Tom & Jerry <3', trecho: 'a < b & c' },
    })
    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toContain('Tom &amp; Jerry &lt;3')
  })

  it('sem borda em volta do painel (só o fundo)', () => {
    expect(render()).not.toContain('stroke="#30363d"/><path d="M22 18')
    expect(render()).toMatch(/<rect x="19" y="43.5" width="802" height="300" rx="6" fill="#0d1117"\/>/)
  })
})

describe('renderizarPainel por parte', () => {
  const parte = (p: 'musica' | 'filmes') => renderizarPainel(base, AGORA, p)

  it('musica: só a linha de cima, recortada', () => {
    const svg = parte('musica')
    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toMatch(/^<svg[^>]*width="802" height="150" viewBox="19 43.5 802 150"/)
    for (const t of ['tocando-agora', 'albuns-do-mes']) expect(svg).toContain(t)
    for (const t of ['Aftersun', 'top-4-filmes', 'Letterboxd']) expect(svg).not.toContain(t)
  })

  it('filmes: só a linha de baixo, sem imagens da música', () => {
    const svg = parte('filmes')
    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toMatch(/^<svg[^>]*width="802" height="150" viewBox="19 193.5 802 150"/)
    for (const t of ['>Aftersun<', 'top-4-filmes', 'favoritos no Letterboxd']) expect(svg).toContain(t)
    for (const t of ['gostos', 'tocando-agora', 'albuns-do-mes', 'a-img-0']) expect(svg).not.toContain(t)
  })

  it('ids únicos e referências válidas nas duas partes', () => {
    for (const svg of [parte('musica'), parte('filmes')]) {
      const lista = ids(svg)
      expect(new Set(lista).size).toBe(lista.length)
      for (const [, ref] of svg.matchAll(/(?:url\(#|href="#)([^)"]+)/g)) expect(lista).toContain(ref)
    }
  })
})
