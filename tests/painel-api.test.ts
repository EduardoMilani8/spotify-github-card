import { XMLValidator } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { GET } from '../api/painel.js'

const pedir = (query: string) => GET(new Request(`https://exemplo.dev/api/painel${query}`))

describe('GET /api/painel', () => {
  it('mock playing: 200, SVG e sem cache', async () => {
    const r = await pedir('?mock=playing')
    expect(r.status).toBe(200)
    expect(r.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
    expect(r.headers.get('Cache-Control')).toBe('no-cache, no-store, max-age=0')
    expect(r.headers.get('CDN-Cache-Control')).toBeNull()
    const svg = await r.text()
    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toContain('class="tocando"')
    expect(svg).toContain('top-4-filmes')
  })

  it('mock paused e last', async () => {
    expect(await (await pedir('?mock=paused')).text()).toContain('class="pausada"')
    expect(await (await pedir('?mock=last')).text()).toContain('class="ultima"')
  })

  it('mock empty: todos os quadros vazios', async () => {
    const svg = await (await pedir('?mock=empty')).text()
    expect(svg).toContain('class="vazio"')
    expect(svg).toContain('vitrine em breve')
    expect(svg).toContain('nenhuma review por aqui ainda')
  })

  it('?parte=musica e ?parte=filmes devolvem cada metade', async () => {
    expect(await (await pedir('?mock=playing&parte=musica')).text()).toContain('viewBox="19 43.5 802 150"')
    expect(await (await pedir('?mock=playing&parte=filmes')).text()).toContain('viewBox="19 193.5 802 150"')
    expect(await (await pedir('?mock=playing&parte=xyz')).text()).toContain('viewBox="19 43.5 802 300"')
  })
})
