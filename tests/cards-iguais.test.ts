import { describe, expect, it } from 'vitest'
import { albunsMock, estadoMock } from '../src/mocks.js'
import { renderizarCard } from '../src/render-svg.js'
import { renderizarVitrine } from '../src/vitrine/render-vitrine.js'

// Garante que a extração das peças (disco e carrossel) para o painel não muda os cards atuais.
const AGORA = new Date('2026-11-24T12:00:00Z')
const CAPA = 'data:image/jpeg;base64,AAAA'

describe('cards atuais continuam iguais', () => {
  for (const nome of ['playing', 'paused', 'last', 'empty', 'long']) {
    for (const idioma of ['en', 'pt'] as const) {
      it(`card ${nome} ${idioma}`, async () => {
        const svg = renderizarCard(estadoMock(nome, AGORA)!, CAPA, AGORA, idioma)
        await expect(svg).toMatchFileSnapshot(`./__snapshots__/card-${nome}-${idioma}.svg`)
      })
    }
  }

  const longo = { id: 'x', nome: 'Um Nome de Álbum Realmente Muito Comprido Mesmo', artistas: 'Artista Um, Artista Dois, Artista Três', capaUrl: null }
  const casos = {
    tres: albunsMock('showcase')!,
    dois: albunsMock('showcase')!.slice(0, 2),
    um: [longo],
    zero: [],
    'tres-longo': [longo, ...albunsMock('showcase')!.slice(1)],
  }
  for (const [nome, albuns] of Object.entries(casos)) {
    it(`vitrine ${nome}`, async () => {
      const svg = renderizarVitrine(albuns, albuns.map((_, i) => (i === 0 ? CAPA : null)), AGORA, 'pt')
      await expect(svg).toMatchFileSnapshot(`./__snapshots__/vitrine-${nome}.svg`)
    })
  }
})
