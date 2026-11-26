import { TEXTOS } from '../idioma.js'
import { bracoElementos, discoElementos } from '../render-svg.js'
import { ajustarTexto, escaparXml, larguraEstimada, tempoDecorrido } from '../texto.js'
import type { Estado } from '../tipos.js'
import { ATRASOS, corpoVitrine, pontosIndicador } from '../vitrine/render-vitrine.js'
import { dataCurta, estrelas } from './letterboxd.js'
import { quebrarLinhas } from './quebrar-texto.js'
import type { DadosPainel, Filme, Review } from './tipos.js'

// Cores e fonte do Primer (GitHub, tema escuro).
const FUNDO = '#0d1117'
const BORDA = '#30363d'
const LINK = '#4493f8'
const TEXTO = '#e6edf3'
const SECUNDARIO = '#8b949e'
const VERDE = '#3fb950'
const CINZA = '#6e7681'
const FONTE = "-apple-system,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif"

/** Atraso de cada filme no ciclo de 12s do top 4 (3s em destaque cada). */
const ATRASOS_TOP4 = ['0s', '-9s', '-6s', '-3s']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

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

const quadro = (x: number, y: number): string =>
  `<rect x="${x}" y="${y}" width="392" height="140" rx="6" fill="none" stroke="${BORDA}"/>`

const nomeQuadro = (x: number, y: number, texto: string): string =>
  `<text x="${x}" y="${y}" font-size="14" fill="${LINK}" font-weight="600">${escaparXml(texto)}</text>`

/** Uma linha só: corta com "…" se não couber. */
const umaLinha = (texto: string, largura: number, fontSize: number): string =>
  quebrarLinhas(texto, largura, fontSize, 1)[0] ?? ''

/** Encolhe a fonte até caber; só corta com "…" se nem no mínimo couber. */
function textoQueCabe(texto: string, x: number, y: number, largura: number, fonte: [number, number], atributos: string): string {
  const aj = ajustarTexto(texto, largura, fonte[0], fonte[1])
  const conteudo = aj.rolagem === 0 ? texto : umaLinha(texto, largura, aj.fontSize)
  return `<text x="${x}" y="${y}" font-size="${aj.fontSize}" ${atributos}>${escaparXml(conteudo)}</text>`
}

const bolinhasLetterboxd = (x: number, y: number): string =>
  `<circle cx="${x}" cy="${y}" r="4" fill="#ff8000"/><circle cx="${x + 9}" cy="${y}" r="4" fill="#00e054"/><circle cx="${x + 18}" cy="${y}" r="4" fill="#40bcf4"/>`

/** Texto que encolhe até o mínimo e depois rola dentro de um recorte (como no card do vinil). */
function linhaRolante(id: string, texto: string, x: number, y: number, largura: number, fonte: [number, number], atributos: string): Parte {
  const aj = ajustarTexto(texto, largura, fonte[0], fonte[1])
  const conteudo = escaparXml(texto)
  if (aj.rolagem === 0) return { css: '', defs: '', elementos: `<text x="${x}" y="${y}" font-size="${aj.fontSize}" ${atributos}>${conteudo}</text>` }
  return {
    css:
      `@keyframes ${id}{0%,15%{transform:translateX(0)}70%,85%{transform:translateX(-${aj.rolagem}px)}100%{transform:translateX(0)}}` +
      `.${id}{animation:${id} 9s ease-in-out infinite}`,
    defs: `<clipPath id="${id}-recorte"><rect x="${x}" y="${y - aj.fontSize * 1.2}" width="${largura}" height="${aj.fontSize * 1.6}"/></clipPath>`,
    elementos: `<g clip-path="url(#${id}-recorte)"><text class="${id}" x="${x}" y="${y}" font-size="${aj.fontSize}" ${atributos}>${conteudo}</text></g>`,
  }
}

const CSS_MUSICA =
  '.disco{transform-box:fill-box;transform-origin:center}' +
  '.tocando .disco{animation:m-girar 4s linear infinite}' +
  '.tocando .braco{animation:m-braco 2.6s ease-in-out infinite;transform-origin:156px 20px}' +
  '.m-anel{animation:m-anel 1.8s ease-out infinite;transform-box:fill-box;transform-origin:center}' +
  '@keyframes m-girar{to{transform:rotate(360deg)}}' +
  '@keyframes m-braco{0%,100%{transform:rotate(0deg)}50%{transform:rotate(1.2deg)}}' +
  '@keyframes m-anel{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(2.6)}}'

