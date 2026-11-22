const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

const PROIBIDOS_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

export function escaparXml(texto: string): string {
  return texto.replace(PROIBIDOS_XML, '').replace(/[&<>"']/g, (c) => ESCAPES[c])
}

const FATOR_COMUM = 0.56
const FATOR_LARGO = 1.0
const INICIO_LARGOS = 0x2e80

export function larguraEstimada(texto: string, fontSize: number): number {
  let total = 0
  for (const caractere of texto) {
    const largo = (caractere.codePointAt(0) ?? 0) >= INICIO_LARGOS
    total += fontSize * (largo ? FATOR_LARGO : FATOR_COMUM)
  }
  return total
}

export interface AjusteTexto {
  fontSize: number
  rolagem: number
}

export function ajustarTexto(
  texto: string,
  larguraMax: number,
  fontPadrao: number,
  fontMin: number,
): AjusteTexto {
  for (let fontSize = fontPadrao; fontSize >= fontMin; fontSize--) {
    if (larguraEstimada(texto, fontSize) <= larguraMax) return { fontSize, rolagem: 0 }
  }
  return { fontSize: fontMin, rolagem: Math.ceil(larguraEstimada(texto, fontMin) - larguraMax) }
}

export function tempoDecorrido(desde: Date, agora: Date): string {
  const minutos = Math.floor((agora.getTime() - desde.getTime()) / 60_000)
  if (minutos < 1) return 'agora há pouco'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}
