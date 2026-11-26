# spotify-github-card

Animated SVG cards for your GitHub profile, served from Vercel:

<img src="https://spotify-github-card.vercel.app/api/painel?mock=playing" width="840" alt="Panel preview">

| Endpoint | What it shows | Needs |
|---|---|---|
| `/api/now-playing` | A spinning vinyl with what you're playing on Spotify right now (or paused, or the last track) | Spotify |
| `/api/showcase` | 3 albums you pick each month, in a carousel | Spotify + a playlist |
| `/api/painel` | One panel in the GitHub style: now playing, the album showcase, your latest Letterboxd review and your top 4 films | Spotify + a playlist + Letterboxd |

Start with the vinyl card (steps 1–5), then add the optional parts you want.

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

### Optional: one panel with music and movies

`/api/painel` joins everything in one image with 4 frames in the GitHub style: now playing, the album showcase, your latest Letterboxd review (film, stars, an excerpt and the poster) and a top 4 that highlights one film at a time. The panel text is in Portuguese.

1. Set up the album showcase above (the panel reuses `SPOTIFY_SHOWCASE_PLAYLIST`).
2. Add `LETTERBOXD_USER` (your Letterboxd username) to `.env` and to Vercel, then **Redeploy**. The review comes from your public feed at `https://letterboxd.com/<user>/rss/`: the latest entry with written text.
3. Make it yours in code, then push:
   - **Top 4:** `src/painel/top4.ts` (title, year, director, poster URL). Letterboxd's RSS doesn't include favorites, so this list is fixed. For the poster, copy the image URL from the film's Letterboxd page and change the size to `0-70-0-105`.
4. Add it to your profile README. GitHub allows one link per image, so the panel comes in two halves that fit together: the music row opens the current track, and the movies row opens your Letterboxd profile.

```html
<a href="https://<your-app>.vercel.app/api/open"><img src="https://<your-app>.vercel.app/api/painel?parte=musica" width="840" alt="Música"></a>
<a href="https://letterboxd.com/<user>/"><img src="https://<your-app>.vercel.app/api/painel?parte=filmes" width="840" alt="Filmes"></a>
```

   Prefer a single image with one link? Use `/api/painel` without `?parte`.

Now playing is always fresh; albums, review and posters are kept in memory for up to an hour, so a new review or playlist change can take that long to show. Each frame fails on its own: if Letterboxd is down, the music frames still work, and vice versa.

## Tips

- **Size:** change `width` in the `<img>` tag.
- **Language:** the vinyl and showcase cards are in English by default; add `?lang=pt` for Portuguese. The panel is Portuguese only.
- **Preview without Spotify:** `/api/now-playing?mock=playing`, `paused`, `last`, `empty` or `long`; `/api/showcase?mock=showcase` or `empty`; `/api/painel?mock=playing`, `paused`, `last`, `empty` or `long`.
- **Card says "Nothing playing right now"?** Your env vars are missing or wrong. Check them in Vercel, then **Redeploy**.
- **Panel says "nenhuma review por aqui ainda"?** `LETTERBOXD_USER` is missing, or your feed has no review with text yet.
- **Tests:** `npm test`

## License

[MIT](LICENSE)
