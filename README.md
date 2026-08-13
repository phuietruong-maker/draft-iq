# Draft IQ

Snake & auction draft intelligence for fantasy football — reads your draft in real time (tier cliffs, positional runs, value falling past ADP), tracks auction budgets with a live max-bid calculator, and flags injury-risk players from 76 real, sourced entries you review before applying.

Mirrors Yahoo, ESPN, Sleeper, or an in-person draft — it doesn't replace them, it just makes sure you're never picking blind.

## Get it

**[⬇ Download the latest version](../../releases/latest/download/Draft-IQ.html)**

It's a single self-contained HTML file — no install, no account. Double-click it and it opens in your browser (Mac, Windows, or Linux). Nothing you do in it ever leaves your machine.

## What it does

- **Live draft intelligence** — positional runs, tier cliffs, and value-vs-ADP surfaced automatically as the board moves
- **Injury-risk flags, sourced** — 76 players researched from ESPN, Pro Football Reference, and FantasyPros; every claim dated and cited, nothing applied until you confirm it
- **Full auction/salary-cap mode** — live budgets per team, a real max-bid calculator, price tracking
- **Research notes that tag themselves** — paste an article or ranking blurb, it recognizes every player mentioned automatically
- **Works with any rankings list** — paste, upload a CSV, or fetch free from Sleeper
- **PPR-aware recommendations** — Standard, Half-PPR, or PPR nudges "Best Available," clearly labeled as a heuristic
- **Bye-week clash warnings** — flags it immediately if a pick shares a bye with someone already on your roster

## Source

`files/draft-room.jsx` is the React source. `Draft IQ.html` is the built, self-contained bundle — the thing you actually run.
