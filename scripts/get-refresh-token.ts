import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'

const PORTA = 8888
const REDIRECT_URI = `http://127.0.0.1:${PORTA}/callback`
const ESCOPOS = 'user-read-currently-playing user-read-recently-played'

const clientId = process.env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no arquivo .env')
  process.exit(1)
}

const state = randomBytes(16).toString('hex')
const urlLogin = new URL('https://accounts.spotify.com/authorize')
urlLogin.search = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  scope: ESCOPOS,
  redirect_uri: REDIRECT_URI,
  state,
}).toString()

function encerrar(codigoSaida: number) {
  process.exitCode = codigoSaida
  servidor.close()
}

async function trocarCodigo(code: string): Promise<string> {
  const resposta = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
    signal: AbortSignal.timeout(10_000),
  })
  const texto = await resposta.text()
  let dados: { refresh_token?: string; error?: string; error_description?: string } = {}
  try {
    dados = JSON.parse(texto)
  } catch {
    throw new Error(`Resposta inesperada do Spotify (HTTP ${resposta.status})`)
  }
  if (!resposta.ok || !dados.refresh_token) {
    throw new Error(`Spotify recusou o código (HTTP ${resposta.status}): ${dados.error_description ?? dados.error ?? 'sem detalhes'}`)
  }
  return dados.refresh_token
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT_URI)
  if (url.pathname !== '/callback') {
    res.writeHead(404).end()
    return
  }
  // Requisição com state errado não é a nossa: ignora e continua esperando.
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('state inválido')
    return
  }
  const code = url.searchParams.get('code')
  if (!code) {
    const motivo = url.searchParams.get('error') ?? 'desconhecido'
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Autorização negada: ${motivo}`)
    console.error(`Autorização negada no Spotify (${motivo}). Rode "npm run token" de novo.`)
    encerrar(1)
    return
  }
  try {
    const refreshToken = await trocarCodigo(code)
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Pronto! Pode fechar esta aba.')
    console.log(`\nSPOTIFY_REFRESH_TOKEN=${refreshToken}\n`)
    console.log('Copie a linha acima para o .env e para as Environment Variables da Vercel.')
    encerrar(0)
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro)
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Falha ao trocar o código. Veja o terminal.')
    console.error(`${mensagem}\nRode "npm run token" de novo.`)
    encerrar(1)
  }
})

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Abra no navegador e autorize:\n\n${urlLogin}\n`)
})
