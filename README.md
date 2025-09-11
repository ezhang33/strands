# Strands Clone

A lightweight, static Strands-like word game. No build step required — just open `index.html`.

## Features

- 8x8 letter grid
- Drag or touch to select adjacent letters (8 directions)
- Recognizes puzzle words and a special spangram
- Tracks found words; locks tiles for found words
- Two demo puzzles included in `script.js`

## Local use

Open `index.html` in your browser, or serve the folder:

```bash
python3 -m http.server 5173 --directory /Users/ezhang3/code/personal/strands
```

Then visit `http://localhost:5173`.

## Add puzzles

Edit `PUZZLES` in `script.js`:

```js
{
  id: "your-id",
  theme: "Your theme",
  grid: [ /* 64 letters */ ],
  words: ["WORD1","WORD2"],
  spangram: "SPECIALWORD"
}
```

- Grid should be 64 uppercase letters (for 8x8). The UI is responsive, but logic assumes 8.
- Words must be uppercase and must be traceable in the grid by adjacent moves.

## Deploy to GitHub Pages

1. Create a new repository (or use an existing one).
2. Put these files at the repository root or in a folder, e.g., `strands/`.
3. Commit and push.
4. In repo Settings → Pages:
   - Source: `Deploy from a branch`
   - Branch: `main` (or `master`) → `/root` (or the folder path)
5. After a minute, your game will be live at the Pages URL.

If you deploy from a subfolder, make sure the Pages config points to that folder.

## License

MIT