function rodapeMusica(estado: Estado, agora: Date): string {
  switch (estado.tipo) {
    case 'tocando':
      return 'ao vivo no Spotify'
    case 'pausada':
      return 'pausado no Spotify'
    case 'ultima':
      return estado.tocadaEm ? `tocada ${tempoDecorrido(estado.tocadaEm, agora, 'pt')} no Spotify` : 'última tocada no Spotify'
    case 'vazio':
      return 'nada tocando agora'
  }
}

function quadroMusica(estado: Estado, capa: string | null, agora: Date): Parte {
  const tocando = estado.tipo === 'tocando'
  const centro =
    capa && estado.tipo !== 'vazio'
      ? `<image href="${capa}" x="53" y="50" width="50" height="50" clip-path="url(#m-capa)" preserveAspectRatio="xMidYMid slice"/>`
      : '<circle cx="78" cy="75" r="25" fill="#39d353"/>'
  const braco = `<g class="braco"${tocando ? '' : ' transform="rotate(-38 156 20)"'}>${bracoElementos()}</g>`
  const nome = estado.tipo === 'vazio' ? TEXTOS.pt.vazio : estado.musica.nome
  const artistas = estado.tipo === 'vazio' ? '' : estado.musica.artistas
  const linhaNome = linhaRolante('m-nome', nome, 178, 104, 220, [18, 14], `fill="${TEXTO}" font-weight="600"`)
  const linhaArtistas = linhaRolante('m-artistas', artistas, 178, 125, 220, [13, 11], `fill="${SECUNDARIO}"`)
  const bolinha =
    (tocando ? `<circle class="m-anel" cx="184" cy="152" r="5" fill="none" stroke="${VERDE}" stroke-width="2"/>` : '') +
    `<circle cx="184" cy="152" r="5" fill="${tocando ? VERDE : CINZA}"/>`
  return {
    css: CSS_MUSICA + linhaNome.css + linhaArtistas.css,
    defs: '<clipPath id="m-capa"><circle cx="78" cy="75" r="25"/></clipPath>' + linhaNome.defs + linhaArtistas.defs,
    elementos:
      quadro(20.5, 48.5) +
      `<g transform="translate(92 120) scale(.84) translate(-78 -75)"><g class="disco">${discoElementos(centro)}</g>${braco}</g>` +
      nomeQuadro(178, 74, 'tocando-agora') +
      linhaNome.elementos +
      linhaArtistas.elementos +
      bolinha +
      `<text x="196" y="156" font-size="12" fill="${SECUNDARIO}">${escaparXml(rodapeMusica(estado, agora))}</text>`,
  }
}

function quadroAlbuns(d: DadosPainel, agora: Date): Parte {
  const corpo = corpoVitrine(d.albuns, d.capasAlbuns, {
    prefixo: 'a-',
    fundo: FUNDO,
    fonteTitulo: [15, 12],
    indicador: false,
    mensagemVazia: 'vitrine em breve',
  })
  const indicador = corpo.tipo === 'carrossel' ? `<g transform="translate(775 64)">${pontosIndicador()}</g>` : ''
  const larguraNome = larguraEstimada('albuns-do-mes', 14)
  return {
    css: corpo.css,
    defs: corpo.defs,
    elementos:
      quadro(427.5, 48.5) +
      nomeQuadro(443, 74, 'albuns-do-mes') +
      `<text x="${Math.ceil(443 + larguraNome + 8)}" y="74" font-size="12" fill="${SECUNDARIO}">${MESES[agora.getUTCMonth()]}</text>` +
      `<g transform="translate(479.5 72) scale(.72)">${corpo.elementos}</g>` +
      indicador,
  }
}

