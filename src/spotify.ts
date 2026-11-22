import type { TocadasRecentes, TocandoAgora } from './tipos.js'

export type FetchFn = typeof fetch

export interface Credenciais {
  clientId: string
  clientSecret: string
  refreshToken: string
}

const TIMEOUT_MS = 2500
const API = 'https://api.spotify.com/v1/me/player'
const CONTENT_TYPE_IMAGEM = /^image\/[a-z0-9.+-]+$/

export function lerCredenciais(env: Record<string, string | undefined>): Credenciais {
  const nomes = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'] as const
  const ausentes = nomes.filter((n) => !env[n])
  if (ausentes.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${ausentes.join(', ')}`)
  }
  return {
    clientId: env.SPOTIFY_CLIENT_ID!,
    clientSecret: env.SPOTIFY_CLIENT_SECRET!,
    refreshToken: env.SPOTIFY_REFRESH_TOKEN!,
  }
}

export async function obterAccessToken(cred: Credenciais, fetchFn: FetchFn = fetch): Promise<string> {
  const resposta = await fetchFn('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cred.clientId}:${cred.clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: cred.refreshToken }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resposta.ok) throw new Error(`Spotify recusou o refresh token: HTTP ${resposta.status}`)
  const dados = (await resposta.json()) as { access_token: string }
  return dados.access_token
}

async function getApi(caminho: string, token: string, fetchFn: FetchFn): Promise<Response> {
  const resposta = await fetchFn(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resposta.ok) throw new Error(`Spotify ${caminho}: HTTP ${resposta.status}`)
  return resposta
}

export async function buscarTocandoAgora(token: string, fetchFn: FetchFn = fetch): Promise<TocandoAgora | null> {
  const resposta = await getApi('/currently-playing', token, fetchFn)
  if (resposta.status === 204) return null
  return (await resposta.json()) as TocandoAgora
}

export async function buscarRecentes(token: string, fetchFn: FetchFn = fetch): Promise<TocadasRecentes> {
  const resposta = await getApi('/recently-played?limit=1', token, fetchFn)
  return (await resposta.json()) as TocadasRecentes
}

export async function baixarCapaBase64(url: string, fetchFn: FetchFn = fetch): Promise<string | null> {
  try {
    const resposta = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!resposta.ok) return null
    const tipoBruto = (resposta.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase()
    const tipo = CONTENT_TYPE_IMAGEM.test(tipoBruto) ? tipoBruto : 'image/jpeg'
    const bytes = Buffer.from(await resposta.arrayBuffer())
    return `data:${tipo};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}
