# spotify-github-card

An animated vinyl card for your GitHub profile that shows what you're playing on Spotify right now, or the last track you played.

<img src="https://spotify-github-card.vercel.app/api/now-playing?mock=playing" width="440" alt="Card preview">

## Setup

You need a **Spotify Premium** account (Spotify requires it for developer apps), a GitHub account, a free Vercel account, and Node.js 20+.

### 1. Fork and install

Fork this repo, then:

```bash
git clone https://github.com/<you>/spotify-github-card
cd spotify-github-card
npm install
```

### 2. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and click **Create app**.
2. Set the **Redirect URI** to `http://127.0.0.1:8888/callback` and select **Web API**.
3. Copy `.env.example` to `.env` and fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.

### 3. Get your refresh token

```bash
npm run token
```

Open the link it prints, approve the app, and paste the `SPOTIFY_REFRESH_TOKEN=...` line into `.env`.

### 4. Deploy to Vercel

1. On [vercel.com/new](https://vercel.com/new), import your fork. Keep the defaults.
2. Under **Environment Variables**, add the three `SPOTIFY_*` values from your `.env`.
3. Click **Deploy**.

### 5. Add it to your profile

Create a public repo named exactly like your username (e.g. `octocat/octocat`) and put this in its `README.md`:

```html
<a href="https://<your-app>.vercel.app/api/open">
  <img src="https://<your-app>.vercel.app/api/now-playing" width="440" alt="What I'm listening to on Spotify">
</a>
```

Done. Clicking the card opens the track on Spotify.

### Optional: album showcase

A second card that shows 3 albums you pick, in an animated carousel.

1. Create a Spotify playlist and add one song from each album (order = showcase order).
2. Add `SPOTIFY_SHOWCASE_PLAYLIST` (the playlist link) to `.env` and to Vercel, then **Redeploy**.
3. Put both cards side by side in your profile README:

```html
<a href="https://<your-app>.vercel.app/api/open"><img src="https://<your-app>.vercel.app/api/now-playing" width="440" alt="What I'm listening to on Spotify"></a>
<a href="https://open.spotify.com/playlist/<id>"><img src="https://<your-app>.vercel.app/api/showcase" width="383" alt="Albums on display this month"></a>
```

Changes to the playlist show up within an hour. Tokens created before this feature need `npm run token` again (it now asks for `playlist-read-private`).

## Tips

- **Size:** change `width` in the `<img>` tag.
- **Language:** English by default. Add `?lang=pt` to the image URL for Portuguese.
- **Preview without Spotify:** `/api/now-playing?mock=playing`, `paused`, `last`, `empty` or `long`; `/api/showcase?mock=showcase` or `empty`.
- **Card says "Nothing playing right now"?** Your env vars are missing or wrong. Check them in Vercel, then **Redeploy**.
- **Tests:** `npm test`

## License

[MIT](LICENSE)
