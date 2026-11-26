import { describe, expect, it } from 'vitest'
import { quebrarLinhas } from '../../src/painel/quebrar-texto.js'
import { larguraEstimada } from '../../src/texto.js'

describe('quebrarLinhas', () => {
  it('texto curto fica numa linha', () => {
    expect(quebrarLinhas('Muito bom.', 290, 14, 2)).toEqual(['Muito bom.'])
  })

  it('quebra por palavra sem passar da largura', () => {
    const linhas = quebrarLinhas('Sobre lembrar alguém e perceber que você nunca conheceu essa pessoa.', 290, 14, 2)
    expect(linhas).toHaveLength(2)
    expect(linhas.join(' ')).toBe('Sobre lembrar alguém e perceber que você nunca conheceu essa pessoa.')
    for (const l of linhas) expect(larguraEstimada(l, 14)).toBeLessThanOrEqual(290)
  })

  it('corta a última linha com … quando sobra texto', () => {
    const linhas = quebrarLinhas('palavra '.repeat(40).trim(), 290, 14, 2)
    expect(linhas).toHaveLength(2)
    expect(linhas[1].endsWith('…')).toBe(true)
    expect(larguraEstimada(linhas[1], 14)).toBeLessThanOrEqual(290)
  })

  it('palavra maior que a linha é cortada por caractere', () => {
    const linhas = quebrarLinhas('a'.repeat(100), 100, 14, 2)
    expect(linhas).toHaveLength(2)
    for (const l of linhas) expect(larguraEstimada(l, 14)).toBeLessThanOrEqual(100)
    expect(linhas[1].endsWith('…')).toBe(true)
  })

  it('não quebra emoji no meio', () => {
    const linhas = quebrarLinhas('😢'.repeat(60), 100, 14, 1)
    expect(linhas[0]).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
  })

  it('texto vazio → nenhuma linha', () => {
    expect(quebrarLinhas('', 290, 14, 2)).toEqual([])
  })
})
