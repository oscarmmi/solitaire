Build Klondike solitaire in THIS folder: C:\xampp\htdocs\solitaire

A recruiter-ready browser solitaire. Playable, polished, no backend.

## Game
- Call it "Night Tableau". Original card faces, no Windows Solitaire branding.
- Standard Klondike: 7 tableau columns (1–7 cards, top face-up), 4 foundations (A→K by suit), stock and waste. Draw 1 from stock. Recycle waste to stock when empty.
- Tableau: build down in alternating colors. Move a face-up card or a valid descending run. Empty tableau accepts a King.
- Foundations: build up by suit from Ace. Click a card then a legal destination, or click a highlighted legal pile. Double-click / Enter auto-sends to a foundation if legal.
- Keyboard: arrows highlight piles, Enter selects/moves, S draws stock, R restarts.
- Win when all 52 cards sit on foundations. Local wins in localStorage.

## UI
- Deep green felt, cream cards, clear ranks. Not a default Vite page. No Vue logo.
- 390px phone and 1280px desktop. Cards must stay readable on a phone.

## Tests
- Vitest (pure logic): a red 6 can stack on a black 7; a same-color stack is rejected; an Ace can start a foundation; drawing from stock puts one card on the waste.
- `npm test` and `npm run build` must pass.

## GitHub
- Repo: https://github.com/oscarmmi/solitaire
- Pages: https://oscarmmi.github.io/solitaire/
- vite base `/solitaire/`
- Commit: feat: add solitaire
- First commit must `git add -A` so package.json, vite.config.ts, tsconfigs, src/main.ts, index.html, .gitignore, and .github/workflows/pages.yml ship with the game.
- gh repo edit --description "Night Tableau Klondike solitaire in Vue 3 + TypeScript, playable on GitHub Pages." --add-topic vue --add-topic typescript --add-topic game --add-topic solitaire --add-topic cards
- Stop. Print the repo URL and Pages URL.
