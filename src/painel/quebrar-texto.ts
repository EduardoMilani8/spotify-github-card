import { larguraEstimada } from '../texto.js'

/** Parte uma palavra larga demais em pedaços que cabem, sem separar pares surrogate (emoji). */
function partirPalavra(palavra: string, larguraMax: number, fontSize: number): string[] {
  const pedacos: string[] = []
  let atual = ''
  for (const caractere of palavra) {
    if (atual && larguraEstimada(atual + caractere, fontSize) > larguraMax) {
      pedacos.push(atual)
      atual = ''
    }
    atual += caractere
  }
  if (atual) pedacos.push(atual)
  return pedacos
}

/**
 * Quebra o texto em até `maxLinhas` linhas de no máximo `larguraMax` px (estimados).
 * Se sobrar texto, a última linha termina em "…" (encurtada até caber).
 */
export function quebrarLinhas(texto: string, larguraMax: number, fontSize: number, maxLinhas: number): string[] {
  const palavras = texto
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((p) => (larguraEstimada(p, fontSize) > larguraMax ? partirPalavra(p, larguraMax, fontSize) : [p]))
  const linhas: string[] = []
  let atual = ''
  let i = 0
  for (; i < palavras.length; i++) {
    const tentativa = atual ? `${atual} ${palavras[i]}` : palavras[i]
    if (larguraEstimada(tentativa, fontSize) <= larguraMax) {
      atual = tentativa
      continue
    }
    linhas.push(atual)
    if (linhas.length === maxLinhas) break
    atual = palavras[i]
  }
  if (i === palavras.length) {
    if (atual) linhas.push(atual)
    return linhas
  }
  // Sobrou texto: a última linha ganha reticências.
  let ultima = Array.from(linhas[linhas.length - 1])
  while (ultima.length > 0 && larguraEstimada(`${ultima.join('').trimEnd()}…`, fontSize) > larguraMax) ultima.pop()
  linhas[linhas.length - 1] = `${ultima.join('').trimEnd()}…`
  return linhas
}
