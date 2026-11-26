import { TEXTOS, type Idioma } from '../idioma.js'
import { ajustarTexto, escaparXml } from '../texto.js'
import type { Album } from './tipos.js'

const FUNDO = '#0e4429'
const FONTE = "'Segoe UI', Helvetica, Arial, sans-serif"
/** Atraso de cada álbum no ciclo de 12s: o 1º começa na frente, o 2º à direita, o 3º à esquerda. */
export const ATRASOS = ['0s', '-8s', '-4s']

interface Parte {
  css: string
  defs: string
  elementos: string
}

/** Como desenhar o corpo da vitrine. O prefixo vai em todos os ids, para caber em outro SVG. */
export interface OpcoesVitrine {
  prefixo: string
  /** Cor do escurecimento dos discos de trás: a mesma do fundo onde a vitrine está. */
  fundo: string
  /** Tamanho do título [padrão, mínimo] no espaço de 400×150 da vitrine. */
  fonteTitulo: [number, number]
  /** Desenha os 3 quadradinhos indicadores em (350, 14). */
  indicador: boolean
  mensagemVazia: string
}

export type TipoVitrine = 'carrossel' | 'estatico' | 'vazio'

const juntar = (partes: Parte[]): Parte => ({
  css: partes.map((p) => p.css).join(''),
  defs: partes.map((p) => p.defs).join(''),
  elementos: partes.map((p) => p.elementos).join(''),
})

const CSS_GIRO =
  '.giro{animation:giro 2.2s linear infinite;transform-box:fill-box;transform-origin:center}' +
  '@keyframes giro{to{transform:rotate(360deg)}}'

const ACELERA = 'animation-timing-function:cubic-bezier(.55,0,1,.6)'
const FREIA = 'animation-timing-function:cubic-bezier(0,.4,.35,1.08)'

const CSS_CARROSSEL =
  // A rota de trás cruza as da frente durante as transições, e o SVG não tem z-index:
  // o disco some enquanto passa por trás e reaparece do outro lado.
  '.alb{animation:orbita 12s infinite,atras 12s linear infinite;animation-delay:var(--d)}' +
  '@keyframes atras{0%,58.3%{opacity:1}59.5%,65.5%{opacity:0}66.6%,100%{opacity:1}}' +
  '@keyframes orbita{' +
  '0%{transform:translate(200px,68px) scale(1,1) skewY(0deg)}' +
  `25%{transform:translate(200px,68px) scale(1,1) skewY(0deg);${ACELERA}}` +
  `29.2%{transform:translate(138px,71px) scale(.78,.84) skewY(5deg);${FREIA}}` +
  '33.3%{transform:translate(78px,73px) scale(.56,.68) skewY(10deg)}' +
  `58.3%{transform:translate(78px,73px) scale(.56,.68) skewY(10deg);${ACELERA}}` +
  `62.5%{transform:translate(200px,50px) scale(.34,.38) skewY(0deg);${FREIA}}` +
  '66.6%{transform:translate(322px,73px) scale(.56,.68) skewY(-10deg)}' +
  `91.6%{transform:translate(322px,73px) scale(.56,.68) skewY(-10deg);${ACELERA}}` +
  `95.8%{transform:translate(262px,71px) scale(.78,.84) skewY(-5deg);${FREIA}}` +
  '100%{transform:translate(200px,68px) scale(1,1) skewY(0deg)}}' +
  '.sombra{opacity:0;animation:sombra 12s infinite;animation-delay:var(--d)}' +
  '@keyframes sombra{0%,25%{opacity:0}33.3%,58.3%{opacity:.45}62.5%{opacity:.75}66.6%,91.6%{opacity:.45}100%{opacity:0}}' +
  '.vinil{animation:vinil 12s ease-in-out infinite;animation-delay:var(--d)}' +
  '@keyframes vinil{0%,3%{transform:translateX(0)}10%,20%{transform:translateX(32px)}25%,100%{transform:translateX(0)}}' +
  '.tit{opacity:0;animation:tit 12s infinite;animation-delay:var(--d)}' +
  '@keyframes tit{0%{opacity:0;transform:translateY(6px)}5%,22%{opacity:1;transform:translateY(0)}26%,100%{opacity:0;transform:translateY(-4px)}}' +
  '.pt{fill:#006d32;animation:pt 12s infinite;animation-delay:var(--d)}' +
  '@keyframes pt{0%,25%{fill:#39d353}29%,96%{fill:#006d32}100%{fill:#39d353}}' +
  '.brilho{animation:brilho 4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
  '@keyframes brilho{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.9;transform:scale(1.08)}}'