function quadroReview(review: Review | null, poster: string | null): Parte {
  if (!review) {
    return {
      css: '',
      defs: '',
      elementos:
        quadro(20.5, 198.5) +
        nomeQuadro(36, 224, 'ultima-review') +
        `<text x="36" y="268" font-size="14" fill="${SECUNDARIO}">nenhuma review por aqui ainda</text>` +
        bolinhasLetterboxd(42, 318) +
        `<text x="72" y="322" font-size="12" fill="${SECUNDARIO}">Letterboxd</text>`,
    }
  }
  const nome = umaLinha(review.filme, 220, 14)
  const notaTexto = estrelas(review.nota)
  const xEstrelas = Math.ceil(36 + larguraEstimada(nome, 14) + 10)
  const linhas = quebrarLinhas(review.trecho, 280, 14, 2)
  linhas[0] = `“${linhas[0]}`
  linhas[linhas.length - 1] += '”'
  const data = dataCurta(review.assistidoEm)
  const posterEl = poster
    ? `<image href="${poster}" x="340.5" y="214.5" width="56" height="84" clip-path="url(#r-poster)" preserveAspectRatio="xMidYMid slice"/>`
    : '<rect x="340.5" y="214.5" width="56" height="84" rx="4" fill="#161b22"/>'
  return {
    css: '',
    defs: '<clipPath id="r-poster"><rect x="340.5" y="214.5" width="56" height="84" rx="4"/></clipPath>',
    elementos:
      quadro(20.5, 198.5) +
      nomeQuadro(36, 224, nome) +
      (notaTexto ? `<text x="${xEstrelas}" y="225" font-size="14" fill="#e3b341" letter-spacing="1">${notaTexto}</text>` : '') +
      linhas.map((l, i) => `<text class="r-trecho" x="36" y="${258 + i * 21}" font-size="14" fill="#c9d1d9">${escaparXml(l)}</text>`).join('') +
      posterEl +
      `<rect x="340.5" y="214.5" width="56" height="84" rx="4" fill="none" stroke="${BORDA}"/>` +
      bolinhasLetterboxd(42, 318) +
      `<text x="72" y="322" font-size="12" fill="${SECUNDARIO}">${data ? `review de ${data} no Letterboxd` : 'review no Letterboxd'}</text>`,
  }
}

const CSS_TOP4 =
  '.filme{opacity:.35;animation:t-filme 12s cubic-bezier(.3,.7,.3,1) infinite;animation-delay:var(--d);transform-box:fill-box;transform-origin:50% 100%}' +
  '.filme .borda{stroke:#30363d;animation:t-borda 12s infinite;animation-delay:var(--d)}' +
  '.filme-nome{opacity:0;animation:t-nome 12s ease-out infinite;animation-delay:var(--d)}' +
  '@keyframes t-filme{0%{opacity:.35;transform:translateY(0) scale(1)}3%,22%{opacity:1;transform:translateY(-6px) scale(1.08)}25%,100%{opacity:.35;transform:translateY(0) scale(1)}}' +
  '@keyframes t-borda{0%{stroke:#30363d}3%,22%{stroke:#3fb950}25%,100%{stroke:#30363d}}' +
  '@keyframes t-nome{0%{opacity:0;transform:translateX(-8px)}3%,22%{opacity:1;transform:translateX(0)}25%,100%{opacity:0;transform:translateX(6px)}}'

function quadroTop4(filmes: Filme[], posters: (string | null)[]): Parte {
  const lista = filmes.slice(0, 4)
  const defs = lista
    .map((_, i) => `<clipPath id="t-poster-${i}"><rect x="${628 + i * 48}" y="236" width="40" height="60" rx="3"/></clipPath>`)
    .join('')
  const capas = lista
    .map((_, i) => {
      const x = 628 + i * 48
      const img = posters[i]
        ? `<image href="${posters[i]}" x="${x}" y="236" width="40" height="60" clip-path="url(#t-poster-${i})" preserveAspectRatio="xMidYMid slice"/>`
        : `<rect x="${x}" y="236" width="40" height="60" rx="3" fill="#161b22"/>`
      return `<g class="filme${i === 0 ? ' primeiro' : ''}" style="--d:${ATRASOS_TOP4[i]}">${img}<rect class="borda" x="${x}" y="236" width="40" height="60" rx="3" fill="none" stroke-width="2"/></g>`
    })
    .join('')
  const nomes = lista
    .map(
      (f, i) =>
        `<g class="filme-nome${i === 0 ? ' primeiro' : ''}" style="--d:${ATRASOS_TOP4[i]}">` +
        textoQueCabe(f.titulo, 443, 266, 178, [14, 11], `fill="${TEXTO}" font-weight="600"`) +
        textoQueCabe(`${f.ano} · ${f.direcao}`, 443, 285, 178, [12, 10], `fill="${SECUNDARIO}"`) +
        '</g>',
    )
    .join('')
  return {
    css: CSS_TOP4,
    defs,
    elementos:
      quadro(427.5, 198.5) +
      nomeQuadro(443, 224, 'top-4-filmes') +
      capas +
      nomes +
      bolinhasLetterboxd(449, 318) +
      `<text x="479" y="322" font-size="12" fill="${SECUNDARIO}">favoritos no Letterboxd</text>`,
  }
}

