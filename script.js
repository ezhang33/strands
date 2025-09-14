/* Strands-style game: simple implementation */

/** @typedef {{ id: string, theme: string, grid: string[], words: string[], spangram: string }} Puzzle */

/** @type {Puzzle[]} */
const PUZZLES = [
  {
    id: "daphne",
    theme: "Feeling 22",
    grid: [
      "R",
      "R",
      "D",
      "T",
      "C",
      "O",
      "E",
      "D",
      "Y",
      "A",
      "O",
      "D",
      "J",
      "R",
      "P",
      "R",
      "N",
      "T",
      "N",
      "F",
      "O",
      "H",
      "E",
      "I",
      "A",
      "T",
      "N",
      "Y",
      "W",
      "H",
      "S",
      "L",
      "M",
      "E",
      "R",
      "E",
      "E",
      "I",
      "Y",
      "K",
      "S",
      "N",
      "A",
      "H",
      "C",
      "U",
      "I",
      "N",
    ],
    words: ["DOCTOR", "JERRY", "MICHAEL", "SKINNER", "STANFORD", "WHITNEY"],
    spangram: "DAPHNEYU",
  },
  // {
  //   id: "cathy",
  //   theme: "I love you so much",
  //   grid: [
  //     "I",
  //     "M",
  //     "I",
  //     "T",
  //     "R",
  //     "M",
  //     "N",
  //     "S",
  //     "K",
  //     "L",
  //     "A",
  //     "S",
  //     "E",
  //     "I",
  //     "O",
  //     "T",
  //     "S",
  //     "I",
  //     "A",
  //     "C",
  //     "N",
  //     "V",
  //     "R",
  //     "C",
  //     "R",
  //     "S",
  //     "E",
  //     "U",
  //     "L",
  //     "A",
  //     "E",
  //     "N",
  //     "G",
  //     "Y",
  //     "F",
  //     "I",
  //     "I",
  //     "S",
  //     "O",
  //     "E",
  //     "B",
  //     "T",
  //     "L",
  //     "B",
  //     "I",
  //     "U",
  //     "A",
  //     "U",
  //   ],
  //   words: ["BEAUTIFUL", "MINE", "RACIST", "SIBLINGS", "SKINCARE", "SMART"],
  //   spangram: "ILOVEYOU",
  // },
];

const boardEl = document.getElementById("board");
const overlayEl = document.getElementById("pathOverlay");
const foundListEl = document.getElementById("foundList");
const foundHeaderEl = document.getElementById("foundHeader");
const statusTextEl = document.getElementById("statusText");
const themeTextEl = document.getElementById("themeText");
const restartBtn = document.getElementById("restartBtn");
const hintBtn = document.getElementById("hintBtn");
const puzzleSelect = document.getElementById("puzzleSelect");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const currentSelectionEl = document.getElementById("currentSelection");
const celebrationEl = document.getElementById("celebration");
const balloonContainer = document.getElementById("balloon-container");

/** @type {Puzzle|null} */
let currentPuzzle = null;
// Grid dimensions (columns x rows)
let gridCols = 6;
let gridRows = 8;
let gridSize = gridCols;

/** @type {number[]} */
let activePath = []; // selected tile indices in order
let isMouseDown = false;
/** @type {{indices:number[], cls:"locked"|"spangram"}[]} */
let lockedPaths = [];
/** @type {number[]|null} */
let lastIncorrectPath = null;
/** @type {string|null} */
let lastCorrectWord = null;
/** @type {boolean} */
let lastCorrectIsSpangram = false;
/** @type {string|null} */
let lastIncorrectWord = null;

// For hint system
/** @type {string|null} */
let currentHintWord = null;

/** @type {Set<string>} */
let foundWords = new Set();
let spangramFound = false;

function init() {
  // theme setup: default to light, allow persisted override
  const storedTheme = localStorage.getItem("strands_theme");
  const initialTheme = storedTheme === "dark" ? "dark" : "light";
  applyTheme(initialTheme);
  if (themeToggle) {
    updateThemeIcon(initialTheme);
    themeToggle.addEventListener("click", () => {
      const currentMode =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      const newMode = currentMode === "dark" ? "light" : "dark";
      applyTheme(newMode);
      localStorage.setItem("strands_theme", newMode);
      updateThemeIcon(newMode);
    });
  }

  restartBtn.addEventListener("click", () => loadPuzzle(PUZZLES[0].id, true));
  hintBtn.addEventListener("click", showHint);
  loadPuzzle(PUZZLES[0].id);
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
  // redraw lines with new theme colors
  redrawPath();
}

