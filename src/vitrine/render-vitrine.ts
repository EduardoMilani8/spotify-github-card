import { TEXTOS, type Idioma } from '../idioma.js'
import { ajustarTexto, escaparXml } from '../texto.js'
import type { Album } from './tipos.js'

const FUNDO = '#0e4429'
const FONTE = "'Segoe UI', Helvetica, Arial, sans-serif"
/** Atraso de cada álbum no ciclo de 12s: o 1º começa na frente, o 2º à direita, o 3º à esquerda. */
const ATRASOS = ['0s', '-8s', '-4s']

interface Parte {
  css: string
  defs: string
  elementos: string
}

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
  '.alb{animation:orbita 12s infinite;animation-delay:var(--d)}' +
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

const DEFS_FIXOS =
  '<linearGradient id="desvanece" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".3"/><stop offset=".7" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
  '<mask id="reflexo"><rect x="-44" y="44" width="88" height="30" fill="url(#desvanece)"/></mask>' +
  '<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#39d353" stop-opacity=".35"/><stop offset="1" stop-color="#39d353" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="piso" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#010409" stop-opacity=".55"/><stop offset="1" stop-color="#010409" stop-opacity="0"/></radialGradient>' +
  '<clipPath id="recorte-capa"><rect x="-42" y="-42" width="84" height="84" rx="3"/></clipPath>' +
  '<clipPath id="selo"><circle r="42"/></clipPath>'

/** Imagem da capa (ou fallback verde) definida uma vez; capa, reflexo e selo usam <use>. */
function defImagem(i: number, capa: string | null): string {
  const conteudo = capa
    ? `<image href="${capa}" x="-42" y="-42" width="84" height="84" preserveAspectRatio="xMidYMid slice"/>`
    : '<rect x="-42" y="-42" width="84" height="84" fill="#006d32"/><circle r="14" fill="#39d353"/>'
  return `<g id="img-${i}">${conteudo}</g>`
}

function vinil(i: number, girando: boolean): string {
  const selo = i >= 0 ? `<g transform="scale(.2857)"><use href="#img-${i}" clip-path="url(#selo)"/></g>` : '<circle r="12" fill="#39d353"/>'
  return (
    `<g${girando ? ' class="giro"' : ''}>` +
    '<circle r="40" fill="#010409"/><circle r="34" fill="none" stroke="#21262d"/><circle r="27" fill="none" stroke="#161b22"/>' +
    '<path d="M -28 -24 A 36 36 0 0 1 -6 -35" stroke="#ffffff" stroke-opacity=".2" stroke-width="3" fill="none"/>' +
    selo +
    '<circle r="12" fill="none" stroke="#39d353" stroke-width="1"/><circle r="1.8" fill="#010409"/></g>'
  )
}

const capaComReflexo = (i: number): string =>
  `<g mask="url(#reflexo)"><g transform="translate(0 86) scale(1 -1)"><use href="#img-${i}" clip-path="url(#recorte-capa)"/></g></g>` +
  `<use href="#img-${i}" clip-path="url(#recorte-capa)"/>`

/** Título "Álbum · Artistas" centrado em x; encolhe de 11 a 9px e depois rola. */
function titulo(i: number, album: Album, x: number, larguraMax: number, sincronizado: boolean): Parte {
  const id = `v${i}`
  const aj = ajustarTexto(`${album.nome} · ${album.artistas}`, larguraMax, 11, 9)
  const conteudo = `${escaparXml(album.nome)} <tspan fill-opacity=".65">· ${escaparXml(album.artistas)}</tspan>`
  const atributos = `y="138" font-size="${aj.fontSize}" fill="#ffffff" font-family="${FONTE}"`
  if (aj.rolagem === 0) {
    return { css: '', defs: '', elementos: `<text x="${x}" text-anchor="middle" ${atributos}>${conteudo}</text>` }
  }
  const esquerda = x - larguraMax / 2
  // No carrossel o título só aparece ~3s: a rolagem acompanha o ciclo de 12s do álbum.
  const css = sincronizado
    ? `@keyframes rolar-${id}{0%,6%{transform:translateX(0)}20%,100%{transform:translateX(-${aj.rolagem}px)}}` +
      `.rolar-${id}{animation:rolar-${id} 12s ease-in-out infinite;animation-delay:var(--d)}`
    : `@keyframes rolar-${id}{0%,15%{transform:translateX(0)}70%,85%{transform:translateX(-${aj.rolagem}px)}100%{transform:translateX(0)}}` +
      `.rolar-${id}{animation:rolar-${id} 9s ease-in-out infinite}`
  return {
    css,
    defs: `<clipPath id="recorte-${id}"><rect x="${esquerda}" y="${138 - aj.fontSize * 1.2}" width="${larguraMax}" height="${aj.fontSize * 1.6}"/></clipPath>`,
    elementos: `<g clip-path="url(#recorte-${id})"><text class="rolar-${id}" x="${esquerda}" ${atributos}>${conteudo}</text></g>`,
  }
}

