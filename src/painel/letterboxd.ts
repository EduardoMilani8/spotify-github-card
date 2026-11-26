import { XMLParser } from 'fast-xml-parser'
import type { FetchFn } from '../spotify.js'
import type { Review } from './tipos.js'

const TIMEOUT_MS = 2500
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Tudo como texto: um filme chamado "1917" não pode virar número. */
const parser = new XMLParser({ parseTagValue: false, ignoreAttributes: true, isArray: (nome) => nome === 'item' })

export async function buscarRss(usuario: string, fetchFn: FetchFn = fetch): Promise<string> {
  const resposta = await fetchFn(`https://letterboxd.com/${encodeURIComponent(usuario)}/rss/`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; github-profile-card)' },
  })
  if (!resposta.ok) throw new Error(`Letterboxd respondeu ${resposta.status}`)
  return resposta.text()
}

/** Entidades nomeadas que aparecem em texto corrido: básicas, tipográficas e letras acentuadas. */
const ENTIDADES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„',
  laquo: '«', raquo: '»', middot: '·', bull: '•', deg: '°', copy: '©', reg: '®', trade: '™', times: '×',
  iexcl: '¡', iquest: '¿', ordf: 'ª', ordm: 'º', szlig: 'ß', aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø',
  ...entidadesAcentuadas(),
}

/** &eacute;, &atilde;, &ccedil;... gerados a partir da letra + acento combinante (só quando vira um caractere só). */
function entidadesAcentuadas(): Record<string, string> {
  const acentos: Record<string, string> = { acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303', uml: '\u0308', cedil: '\u0327', ring: '\u030A' }
  const tabela: Record<string, string> = {}
  for (const letra of 'aeiouycnAEIOUYCN') {
    for (const [nome, acento] of Object.entries(acentos)) {
      const caractere = (letra + acento).normalize('NFC')
      if (caractere.length === 1) tabela[letra + nome] = caractere
    }
  }
  return tabela
}

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteira, nome: string) => {
    if (nome[0] === '#') {
      const codigo = nome[1].toLowerCase() === 'x' ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10)
      return codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : ''
    }
    return ENTIDADES[nome] ?? ENTIDADES[nome.toLowerCase()] ?? inteira
  })
}

/** Texto visível da review: fim de parágrafo e <br> viram espaço, o resto das tags some. */
function limparTexto(html: string): string {
  const texto = decodificarEntidades(html.replace(/<\/p>|<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ''))
  return texto
    .replace(/This review may contain spoilers\.?/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function lerNota(valor: unknown): number | null {
  const nota = Number(valor)
  return Number.isFinite(nota) && nota >= 0.5 && nota <= 5 ? Math.round(nota * 2) / 2 : null
}

function lerPoster(html: string): string | null {
  const src = html.match(/<img[^>]*\ssrc="([^"]+)"/i)?.[1]
  return src ? decodificarEntidades(src).replace(/-0-\d+-0-\d+-crop/, '-0-150-0-225-crop') : null
}

/**
 * Primeira review do RSS: item com filmTitle e texto escrito.
 * Pula listas (sem filmTitle) e registros só de diário ("Watched on ...").
 */
export function escolherReview(xml: string): Review | null {
  let itens: Record<string, unknown>[]
  try {
    const itensBrutos = parser.parse(xml)?.rss?.channel?.item
    itens = Array.isArray(itensBrutos) ? itensBrutos : []
  } catch {
    return null
  }
  for (const item of itens) {
    const filme = typeof item['letterboxd:filmTitle'] === 'string' ? item['letterboxd:filmTitle'].trim() : ''
    const html = typeof item.description === 'string' ? item.description : ''
    const trecho = limparTexto(html)
    if (!filme || !trecho || /^Watched on /i.test(trecho)) continue
    return {
      filme,
      nota: lerNota(item['letterboxd:memberRating']),
      trecho,
      posterUrl: lerPoster(html),
      assistidoEm: String(item['letterboxd:watchedDate'] ?? ''),
    }
  }
  return null
}

export function estrelas(nota: number | null): string {
  if (nota === null) return ''
  return '★'.repeat(Math.floor(nota)) + (nota % 1 ? '½' : '')
}

/** '2026-08-09' → '9 ago'. Lê a data como texto, sem fuso horário. */
export function dataCurta(iso: string): string {
  const partes = iso.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!partes) return ''
  const mes = MESES[Number(partes[1]) - 1]
  return mes ? `${Number(partes[2])} ${mes}` : ''
}