function updateThemeIcon(mode) {
  if (!themeIcon) return;
  themeIcon.textContent = mode === "dark" ? "🌙" : "☀️";
}

/**
 * @param {string} id
 * @param {boolean} forceRestart
 */
function loadPuzzle(id, forceRestart = false) {
  const p = PUZZLES.find((x) => x.id === id) || PUZZLES[0];
  currentPuzzle = p;
  if (puzzleSelect) puzzleSelect.value = p.id;
  themeTextEl.textContent = p.theme;
  statusTextEl.textContent = "Find all words and the spangram.";
  foundWords = new Set();
  spangramFound = false;
  lockedPaths = [];
  lastIncorrectPath = null;
  lastCorrectWord = null;
  lastCorrectIsSpangram = false;
  lastIncorrectWord = null;
  currentHintWord = null;
  renderFound();
  renderBoard(p.grid);
  // Hide celebration when loading new puzzle
  if (celebrationEl) celebrationEl.classList.add("hidden");
}

/** @param {string[]} letters */
function renderBoard(letters) {
  boardEl.innerHTML = "";
  activePath = [];
  isMouseDown = false;
  const desiredCount = gridCols * gridRows;
  const toRender = letters.slice(0, desiredCount);
  toRender.forEach((ch, idx) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.type = "button";
    tile.textContent = ch;
    tile.setAttribute("data-index", String(idx));
    tile.setAttribute("role", "gridcell");
    tile.addEventListener("mousedown", onPointerDown);
    tile.addEventListener("mouseenter", onPointerEnter);
    tile.addEventListener("mouseup", onPointerUp);
    tile.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        onPointerDown(e);
      },
      { passive: false }
    );
    tile.addEventListener("touchmove", onTouchMove, { passive: false });
    tile.addEventListener("touchend", onPointerUp);
    boardEl.appendChild(tile);
  });
  document.addEventListener("mouseup", onPointerUp);
  redrawPath();
  updateSelectionTracker();
}

function onPointerDown(e) {
  isMouseDown = true;
  const idx = tileIndexFromEvent(e);
  if (idx === null) return;
  startPath(idx);
}

function onPointerEnter(e) {
  if (!isMouseDown) return;
  const idx = tileIndexFromEvent(e);
  if (idx === null) return;
  extendPath(idx);
}

function onTouchMove(e) {
  if (!isMouseDown) return;
  const touch = e.touches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!(el instanceof HTMLElement)) return;
  const idxStr = el.getAttribute("data-index");
  if (!idxStr) return;
  const idx = Number(idxStr);
  extendPath(idx);
}

function onPointerUp() {
  if (!isMouseDown) return;
  isMouseDown = false;
  commitPath();
}

function startPath(idx) {
  clearSelectionClasses();
  // clear any lingering incorrect path on next click
  if (lastIncorrectPath) {
    lastIncorrectPath = null;
    redrawPath();
  }
  activePath = [idx];
  lastCorrectWord = null;
  lastCorrectIsSpangram = false;
  lastIncorrectWord = null;
  getTile(idx).classList.add("selected");
  redrawPath();
  updateSelectionTracker();
}

function extendPath(idx) {
  if (activePath.length && activePath[activePath.length - 1] === idx) return;

  // Check if this tile is already in the current path (backtracking)
  const existingIndex = activePath.indexOf(idx);
  if (existingIndex !== -1) {
    // User is backtracking - truncate path to this point
    const oldPath = [...activePath];
    activePath = activePath.slice(0, existingIndex + 1);

    // Clear selection classes from tiles that are no longer in the path
    for (let i = existingIndex + 1; i < oldPath.length; i++) {
      getTile(oldPath[i]).classList.remove("selected");
    }

    redrawPath();
    updateSelectionTracker();
    return;
  }

  if (activePath.length > 0) {
    const prev = activePath[activePath.length - 1];
    if (!areNeighbors(prev, idx)) return;
  }
  activePath.push(idx);
  getTile(idx).classList.add("selected");
  redrawPath();
  updateSelectionTracker();
}

