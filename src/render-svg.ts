import { ajustarTexto, escaparXml, tempoDecorrido, type AjusteTexto } from './texto.js'
import type { Estado } from './tipos.js'

const FUNDO = '#0e4429'
const X_TEXTO = 178
const LARGURA_TEXTO = 266
const FONTE = "'Segoe UI', Helvetica, Arial, sans-serif"
const CORES_EQ = ['#9be9a8', '#40c463', '#39d353']
const ATRASOS_EQ = [
  [0.1, 0.3, 0],
  [0.6, 0.2, 0.5],
  [0.4, 0.8, 0.1],
  [0.9, 0.4, 0.7],
  [0.2, 0.6, 0.3],
]

interface LinhaTexto {
  defs: string
  css: string
  elemento: string
}

function linha(
  id: string,
  texto: string,
  aj: AjusteTexto,
  y: number,
  atributos: string,
): LinhaTexto {
  const conteudo = escaparXml(texto)
  if (aj.rolagem === 0) {
    return {
      defs: '',
      css: '',
      elemento: `<text x="${X_TEXTO}" y="${y}" font-size="${aj.fontSize}" ${atributos}>${conteudo}</text>`,
    }
  }
  const altura = aj.fontSize * 1.6
  return {
    defs: `<clipPath id="recorte-${id}"><rect x="${X_TEXTO}" y="${y - aj.fontSize * 1.2}" width="${LARGURA_TEXTO}" height="${altura}"/></clipPath>`,
    css:
      `@keyframes rolar-${id}{0%,15%{transform:translateX(0)}70%,85%{transform:translateX(-${aj.rolagem}px)}100%{transform:translateX(0)}}` +
      `.rolar-${id}{animation:rolar-${id} 9s ease-in-out infinite}`,
    elemento: `<g clip-path="url(#recorte-${id})"><text class="rolar-${id}" x="${X_TEXTO}" y="${y}" font-size="${aj.fontSize}" ${atributos}>${conteudo}</text></g>`,
  }
}

function equalizador(): string {
  const quadrados: string[] = []
  ATRASOS_EQ.forEach((coluna, c) =>
    coluna.forEach((atraso, l) => {
      quadrados.push(
        `<rect x="${c * 10}" y="${l * 10}" width="8" height="8" rx="2" fill="${CORES_EQ[l]}" style="animation-delay:${atraso}s"/>`,
      )
    }),
  )
  return `<g class="eq" transform="translate(${X_TEXTO} 108)">${quadrados.join('')}</g>`
}

export function renderizarCard(estado: Estado, capa: string | null, agora: Date): string {
  const tocando = estado.tipo === 'tocando'
  const titulo = estado.tipo === 'vazio' ? 'Nada tocando por aqui' : estado.musica.nome
  const subtitulo = estado.tipo === 'vazio' ? '' : `${estado.musica.artistas} · ${estado.musica.album}`
  const selo = estado.tipo === 'tocando' ? 'TOCANDO AGORA' : estado.tipo === 'ultima' ? 'ÚLTIMA OUVIDA' : ''
  const rodape =
    estado.tipo === 'ultima' && estado.tocadaEm
      ? `${tempoDecorrido(estado.tocadaEm, agora)} no Spotify`
      : 'no Spotify'
  const rotulo =
    estado.tipo === 'vazio'
      ? 'Nada tocando no Spotify'
      : `${selo === 'TOCANDO AGORA' ? 'Tocando agora' : 'Última ouvida'}: ${estado.musica.nome} — ${estado.musica.artistas}`

  const linhaTitulo = linha('titulo', titulo, ajustarTexto(titulo, LARGURA_TEXTO, 20, 16), 72,
    `fill="#ffffff" font-weight="500" font-family="${FONTE}"`)
  const linhaSub = linha('sub', subtitulo, ajustarTexto(subtitulo, LARGURA_TEXTO, 13, 11), 95,
    `fill="#ffffff" fill-opacity=".75" font-family="${FONTE}"`)

  const centro =
    capa && estado.tipo !== 'vazio'
      ? `<image href="${capa}" x="53" y="50" width="50" height="50" clip-path="url(#recorte-capa)" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="78" cy="75" r="25" fill="#39d353"/>`

  const css =
    '@keyframes girar{to{transform:rotate(360deg)}}' +
    '@keyframes acender{0%,100%{opacity:.2}50%{opacity:1}}' +
    '.eq rect{opacity:.2}' +
    '.tocando .disco{animation:girar 4s linear infinite;transform-origin:78px 75px}' +
    '.tocando .eq rect{animation:acender 1.1s ease-in-out infinite}' +
    linhaTitulo.css +
    linhaSub.css

  const braco = `<g${tocando ? '' : ' transform="rotate(-38 156 20)"'}>` +
    '<circle cx="156" cy="20" r="7" fill="#d0d7de"/>' +
    '<path d="M 156 20 L 146 46 L 126 62" fill="none" stroke="#d0d7de" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="119" y="58" width="11" height="7" rx="1.5" fill="#ffffff" transform="rotate(-38 124 61)"/>' +
    '</g>'

  const logoSpotify =
    '<g transform="translate(240 122)"><circle cx="7" cy="7" r="7" fill="#ffffff"/>' +
    `<path d="M 3.2 5.3 Q 7.5 3.8 11 5.8 M 3.8 7.6 Q 7.3 6.6 10.2 8.1 M 4.3 9.7 Q 7 9 9.4 10.1" stroke="${FUNDO}" stroke-width="1.3" stroke-linecap="round" fill="none"/></g>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="150" viewBox="0 0 460 150" class="${estado.tipo}" role="img" aria-label="${escaparXml(rotulo)}">`,
    `<title>${escaparXml(rotulo)}</title>`,
    `<style>${css}</style>`,
    `<defs><clipPath id="recorte-capa"><circle cx="78" cy="75" r="25"/></clipPath>${linhaTitulo.defs}${linhaSub.defs}</defs>`,
    `<rect width="460" height="150" rx="10" fill="${FUNDO}"/>`,
    '<g class="disco">',
    '<circle cx="78" cy="75" r="60" fill="#010409"/>',
    '<circle cx="78" cy="75" r="54" fill="none" stroke="#21262d"/>',
    '<circle cx="78" cy="75" r="46" fill="none" stroke="#161b22"/>',
    '<circle cx="78" cy="75" r="38" fill="none" stroke="#21262d"/>',
    '<path d="M 38 40 A 54 54 0 0 1 70 22" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="3"/>',
    centro,
    '<circle cx="78" cy="75" r="25" fill="none" stroke="#39d353" stroke-width="1.5"/>',
    '<circle cx="78" cy="75" r="2.5" fill="#010409"/>',
    '</g>',
    braco,
    selo
      ? `<text x="${X_TEXTO}" y="44" font-size="11" letter-spacing="1.5" fill="#9be9a8" font-family="${FONTE}">${selo}</text>`
      : '',
    linhaTitulo.elemento,
    linhaSub.elemento,
    equalizador(),
    logoSpotify,
    `<text x="260" y="133" font-size="11" fill="#ffffff" fill-opacity=".8" font-family="${FONTE}">${escaparXml(rodape)}</text>`,
    '</svg>',
  ].join('')
}
