import { describe, expect, it } from 'vitest'
import { GET as nowPlaying } from '../api/now-playing.js'

const chamar = (query: string) => nowPlaying(new Request(`https://x.vercel.app/api/now-playing?${query}`))

describe('GET /api/now-playing?mock=', () => {
  it.each(['playing', 'last', 'paused', 'empty', 'long', 'tocando', 'ultima', 'pausada', 'vazio', 'longo'])(
    'mock %s responde SVG 200 sem cache',
    async (mock) => {
      const resposta = await chamar(`mock=${mock}`)
      expect(resposta.status).toBe(200)
      expect(resposta.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8')
      expect(resposta.headers.get('Cache-Control')).toBe('no-cache, no-store, max-age=0')
      expect(await resposta.text()).toMatch(/^<svg /)
    },
  )
  it('mock long usa rolagem', async () => {
    expect(await (await chamar('mock=long')).text()).toContain('@keyframes rolar-titulo')
  })
})

describe('GET /api/now-playing?lang=', () => {
  it('padrão é inglês', async () => {
    expect(await (await chamar('mock=playing')).text()).toContain('NOW PLAYING')
  })
  it('lang=pt usa português', async () => {
    expect(await (await chamar('mock=playing&lang=pt')).text()).toContain('TOCANDO AGORA')
  })
  it('idioma desconhecido cai no inglês', async () => {
    expect(await (await chamar('mock=playing&lang=xx')).text()).toContain('NOW PLAYING')
  })
})