function commitPath() {
  if (!currentPuzzle || activePath.length < 2) {
    clearSelectionClasses();
    activePath = [];
    updateSelectionTracker();
    return;
  }
  const word = activePath.map((i) => currentPuzzle.grid[i]).join("");
  const upper = word.toUpperCase();
  const isSpangram = upper === currentPuzzle.spangram;
  const isValid = currentPuzzle.words.includes(upper) || isSpangram;

  if (isValid) {
    foundWords.add(upper);
    if (isSpangram) spangramFound = true;

    // Clear hint if user found the hinted word
    if (currentHintWord === upper) {
      clearHints();
      currentHintWord = null;
    }
    lockPath(isSpangram ? "spangram" : "locked");
    // persist the path lines for locked words
    lockedPaths.push({
      indices: [...activePath],
      cls: isSpangram ? "spangram" : "locked",
    });
    renderFound();
    setStatus(isSpangram ? `Spangram found: ${upper}!` : `Found: ${upper}`);
    // show correct word in tracker until next click
    lastCorrectWord = isSpangram ? "Spangram Found!" : upper;
    lastCorrectIsSpangram = isSpangram;
    // clear active path so only locked color draws
    activePath = [];
    // redraw on next frame so classes are fully applied before sampling colors
    requestAnimationFrame(() => redrawPath());
    updateSelectionTracker();
    return;
  } else {
    // show incorrect path lines and keep until next click
    lastIncorrectPath = [...activePath];
    lastIncorrectWord = "Not in word list";
    redrawPath();
    flashIncorrect();
    activePath = [];
    redrawPath();
    updateSelectionTracker();
  }
}

function renderFound() {
  foundListEl.innerHTML = "";
  const words = Array.from(foundWords);
  words.sort((a, b) => a.length - b.length || a.localeCompare(b));
  for (const w of words) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className =
      "badge" + (w === currentPuzzle?.spangram ? " spangram" : "");
    span.textContent = w;
    li.appendChild(span);
    foundListEl.appendChild(li);
  }
  // Update header count including the spangram
  const totalWords = (currentPuzzle?.words || []).length + 1; // +1 for spangram
  const foundCount = words.length;
  if (foundHeaderEl) {
    foundHeaderEl.textContent = `Words Found: ${foundCount} of ${totalWords}`;
  }

  // Check if all words are found and trigger celebration
  if (foundCount === totalWords) {
    setTimeout(() => triggerCelebration(), 500); // Small delay for effect
  }
}

function setStatus(text) {
  statusTextEl.textContent = text;
}

function flashIncorrect() {
  for (const idx of activePath) getTile(idx).classList.add("incorrect");
  setTimeout(() => {
    for (const idx of activePath)
      getTile(idx).classList.remove("incorrect", "selected");
  }, 350);
}

/** @param {"locked"|"spangram"} cls */
function lockPath(cls) {
  for (const idx of activePath) {
    const el = getTile(idx);
    el.classList.remove("selected", "incorrect");
    el.classList.add(cls);
    // prevent re-selection
    el.setAttribute("disabled", "true");
  }
}

function clearSelectionClasses() {
  const nodes = boardEl.querySelectorAll(".tile.selected");
  nodes.forEach((n) => n.classList.remove("selected", "incorrect"));
}

/** @param {number} idx */
function getTile(idx) {
  return boardEl.querySelector(`[data-index="${idx}"]`);
}

