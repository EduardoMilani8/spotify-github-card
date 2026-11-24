import { describe, expect, it } from 'vitest'
import { GET } from '../api/showcase.js'

const chamar = (query: string) => GET(new Request(`https://x.vercel.app/api/showcase?${query}`))

describe('GET /api/showcase', () => {
  it('mock showcase: 200, SVG e cabeçalhos de cache', async () => {
    const resposta = await chamar('mock=showcase')
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
    expect(resposta.headers.get('Cache-Control')).toBe('no-cache, no-store, max-age=0')
    expect(resposta.headers.get('CDN-Cache-Control')).toBe('max-age=3600, stale-while-revalidate=86400')
    expect(await resposta.text()).toContain('class="carrossel"')
  })
  it('mock empty: vazio', async () => {
    expect(await (await chamar('mock=empty')).text()).toContain('class="vazio"')
  })
  it('lang=pt', async () => {
    expect(await (await chamar('mock=showcase&lang=pt')).text()).toContain('EM EXPOSIÇÃO')
  })
})