function carrossel(albuns: Album[]): Parte {
  const discos = albuns.map((_, i) => ({
    css: '',
    defs: '',
    elementos:
      `<g class="alb" style="--d:${ATRASOS[i]}">` +
      `<g class="vinil">${vinil(i, true)}</g>` +
      capaComReflexo(i) +
      '<rect class="sombra" x="-44" y="-44" width="88" height="120" fill="#0e4429"/></g>',
  }))
  const titulos = albuns.map((album, i) => {
    const t = titulo(i, album, 200, 360, true)
    return { ...t, elementos: `<g class="tit" style="--d:${ATRASOS[i]}">${t.elementos}</g>` }
  })
  const indicador =
    '<g transform="translate(350 14)">' +
    ATRASOS.map((d, i) => `<rect class="pt" x="${i * 11}" width="8" height="8" rx="2" style="--d:${d}"/>`).join('') +
    '</g>'
  const fundo =
    '<ellipse class="brilho" cx="200" cy="70" rx="95" ry="55" fill="url(#glow)"/>' +
    '<ellipse cx="200" cy="116" rx="120" ry="9" fill="url(#piso)"/>'
  const corpo = juntar([...discos, ...titulos])
  return { css: CSS_GIRO + CSS_CARROSSEL + corpo.css, defs: corpo.defs, elementos: fundo + indicador + corpo.elementos }
}

/** 1 ou 2 álbuns: parados, centralizados, com o vinil para fora girando. */
function estatico(albuns: Album[]): Parte {
  const posicoes = albuns.length === 1 ? [184] : [105, 265]
  const largura = albuns.length === 1 ? 360 : 150
  const partes = albuns.map((album, i) => {
    const t = titulo(i, album, posicoes[i], largura, false)
    return {
      css: t.css,
      defs: t.defs,
      elementos:
        `<g transform="translate(${posicoes[i]} 68)"><g transform="translate(32 0)">${vinil(i, true)}</g>${capaComReflexo(i)}</g>` +
        t.elementos,
    }
  })
  const corpo = juntar(partes)
  return { css: CSS_GIRO + corpo.css, defs: corpo.defs, elementos: '<ellipse cx="200" cy="116" rx="120" ry="9" fill="url(#piso)"/>' + corpo.elementos }
}

function vazio(mensagem: string): Parte {
  const discos = [110, 200, 290].map((x) => `<g transform="translate(${x} 70)">${vinil(-1, false)}</g>`).join('')
  return {
    css: '',
    defs: '',
    elementos:
      `<g opacity=".35">${discos}</g>` +
      `<text x="200" y="136" text-anchor="middle" font-size="12" fill="#ffffff" fill-opacity=".8" font-family="${FONTE}">${escaparXml(mensagem)}</text>`,
  }
}

export function renderizarVitrine(
  albuns: Album[],
  capas: (string | null)[],
  agora: Date,
  idioma: Idioma = 'en',
): string {
  const t = TEXTOS[idioma]
  const lista = albuns.slice(0, 3)
  const tipo = lista.length === 3 ? 'carrossel' : lista.length > 0 ? 'estatico' : 'vazio'
  const corpo = tipo === 'carrossel' ? carrossel(lista) : tipo === 'estatico' ? estatico(lista) : vazio(t.vitrineVazia)
  const rotulo =
    tipo === 'vazio' ? t.vitrineVazia : t.rotuloVitrine(lista.map((a) => `${a.nome} — ${a.artistas}`).join('; '))
  const cabecalho = `${t.vitrineTitulo} · ${t.meses[agora.getUTCMonth()]}`
  const imagens = lista.map((_, i) => defImagem(i, capas[i] ?? null)).join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150" class="${tipo}" role="img" aria-label="${escaparXml(rotulo)}">`,
    `<title>${escaparXml(rotulo)}</title>`,
    `<style>${corpo.css}</style>`,
    `<defs>${DEFS_FIXOS}${imagens}${corpo.defs}</defs>`,
    `<rect width="400" height="150" rx="10" fill="${FUNDO}"/>`,
    `<text x="16" y="22" font-size="10" letter-spacing="1.5" fill="#9be9a8" font-family="${FONTE}">${escaparXml(cabecalho)}</text>`,
    corpo.elementos,
    '</svg>',
  ].join('')
}
