# MiniGames Hub

SPA mobile-first per minigiochi in Vanilla JS + Tailwind CSS (via CDN).

## Struttura

- `index.html` — shell SPA con header fisso e contenitore `#games-list`
- `games.json` — catalogo giochi (id, titolo, categoria, anteprima, stato)
- `app.js` — fetch di `games.json`, rendering card, router hash-based (`#/`, `#/games`, `#/game/:id`)
- `styles.css` — stili mobile-first, card `w-full` con padding
- `vercel.json` — rewrite SPA verso `/index.html`

## Sviluppo

Apri `index.html` con un server statico locale (es. `npx serve .`) e naviga tra le viste via hash routing.

## Deploy su Vercel

Il file `vercel.json` garantisce che ogni route ricada su `index.html` per il routing client-side.
