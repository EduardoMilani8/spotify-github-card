import { describe, expect, it } from 'vitest'
import { ajustarTexto, escaparXml, larguraEstimada, tempoDecorrido } from '../src/texto.js'

describe('escaparXml', () => {
  it('escapa os cinco caracteres especiais do XML', () => {
    expect(escaparXml(`Rock & Roll <3 "a" 'b' >`)).toBe('Rock &amp; Roll &lt;3 &quot;a&quot; &apos;b&apos; &gt;')
  })
  it('remove caracteres de controle proibidos no XML', () => {
    expect(escaparXml('a\u0000b\u0008c\u001Fd\te')).toBe('abcd\te')
  })
  it('não altera texto comum', () => {
    expect(escaparXml('Validation')).toBe('Validation')
  })
})

describe('larguraEstimada', () => {
  it('usa 0.56 × fontSize por caractere comum', () => {
    expect(larguraEstimada('abcd', 10)).toBeCloseTo(22.4)
  })
  it('conta caracteres largos (CJK, emoji) como 1.0 × fontSize', () => {
    expect(larguraEstimada('夜に駆ける', 10)).toBeCloseTo(50)
    expect(larguraEstimada('🎵', 10)).toBeCloseTo(10)
  })
})

describe('ajustarTexto', () => {
  it('mantém a fonte padrão quando cabe', () => {
    expect(ajustarTexto('Validation', 266, 20, 16)).toEqual({ fontSize: 20, rolagem: 0 })
  })
  it('reduz a fonte quando não cabe no padrão mas cabe acima do mínimo', () => {
    const texto = 'x'.repeat(26) // 26 × 0.56 × 20 = 291 > 266; com 18 → 262 ≤ 266
    expect(ajustarTexto(texto, 266, 20, 16)).toEqual({ fontSize: 18, rolagem: 0 })
  })
  it('usa rolagem no tamanho mínimo quando nem o mínimo cabe', () => {
    const texto = 'x'.repeat(40) // 40 × 0.56 × 16 = 358.4 → rola 93 (arredondado para cima)
    expect(ajustarTexto(texto, 266, 20, 16)).toEqual({ fontSize: 16, rolagem: 93 })
  })
  it('nome japonês longo rola em vez de vazar', () => {
    const aj = ajustarTexto('夜に駆ける夜に駆ける夜に駆ける夜に駆ける', 266, 20, 16)
    expect(aj.fontSize).toBe(16)
    expect(aj.rolagem).toBeGreaterThan(0)
  })
  it('texto vazio não rola', () => {
    expect(ajustarTexto('', 266, 13, 11)).toEqual({ fontSize: 13, rolagem: 0 })
  })
})

describe('tempoDecorrido', () => {
  const agora = new Date('2026-11-22T12:00:00Z')
  const antes = (ms: number) => new Date(agora.getTime() - ms)
  const MIN = 60_000
  it('menos de 1 minuto', () => expect(tempoDecorrido(antes(30_000), agora, 'pt')).toBe('agora há pouco'))
  it('minutos', () => expect(tempoDecorrido(antes(12 * MIN), agora, 'pt')).toBe('há 12 min'))
  it('horas', () => expect(tempoDecorrido(antes(3 * 60 * MIN), agora, 'pt')).toBe('há 3 h'))
  it('um dia', () => expect(tempoDecorrido(antes(25 * 60 * MIN), agora, 'pt')).toBe('há 1 dia'))
  it('vários dias', () => expect(tempoDecorrido(antes(5 * 24 * 60 * MIN), agora, 'pt')).toBe('há 5 dias'))
  it('data no futuro (relógio adiantado) vira "agora há pouco"', () => {
    expect(tempoDecorrido(new Date(agora.getTime() + 5 * MIN), agora, 'pt')).toBe('agora há pouco')
  })
})

describe('tempoDecorrido em inglês (padrão)', () => {
  const agora = new Date('2026-11-22T12:00:00Z')
  const antes = (ms: number) => new Date(agora.getTime() - ms)
  const MIN = 60_000
  it('menos de 1 minuto', () => expect(tempoDecorrido(antes(30_000), agora)).toBe('just now'))
  it('minutos', () => expect(tempoDecorrido(antes(12 * MIN), agora)).toBe('12 min ago'))
  it('horas', () => expect(tempoDecorrido(antes(3 * 60 * MIN), agora)).toBe('3 h ago'))
  it('um dia', () => expect(tempoDecorrido(antes(25 * 60 * MIN), agora)).toBe('1 day ago'))
  it('vários dias', () => expect(tempoDecorrido(antes(5 * 24 * 60 * MIN), agora)).toBe('5 days ago'))
})