/** neighbor check in 8 directions */
function areNeighbors(a, b) {
  const ax = a % gridCols,
    ay = Math.floor(a / gridCols);
  const bx = b % gridCols,
    by = Math.floor(b / gridCols);
  const dx = Math.abs(ax - bx),
    dy = Math.abs(ay - by);
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

function tileIndexFromEvent(e) {
  const target = e.currentTarget;
  if (!(target instanceof HTMLElement)) return null;
  const idxStr = target.getAttribute("data-index");
  return idxStr ? Number(idxStr) : null;
}

function updateSelectionTracker() {
  if (!currentSelectionEl) return;

  // Show correct word if present (highest priority)
  if (lastCorrectWord) {
    currentSelectionEl.textContent = lastCorrectWord;
    currentSelectionEl.className = lastCorrectIsSpangram
      ? "current-selection spangram"
      : "current-selection correct";
    return;
  }

  // Show incorrect message if present
  if (lastIncorrectWord) {
    currentSelectionEl.textContent = lastIncorrectWord;
    currentSelectionEl.className = "current-selection incorrect";
    return;
  }

  // Show current selection if we have an active path
  if (currentPuzzle && activePath.length > 0) {
    const text = activePath.map((i) => currentPuzzle.grid[i]).join("");
    currentSelectionEl.textContent = text;
    currentSelectionEl.className = "current-selection";
    return;
  }

  // Otherwise show empty state
  currentSelectionEl.textContent = "\u00A0"; // non-breaking space to preserve height
  currentSelectionEl.className = "current-selection";
}

function redrawPath() {
  if (!(overlayEl instanceof SVGElement)) return;
  overlayEl.innerHTML = "";
  // draw locked paths first
  for (const path of lockedPaths) {
    drawSegments(path.indices, path.cls);
  }
  // draw last incorrect path if present
  if (lastIncorrectPath && lastIncorrectPath.length >= 2) {
    drawSegments(lastIncorrectPath, "incorrect");
  }
  // draw active selection on top
  if (activePath.length >= 2) {
    drawSegments(activePath, "selected");
  }
}

function centerOfTile(index) {
  const tile = getTile(index);
  if (!(tile instanceof HTMLElement)) return { x: 0, y: 0 };
  const container = document.querySelector(".board-container");
  const containerRect =
    container instanceof HTMLElement
      ? container.getBoundingClientRect()
      : { left: 0, top: 0 };
  const tileRect = tile.getBoundingClientRect();
  const x = tileRect.left - containerRect.left + tileRect.width / 2;
  const y = tileRect.top - containerRect.top + tileRect.height / 2;
  return { x, y };
}

function getTileMetrics(index) {
  const tile = getTile(index);
  if (!(tile instanceof HTMLElement)) return { cx: 0, cy: 0, w: 0, h: 0 };
  const container = document.querySelector(".board-container");
  const containerRect =
    container instanceof HTMLElement
      ? container.getBoundingClientRect()
      : { left: 0, top: 0 };
  const r = tile.getBoundingClientRect();
  return {
    cx: r.left - containerRect.left + r.width / 2,
    cy: r.top - containerRect.top + r.height / 2,
    w: r.width,
    h: r.height,
  };
}

function drawSegments(indices, status) {
  if (!(overlayEl instanceof SVGElement)) return;
  if (indices.length < 2) return;
  for (let i = 0; i < indices.length - 1; i++) {
    const am = getTileMetrics(indices[i]);
    const bm = getTileMetrics(indices[i + 1]);
    const ax = am.cx,
      ay = am.cy,
      bx = bm.cx,
      by = bm.cy;
    const vx = bx - ax,
      vy = by - ay;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len,
      uy = vy / len;
    const offsetA = Math.min(am.w, am.h) / 2 - 6; // keep inside tile edge
    const offsetB = Math.min(bm.w, bm.h) / 2 - 6;
    const x1 = ax + ux * offsetA;
    const y1 = ay + uy * offsetA;
    const x2 = bx - ux * offsetB;
    const y2 = by - uy * offsetB;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    line.setAttribute("stroke", statusColorForSegment(indices[i], status));
    line.setAttribute("stroke-width", "8");
    line.setAttribute("stroke-linecap", "round");
    overlayEl.appendChild(line);
  }
}

function statusColorForSegment(tileIndex, status) {
  // Prefer explicit theme variables to avoid light/dark inversion
  const rootStyle = getComputedStyle(document.documentElement);
  if (status === "selected")
    return (
      rootStyle.getPropertyValue("--line-selected") ||
      rootStyle.getPropertyValue("--primary") ||
      "#2563eb"
    );
  if (status === "locked")
    return (
      rootStyle.getPropertyValue("--line-locked") ||
      rootStyle.getPropertyValue("--accent") ||
      "#059669"
    );
  if (status === "spangram")
    return (
      rootStyle.getPropertyValue("--line-spangram") ||
      rootStyle.getPropertyValue("--warn") ||
      "#ffcc66"
    );
  if (status === "incorrect")
    return (
      rootStyle.getPropertyValue("--line-incorrect") ||
      rootStyle.getPropertyValue("--error") ||
      "#dc2626"
    );
  // Fallback
  return rootStyle.getPropertyValue("--primary") || "#2563eb";
}

window.addEventListener("resize", () => redrawPath());

function triggerCelebration() {
  if (!celebrationEl) return;

  // Show celebration overlay
  celebrationEl.classList.remove("hidden");

  // Create balloons
  createBalloons();

  // Hide celebration after 8 seconds
  setTimeout(() => {
    celebrationEl.classList.add("hidden");
    if (balloonContainer) balloonContainer.innerHTML = ""; // Clear balloons
  }, 7500);

  // Click anywhere to dismiss
  celebrationEl.addEventListener("click", () => {
    celebrationEl.classList.add("hidden");
    if (balloonContainer) balloonContainer.innerHTML = "";
  });
}

function createBalloons() {
  if (!balloonContainer) return;

  // Array of celebration emojis
  const celebrationEmojis = ["🎈", "🎊", "🎂"];

  // Create 50 celebration elements
  for (let i = 0; i < 50; i++) {
    const balloon = document.createElement("div");
    balloon.className = "balloon";

    // Randomly pick from balloons, party poppers, and cakes
    balloon.textContent =
      celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];

    // Random horizontal position
    balloon.style.left = Math.random() * 100 + "%";

    // Random animation delay (start after 0.5s minimum)
    balloon.style.animationDelay = Math.random() * 2 + 0.5 + "s";

    // Random animation duration
    balloon.style.animationDuration = Math.random() * 2 + 3 + "s";

    balloonContainer.appendChild(balloon);
  }
}

