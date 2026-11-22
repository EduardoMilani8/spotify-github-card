# spotify-github-card

Card animado (vinil) com a música que estou ouvindo no Spotify, para o README do perfil do GitHub.

## Configuração (uma vez)

1. Em https://developer.spotify.com/dashboard crie um app (precisa de Spotify Premium).
   - Redirect URI: `http://127.0.0.1:8888/callback`
   - API: Web API
2. Copie `.env.example` para `.env` e preencha `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET`.
3. `npm install` e `npm run token`. Abra o link, autorize, e copie o `SPOTIFY_REFRESH_TOKEN` para o `.env`.

## Desenvolvimento

- `npm test` — testes
- `npx vercel dev` — servidor local em http://localhost:3000
  - `/api/now-playing?mock=tocando|ultima|vazio|longo` — prévias sem Spotify
  - `/api/now-playing` — card real (usa o `.env`)

## Deploy

1. `npx vercel` (primeira vez: cria o projeto) e `npx vercel --prod`.
2. Em Settings → Environment Variables da Vercel, cadastre as três variáveis `SPOTIFY_*` e faça `npx vercel --prod` de novo.

## No perfil do GitHub

No repositório `<seu-usuario>/<seu-usuario>`, o `README.md` contém só:

```html
<a href="https://<app>.vercel.app/api/open">
  <img src="https://<app>.vercel.app/api/now-playing" width="440" alt="Música que estou ouvindo no Spotify">
</a>
```