const defsFixos = (p: string): string =>
  `<linearGradient id="${p}desvanece" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".3"/><stop offset=".7" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
  `<mask id="${p}reflexo"><rect x="-44" y="44" width="88" height="30" fill="url(#${p}desvanece)"/></mask>` +
  `<radialGradient id="${p}glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#39d353" stop-opacity=".35"/><stop offset="1" stop-color="#39d353" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="${p}piso" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#010409" stop-opacity=".55"/><stop offset="1" stop-color="#010409" stop-opacity="0"/></radialGradient>` +
  `<clipPath id="${p}recorte-capa"><rect x="-42" y="-42" width="84" height="84" rx="3"/></clipPath>` +
  `<clipPath id="${p}selo"><circle r="42"/></clipPath>`

/** Imagem da capa (ou fallback verde) definida uma vez; capa, reflexo e selo usam <use>. */
function defImagem(p: string, i: number, capa: string | null): string {
  const conteudo = capa
    ? `<image href="${capa}" x="-42" y="-42" width="84" height="84" preserveAspectRatio="xMidYMid slice"/>`
    : '<rect x="-42" y="-42" width="84" height="84" fill="#006d32"/><circle r="14" fill="#39d353"/>'
  return `<g id="${p}img-${i}">${conteudo}</g>`
}

function vinil(p: string, i: number, girando: boolean): string {
  const selo = i >= 0 ? `<g transform="scale(.2857)"><use href="#${p}img-${i}" clip-path="url(#${p}selo)"/></g>` : '<circle r="12" fill="#39d353"/>'
  return (
    `<g${girando ? ' class="giro"' : ''}>` +
    '<circle r="40" fill="#010409"/><circle r="34" fill="none" stroke="#21262d"/><circle r="27" fill="none" stroke="#161b22"/>' +
    '<path d="M -28 -24 A 36 36 0 0 1 -6 -35" stroke="#ffffff" stroke-opacity=".2" stroke-width="3" fill="none"/>' +
    selo +
    '<circle r="12" fill="none" stroke="#39d353" stroke-width="1"/><circle r="1.8" fill="#010409"/></g>'
  )
}

const capaComReflexo = (p: string, i: number): string =>
  `<g mask="url(#${p}reflexo)"><g transform="translate(0 86) scale(1 -1)"><use href="#${p}img-${i}" clip-path="url(#${p}recorte-capa)"/></g></g>` +
  `<use href="#${p}img-${i}" clip-path="url(#${p}recorte-capa)"/>`

/** Título "Álbum · Artistas" centrado em x; encolhe até o mínimo e depois rola. */
function titulo(op: OpcoesVitrine, i: number, album: Album, x: number, larguraMax: number, sincronizado: boolean): Parte {
  const id = `v${i}`
  const pre = op.prefixo
  const aj = ajustarTexto(`${album.nome} · ${album.artistas}`, larguraMax, op.fonteTitulo[0], op.fonteTitulo[1])
  const conteudo = `${escaparXml(album.nome)} <tspan fill-opacity=".65">· ${escaparXml(album.artistas)}</tspan>`
  const atributos = `y="138" font-size="${aj.fontSize}" fill="#ffffff" font-family="${FONTE}"`
  if (aj.rolagem === 0) {
    return { css: '', defs: '', elementos: `<text x="${x}" text-anchor="middle" ${atributos}>${conteudo}</text>` }
  }
  const esquerda = x - larguraMax / 2
  // No carrossel o título só aparece ~3s: a rolagem acompanha o ciclo de 12s do álbum.
  const css = sincronizado
    ? `@keyframes ${pre}rolar-${id}{0%,6%{transform:translateX(0)}20%,100%{transform:translateX(-${aj.rolagem}px)}}` +
      `.${pre}rolar-${id}{animation:${pre}rolar-${id} 12s ease-in-out infinite;animation-delay:var(--d)}`
    : `@keyframes ${pre}rolar-${id}{0%,15%{transform:translateX(0)}70%,85%{transform:translateX(-${aj.rolagem}px)}100%{transform:translateX(0)}}` +
      `.${pre}rolar-${id}{animation:${pre}rolar-${id} 9s ease-in-out infinite}`
  return {
    css,
    defs: `<clipPath id="${pre}recorte-${id}"><rect x="${esquerda}" y="${138 - aj.fontSize * 1.2}" width="${larguraMax}" height="${aj.fontSize * 1.6}"/></clipPath>`,
    elementos: `<g clip-path="url(#${pre}recorte-${id})"><text class="${pre}rolar-${id}" x="${esquerda}" ${atributos}>${conteudo}</text></g>`,
  }
}

/** Os 3 quadradinhos do indicador (sem posição): o do álbum na frente acende. */
export const pontosIndicador = (): string =>
  ATRASOS.map((d, i) => `<rect class="pt" x="${i * 11}" width="8" height="8" rx="2" style="--d:${d}"/>`).join('')

