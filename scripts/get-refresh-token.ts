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

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT_URI)
  if (url.pathname !== '/callback') {
    res.writeHead(404).end()
    return
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('state inválido')
    return
  }
  const code = url.searchParams.get('code')
  if (!code) {
    res.writeHead(400).end(`Autorização negada: ${url.searchParams.get('error')}`)
    return
  }
  const resposta = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
  })
  const dados = (await resposta.json()) as { refresh_token?: string }
  if (!resposta.ok || !dados.refresh_token) {
    res.writeHead(500).end('Falha ao trocar o código. Veja o terminal.')
    console.error(dados)
    process.exitCode = 1
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Pronto! Pode fechar esta aba.')
    console.log(`\nSPOTIFY_REFRESH_TOKEN=${dados.refresh_token}\n`)
    console.log('Copie a linha acima para o .env e para as Environment Variables da Vercel.')
  }
  servidor.close()
})

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Abra no navegador e autorize:\n\n${urlLogin}\n`)
})