function showHint() {
  if (!currentPuzzle) return;

  // Clear any existing hints
  clearHints();

  // Get all unfound words (including spangram)
  const unfoundWords = [];

  // Add regular words that haven't been found
  for (const word of currentPuzzle.words) {
    if (!foundWords.has(word)) {
      unfoundWords.push({ word, isSpangram: false });
    }
  }

  // Don't include spangram in hints - let users find it themselves!

  if (unfoundWords.length === 0) return; // All words found

  // Pick a random unfound word
  const randomWord =
    unfoundWords[Math.floor(Math.random() * unfoundWords.length)];

  // Find the path for this word in the grid
  const wordPath = findWordPath(randomWord.word);

  if (wordPath) {
    // Store the current hint word
    currentHintWord = randomWord.word;

    // Highlight the tiles for this word
    for (const tileIndex of wordPath) {
      const tile = getTile(tileIndex);
      if (tile) {
        tile.classList.add("hint");
      }
    }

    // Hint will stay until user finds the word (no timeout)
  }
}

function clearHints() {
  const hintTiles = boardEl.querySelectorAll(".tile.hint");
  for (const tile of hintTiles) {
    tile.classList.remove("hint");
  }
}

function findWordPath(targetWord) {
  if (!currentPuzzle) return null;

  // Try starting from each tile
  for (
    let startIndex = 0;
    startIndex < currentPuzzle.grid.length;
    startIndex++
  ) {
    if (currentPuzzle.grid[startIndex] === targetWord[0]) {
      const path = findPathFromTile(startIndex, targetWord, []);
      if (path) return path;
    }
  }
  return null;
}

function findPathFromTile(currentIndex, remainingWord, currentPath) {
  if (remainingWord.length === 0) return currentPath;
  if (currentPath.includes(currentIndex)) return null; // Already visited
  if (currentPuzzle.grid[currentIndex] !== remainingWord[0]) return null;

  const newPath = [...currentPath, currentIndex];
  const newRemainingWord = remainingWord.slice(1);

  if (newRemainingWord.length === 0) return newPath; // Found complete word

  // Try all neighbors
  for (let i = 0; i < currentPuzzle.grid.length; i++) {
    if (areNeighbors(currentIndex, i) && !newPath.includes(i)) {
      const result = findPathFromTile(i, newRemainingWord, newPath);
      if (result) return result;
    }
  }

  return null; // No valid path found
}

document.addEventListener("DOMContentLoaded", init);