/** Sem animação: tudo congela onde está (os atrasos negativos já deixam cada item no lugar) e o 1º título aparece. */
const CSS_SEM_MOVIMENTO =
  '@media (prefers-reduced-motion: reduce){*{animation-play-state:paused!important}.primeiro{opacity:1!important;transform:none!important}}'

/** Qual pedaço do painel desenhar: tudo, só a linha de cima (música) ou só a de baixo (filmes). */
export type PartePainel = 'completo' | 'musica' | 'filmes'

/**
 * Recorte de cada parte: a janela do viewBox em volta dos quadros (x 20.5–819.5; linhas em y 48.5 e 198.5),
 * com margem mínima dos lados para os quadros ocuparem a imagem toda. O GitHub só aceita um link por
 * imagem, então o painel pode ser dividido em duas metades que se encaixam.
 */
const RECORTES: Record<PartePainel, { x: number; y: number; largura: number; altura: number }> = {
  completo: { x: 19, y: 43.5, largura: 802, altura: 300 },
  musica: { x: 19, y: 43.5, largura: 802, altura: 150 },
  filmes: { x: 19, y: 193.5, largura: 802, altura: 150 },
}

export function lerParte(valor: string | null | undefined): PartePainel {
  return valor === 'musica' || valor === 'filmes' ? valor : 'completo'
}

function rotulo(d: DadosPainel, parte: PartePainel): string {
  const musica = d.estado.tipo === 'vazio' ? 'nada tocando no Spotify' : `${d.estado.musica.nome} — ${d.estado.musica.artistas}`
  const review = d.review ? `última review: ${d.review.filme}` : 'filmes favoritos'
  if (parte === 'musica') return `Música do Eduardo: ${musica}`
  if (parte === 'filmes') return `Filmes do Eduardo: ${review}`
  return `Música e filmes do Eduardo: ${musica}${d.review ? `; ${review}` : ''}`
}

export function renderizarPainel(d: DadosPainel, agora: Date, parte: PartePainel = 'completo'): string {
  const comMusica = parte !== 'filmes'
  const comFilmes = parte !== 'musica'
  const partes = juntar([
    ...(comMusica ? [quadroMusica(d.estado, d.capa, agora), quadroAlbuns(d, agora)] : []),
    ...(comFilmes ? [quadroReview(d.review, d.posterReview), quadroTop4(d.top4, d.postersTop4)] : []),
  ])
  // O 1º título do carrossel também aparece quando não há movimento.
  const elementos = partes.elementos.replace(`<g class="tit" style="--d:${ATRASOS[0]}">`, `<g class="tit primeiro" style="--d:${ATRASOS[0]}">`)
  const texto = escaparXml(rotulo(d, parte))
  const { x, y, largura, altura } = RECORTES[parte]
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="${x} ${y} ${largura} ${altura}" class="${d.estado.tipo}" role="img" aria-label="${texto}" font-family="${FONTE}">`,
    `<title>${texto}</title>`,
    `<style>${partes.css}${CSS_SEM_MOVIMENTO}</style>`,
    `<defs>${partes.defs}</defs>`,
    // Só o fundo, sem borda: no README o painel fica dentro da moldura do próprio GitHub.
    `<rect x="${x}" y="${y}" width="${largura}" height="${altura}" rx="6" fill="${FUNDO}"/>`,
    elementos,
    '</svg>',
  ].join('')
}