function carrossel(albuns: Album[], op: OpcoesVitrine): Parte {
  const p = op.prefixo
  const discos = albuns.map((_, i) => ({
    css: '',
    defs: '',
    elementos:
      `<g class="alb" style="--d:${ATRASOS[i]}">` +
      `<g class="vinil">${vinil(p, i, true)}</g>` +
      capaComReflexo(p, i) +
      `<rect class="sombra" x="-44" y="-44" width="88" height="120" fill="${op.fundo}"/></g>`,
  }))
  const titulos = albuns.map((album, i) => {
    const t = titulo(op, i, album, 200, 360, true)
    return { ...t, elementos: `<g class="tit" style="--d:${ATRASOS[i]}">${t.elementos}</g>` }
  })
  const indicador = op.indicador ? `<g transform="translate(350 14)">${pontosIndicador()}</g>` : ''
  const fundo =
    `<ellipse class="brilho" cx="200" cy="70" rx="95" ry="55" fill="url(#${p}glow)"/>` +
    `<ellipse cx="200" cy="116" rx="120" ry="9" fill="url(#${p}piso)"/>`
  const corpo = juntar([...discos, ...titulos])
  return { css: CSS_GIRO + CSS_CARROSSEL + corpo.css, defs: corpo.defs, elementos: fundo + indicador + corpo.elementos }
}

/** 1 ou 2 álbuns: parados, centralizados, com o vinil para fora girando. */
function estatico(albuns: Album[], op: OpcoesVitrine): Parte {
  const p = op.prefixo
  const posicoes = albuns.length === 1 ? [184] : [105, 265]
  const largura = albuns.length === 1 ? 360 : 150
  const partes = albuns.map((album, i) => {
    const t = titulo(op, i, album, posicoes[i], largura, false)
    return {
      css: t.css,
      defs: t.defs,
      elementos:
        `<g transform="translate(${posicoes[i]} 68)"><g transform="translate(32 0)">${vinil(p, i, true)}</g>${capaComReflexo(p, i)}</g>` +
        t.elementos,
    }
  })
  const corpo = juntar(partes)
  return { css: CSS_GIRO + corpo.css, defs: corpo.defs, elementos: `<ellipse cx="200" cy="116" rx="120" ry="9" fill="url(#${p}piso)"/>` + corpo.elementos }
}

function vazio(mensagem: string): Parte {
  const discos = [110, 200, 290].map((x) => `<g transform="translate(${x} 70)">${vinil('', -1, false)}</g>`).join('')
  return {
    css: '',
    defs: '',
    elementos:
      `<g opacity=".35">${discos}</g>` +
      `<text x="200" y="136" text-anchor="middle" font-size="12" fill="#ffffff" fill-opacity=".8" font-family="${FONTE}">${escaparXml(mensagem)}</text>`,
  }
}

/** Corpo da vitrine no espaço de 400×150 (sem fundo nem cabeçalho), pronto para outro SVG. */
export function corpoVitrine(albuns: Album[], capas: (string | null)[], op: OpcoesVitrine): Parte & { tipo: TipoVitrine } {
  const lista = albuns.slice(0, 3)
  const tipo: TipoVitrine = lista.length === 3 ? 'carrossel' : lista.length > 0 ? 'estatico' : 'vazio'
  const corpo = tipo === 'carrossel' ? carrossel(lista, op) : tipo === 'estatico' ? estatico(lista, op) : vazio(op.mensagemVazia)
  const imagens = lista.map((_, i) => defImagem(op.prefixo, i, capas[i] ?? null)).join('')
  return { tipo, css: corpo.css, defs: defsFixos(op.prefixo) + imagens + corpo.defs, elementos: corpo.elementos }
}

export function renderizarVitrine(
  albuns: Album[],
  capas: (string | null)[],
  agora: Date,
  idioma: Idioma = 'en',
): string {
  const t = TEXTOS[idioma]
  const lista = albuns.slice(0, 3)
  const corpo = corpoVitrine(lista, capas, { prefixo: '', fundo: FUNDO, fonteTitulo: [11, 9], indicador: true, mensagemVazia: t.vitrineVazia })
  const rotulo =
    corpo.tipo === 'vazio' ? t.vitrineVazia : t.rotuloVitrine(lista.map((a) => `${a.nome} — ${a.artistas}`).join('; '))
  const cabecalho = `${t.vitrineTitulo} · ${t.meses[agora.getUTCMonth()]}`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150" class="${corpo.tipo}" role="img" aria-label="${escaparXml(rotulo)}">`,
    `<title>${escaparXml(rotulo)}</title>`,
    `<style>${corpo.css}</style>`,
    `<defs>${corpo.defs}</defs>`,
    `<rect width="400" height="150" rx="10" fill="${FUNDO}"/>`,
    `<text x="16" y="22" font-size="10" letter-spacing="1.5" fill="#9be9a8" font-family="${FONTE}">${escaparXml(cabecalho)}</text>`,
    corpo.elementos,
    '</svg>',
  ].join('')
}
