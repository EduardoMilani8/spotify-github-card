import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { buscarRss, dataCurta, escolherReview, estrelas } from '../../src/painel/letterboxd.js'

const RSS = readFileSync(new URL('../fixtures/letterboxd.xml', import.meta.url), 'utf8')

const umItem = (descricao: string, extra = '') =>
  `<rss><channel><item><letterboxd:filmTitle>Filme</letterboxd:filmTitle>${extra}` +
  `<letterboxd:watchedDate>2026-01-05</letterboxd:watchedDate>` +
  `<description><![CDATA[${descricao}]]></description></item></channel></rss>`

describe('escolherReview', () => {
  it('pula a lista e o registro sem texto e pega a primeira review', () => {
    const r = escolherReview(RSS)
    expect(r?.filme).toBe('Aftersun')
    expect(r?.nota).toBe(4.5)
    expect(r?.assistidoEm).toBe('2026-11-09')
  })

  it('troca o pôster por 150×225', () => {
    expect(escolherReview(RSS)?.posterUrl).toBe(
      'https://a.ltrbxd.com/resized/film-poster/2/2/22-aftersun-0-150-0-225-crop.jpg?v=bb',
    )
  })

  it('limpa o texto: sem tags, sem aviso de spoiler, entidades decodificadas, espaços colapsados', () => {
    expect(escolherReview(RSS)?.trecho).toBe(
      'Sobre lembrar alguém & perceber que você nunca conheceu essa pessoa. Chorei no "Under Pressure". De novo 😢',
    )
  })

  it('decodifica entidades tipográficas e acentos nomeados', () => {
    const r = escolherReview(umItem('<p>Ele disse &ldquo;n&atilde;o&rdquo; &ndash; e eu&hellip; d&rsquo;aqui &eacute; &Ccedil;&mdash;fim &desconhecida;</p>'))
    expect(r?.trecho).toBe('Ele disse “não” – e eu… d’aqui é Ç—fim &desconhecida;')
  })

  it('aceita um item único (objeto em vez de lista)', () => {
    expect(escolherReview(umItem('<p>Muito bom.</p>'))?.trecho).toBe('Muito bom.')
  })

  it('sem nota ou nota fora da faixa vira null', () => {
    expect(escolherReview(umItem('<p>x</p>'))?.nota).toBeNull()
    expect(escolherReview(umItem('<p>x</p>', '<letterboxd:memberRating>9</letterboxd:memberRating>'))?.nota).toBeNull()
  })

  it('sem pôster: posterUrl null', () => {
    expect(escolherReview(umItem('<p>x</p>'))?.posterUrl).toBeNull()
  })

  it('RSS sem reviews, vazio ou quebrado → null', () => {
    expect(escolherReview('<rss><channel></channel></rss>')).toBeNull()
    expect(escolherReview(umItem('<p>Watched on Monday January 5, 2026.</p>'))).toBeNull()
    expect(escolherReview('')).toBeNull()
    expect(escolherReview('<rss><channel><item>')).toBeNull()
  })
})

describe('estrelas', () => {
  it('converte a nota', () => {
    expect(estrelas(4.5)).toBe('★★★★½')
    expect(estrelas(1)).toBe('★')
    expect(estrelas(0.5)).toBe('½')
    expect(estrelas(5)).toBe('★★★★★')
    expect(estrelas(null)).toBe('')
  })
})

describe('dataCurta', () => {
  it('dia e mês abreviado em português', () => {
    expect(dataCurta('2026-08-09')).toBe('9 ago')
    expect(dataCurta('2026-11-22')).toBe('22 nov')
    expect(dataCurta('lixo')).toBe('')
  })
})

describe('buscarRss', () => {
  it('busca a URL do usuário e devolve o texto', async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request) => new Response("<rss/>"))
    await expect(buscarRss('gozousado', fetchFn as typeof fetch)).resolves.toBe('<rss/>')
    expect(String(fetchFn.mock.calls[0][0])).toBe('https://letterboxd.com/gozousado/rss/')
  })

  it('lança em erro HTTP', async () => {
    const fetchFn = vi.fn(async () => new Response('x', { status: 403 }))
    await expect(buscarRss('u', fetchFn as typeof fetch)).rejects.toThrow('403')
  })
})
