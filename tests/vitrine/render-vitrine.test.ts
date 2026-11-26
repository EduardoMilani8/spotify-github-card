import { XMLValidator } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { corpoVitrine, renderizarVitrine } from '../../src/vitrine/render-vitrine.js'
import type { Album } from '../../src/vitrine/tipos.js'

const agora = new Date('2026-11-24T12:00:00Z')
const CAPA = 'data:image/jpeg;base64,AAAA'
const album = (i: number, nome = `Album ${i}`): Album => ({ id: `id${i}`, nome, artistas: 'Artist', capaUrl: null })
const lista = (n: number) => Array.from({ length: n }, (_, i) => album(i + 1))
const capas = (n: number) => Array.from({ length: n }, () => CAPA)
const contar = (svg: string, trecho: string) => svg.split(trecho).length - 1

describe('renderizarVitrine', () => {
  it.each([0, 1, 2, 3])('gera XML válido com %i álbuns', (n) => {
    expect(XMLValidator.validate(renderizarVitrine(lista(n), capas(n), agora))).toBe(true)
  })

  it('3 álbuns: carrossel com órbita, três atrasos e indicador', () => {
    const svg = renderizarVitrine(lista(3), capas(3), agora)
    expect(svg).toContain('class="carrossel"')
    expect(svg).toContain('@keyframes orbita')
    for (const d of ['--d:0s', '--d:-8s', '--d:-4s']) expect(svg).toContain(d)
    expect(contar(svg, 'class="pt"')).toBe(3)
  })

  it('o disco que passa por trás some antes de cruzar os da frente', () => {
    const svg = renderizarVitrine(lista(3), capas(3), agora)
    expect(svg).toContain('animation:orbita 12s infinite,atras 12s linear infinite')
    expect(svg).toContain('@keyframes atras{0%,58.3%{opacity:1}59.5%,65.5%{opacity:0}66.6%,100%{opacity:1}}')
  })

  it('cada capa é embutida uma única vez e reaproveitada com <use>', () => {
    const svg = renderizarVitrine(lista(3), capas(3), agora)
    expect(contar(svg, CAPA)).toBe(3)
    expect(svg).toContain('href="#img-0"')
  })

  it.each([1, 2])('%i álbum(ns): estático, vinil girando, sem órbita e sem indicador', (n) => {
    const svg = renderizarVitrine(lista(n), capas(n), agora)
    expect(svg).toContain('class="estatico"')
    expect(svg).toContain('class="giro"')
    expect(svg).not.toContain('@keyframes orbita')
    expect(svg).not.toContain('class="pt"')
  })

  it('0 álbuns: vazio com mensagem e discos parados', () => {
    const en = renderizarVitrine([], [], agora)
    expect(en).toContain('class="vazio"')
    expect(en).toContain('Showcase coming soon')
    expect(en).not.toContain('class="giro"')
    expect(renderizarVitrine([], [], agora, 'pt')).toContain('Vitrine em breve')
  })

  it('cabeçalho com o mês em UTC, no idioma pedido', () => {
    expect(renderizarVitrine(lista(3), capas(3), agora)).toContain('ON DISPLAY · NOVEMBER')
    expect(renderizarVitrine(lista(3), capas(3), agora, 'pt')).toContain('EM EXPOSIÇÃO · NOVEMBRO')
    expect(renderizarVitrine([], [], new Date('2026-12-01T01:00:00Z'))).toContain('DECEMBER')
  })

  it('nome longo rola em vez de ser cortado', () => {
    const nome = 'An Extraordinarily Long Album Title That Never Ends (Deluxe Anniversary Edition)'
    const svg = renderizarVitrine([album(1, nome), album(2), album(3)], capas(3), agora)
    expect(svg).toContain('@keyframes rolar-v0')
    expect(svg).toContain(nome)
  })

  it('nome longo em CJK continua XML válido e rola', () => {
    const svg = renderizarVitrine([album(1, 'ラブ・ドラマティック feat. 伊原六花 '.repeat(3)), album(2), album(3)], capas(3), agora)
    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toContain('@keyframes rolar-v0')
  })

  it('escapa caracteres especiais', () => {
    const svg = renderizarVitrine([album(1, 'Rock & <Roll>'), album(2), album(3)], capas(3), agora)
    expect(svg).toContain('Rock &amp; &lt;Roll&gt;')
    expect(XMLValidator.validate(svg)).toBe(true)
  })

  it('aria-label lista os álbuns', () => {
    expect(renderizarVitrine(lista(3), capas(3), agora)).toContain(
      'aria-label="On display: Album 1 — Artist; Album 2 — Artist; Album 3 — Artist"',
    )
  })

  it('sem capa usa o fallback verde', () => {
    const svg = renderizarVitrine(lista(3), [null, null, null], agora)
    expect(svg).not.toContain('<image')
    expect(svg).toContain('fill="#006d32"')
  })
})

describe('corpoVitrine com prefixo', () => {
  const albuns = [1, 2, 3].map((n) => ({ id: `a${n}`, nome: `Um Álbum Com Nome Bem Comprido Número ${n}`, artistas: 'Artista Um, Artista Dois, Artista Três', capaUrl: null }))
  const op = { prefixo: 'a-', fundo: '#0d1117', fonteTitulo: [15, 12] as [number, number], indicador: false, mensagemVazia: 'vazio' }

  it('todo id e toda referência levam o prefixo', () => {
    for (const lista of [albuns, albuns.slice(0, 2), albuns.slice(0, 1), []]) {
      const c = corpoVitrine(lista, [], op)
      const svg = c.defs + c.elementos
      for (const [, id] of svg.matchAll(/ id="([^"]+)"/g)) expect(id.startsWith('a-')).toBe(true)
      for (const [, ref] of svg.matchAll(/(?:url\(#|href="#)([^)"]+)/g)) expect(ref.startsWith('a-')).toBe(true)
    }
  })

  it('sem indicador e com a cor de fundo pedida', () => {
    const c = corpoVitrine(albuns, [], op)
    expect(c.tipo).toBe('carrossel')
    expect(c.elementos).not.toContain('class="pt"')
    expect(c.elementos).toContain('fill="#0d1117"')
  })
})
