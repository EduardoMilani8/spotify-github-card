import { describe, expect, it } from 'vitest'
import { GET as nowPlaying } from '../api/now-playing.js'

describe('GET /api/now-playing?mock=', () => {
  it.each(['tocando', 'ultima', 'vazio', 'longo'])('mock %s responde SVG 200 sem cache', async (mock) => {
    const resposta = await nowPlaying(new Request(`https://x.vercel.app/api/now-playing?mock=${mock}`))
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
    expect(resposta.headers.get('Cache-Control')).toBe('no-cache, no-store, max-age=0')
    expect(await resposta.text()).toMatch(/^<svg /)
  })
  it('mock longo usa rolagem', async () => {
    const resposta = await nowPlaying(new Request('https://x.vercel.app/api/now-playing?mock=longo'))
    expect(await resposta.text()).toContain('@keyframes rolar-titulo')
  })
})
