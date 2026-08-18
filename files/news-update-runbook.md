# Updating the NBC Sports player-news seed

How the `NBC_NEWS_SEED` block in `draft-room.jsx` gets refreshed. Not automated —
run this when asked, using Claude Code with the Chrome browser tool (the
pagination on NBC's page is JS-driven; a plain `curl`/server fetch only sees
the newest ~10 items, so a real browser is required for full coverage).

## Steps

1. **Open the page in Chrome** — `https://www.nbcsports.com/fantasy/football/player-news`
2. **Paginate** — click "Load More" repeatedly (via `javascript_tool`, looping
   a `document.querySelectorAll('button, a')` match on text `"load more"`,
   `await`-sleeping ~1s between clicks so each batch renders) until you have
   enough days of coverage.
3. **Extract the text** — `document.querySelectorAll('main')[1].innerText`
   (index `[1]`, not `[0]` — the page has two `<main>` elements and the news
   feed is the second one). Tool responses truncate long strings, so pull it
   via `get_page_text` and read the saved file if `get_page_text` itself
   truncates past ~50k characters.
4. **Parse into cards** — each card is delimited by a trailing
   `MORE {NAME} NEWS` line. Fields inside a card, in order: name, team code,
   position, optional `#jersey`, `PLAYER STATS` marker, headline, body
   (ends in `- {byline}`), optional category (`Injury`/`Transaction`/`Recap`),
   a timestamp line (`Xh ago` or `Mon DD, YYYY, H:MM AM/PM PDT`), optional
   `Source: ...`, then zero or more related-player name lines before the
   `MORE ... NEWS` terminator.
5. **Paraphrase each item** — write a 1–2 sentence original summary per card
   (don't copy NBC's headline/body text verbatim — copyright). This is the
   one step that has to stay manual/human-in-the-loop.
6. **Generate the JS block** — convert relative timestamps to epoch ms
   against the scrape time, build stable ids as
   `nbc-{YYYYMMDD-HHMM}-{slugified-name}`, and emit
   `{ id, players: [name], source: "NBC Sports", ts, text }` entries.
7. **Splice into `draft-room.jsx`**, replacing the whole `NBC_NEWS_SEED`
   array (keep the surrounding seed/dedup logic in the `notes` `useState`
   initializer — that part doesn't need to change).
8. **Rebuild `Draft IQ.html`**:
   ```
   npm install react react-dom esbuild   # in a scratch dir, once
   npx esbuild entry.jsx --bundle --minify --format=iife --loader:.jsx=jsx --outfile=bundle.js
   ```
   where `entry.jsx` is:
   ```jsx
   import React from "react";
   import { createRoot } from "react-dom/client";
   import DraftRoom from "./draft-room.jsx";
   createRoot(document.getElementById("root")).render(<DraftRoom />);
   ```
   Then swap the bundle into the existing HTML's `<script>` tag (keep the
   `<head>`/CSS wrapper as-is — only the script body changes).
9. **Verify in a real browser tab** before shipping: clear localStorage,
   reload, confirm the "📚 Research (N)" badge count matches, spot-check a
   couple of entries (especially the oldest one, to confirm date math).

Old seed entries are tracked by id in `localStorage["draftiq_news_seed_applied"]`
so re-running this with new ids only adds what's new — nothing duplicates,
and anything a user deleted stays deleted.
