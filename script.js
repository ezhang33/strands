/* Strands-style game: simple implementation */

/** @typedef {{ id: string, theme: string, grid: string[], words: string[], spangram: string }} Puzzle */

/** @type {Puzzle[]} */
const PUZZLES = [
  {
    id: "demo-1",
    theme: "Fruits",
    grid: [
      "A",
      "P",
      "P",
      "L",
      "E",
      "O",
      "R",
      "G",
      "B",
      "A",
      "N",
      "A",
      "N",
      "A",
      "G",
      "R",
      "P",
      "E",
      "A",
      "C",
      "H",
      "K",
      "I",
      "W",
      "M",
      "A",
      "N",
      "G",
      "O",
      "L",
      "E",
      "M",
      "C",
      "H",
      "E",
      "R",
      "R",
      "Y",
      "L",
      "I",
      "L",
      "I",
      "M",
      "E",
      "B",
      "E",
      "R",
      "R",
      "P",
      "L",
      "U",
      "M",
      "G",
      "R",
      "A",
      "P",
      "O",
      "R",
      "A",
      "N",
      "G",
      "E",
      "S",
      "S",
    ],
    words: [
      "ORANGE",
      "BANANA",
      "PEACH",
      "MANGO",
      "CHERRY",
      "LIME",
      "PLUM",
      "GRAPE",
      "BERRY",
      "KIWI",
    ],
    spangram: "APPLE",
  },
  {
    id: "demo-2",
    theme: "Programming Languages",
    grid: [
      "P",
      "Y",
      "T",
      "H",
      "O",
      "N",
      "J",
      "S",
      "R",
      "U",
      "B",
      "Y",
      "S",
      "W",
      "I",
      "F",
      "J",
      "A",
      "V",
      "A",
      "G",
      "O",
      "T",
      "S",
      "R",
      "U",
      "S",
      "T",
      "K",
      "O",
      "T",
      "L",
      "I",
      "N",
      "C",
      "S",
      "H",
      "A",
      "R",
      "P",
      "N",
      "O",
      "D",
      "E",
      "J",
      "S",
      "P",
      "H",
      "T",
      "Y",
      "P",
      "E",
      "S",
      "C",
      "R",
      "I",
      "P",
      "T",
      "J",
      "A",
      "V",
      "A",
      "S",
      "C",
    ],
    words: [
      "PYTHON",
      "RUBY",
      "SWIFT",
      "JAVA",
      "GO",
      "RUST",
      "KOTLIN",
      "CSHARP",
      "NODEJS",
      "TYPES",
      "SCRIPT",
      "JAVASCRIPT",
    ],
    spangram: "PROGRAMMING",
  },
];

const boardEl = document.getElementById("board");
const overlayEl = document.getElementById("pathOverlay");
const foundListEl = document.getElementById("foundList");
const foundHeaderEl = document.getElementById("foundHeader");
const statusTextEl = document.getElementById("statusText");
const themeTextEl = document.getElementById("themeText");
const restartBtn = document.getElementById("restartBtn");
const puzzleSelect = document.getElementById("puzzleSelect");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const currentSelectionEl = document.getElementById("currentSelection");

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

  // populate puzzle selector
  PUZZLES.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.id} – ${p.theme}`;
    puzzleSelect.appendChild(opt);
  });
  puzzleSelect.addEventListener("change", () => loadPuzzle(puzzleSelect.value));
  restartBtn.addEventListener("click", () =>
    loadPuzzle(puzzleSelect.value, true)
  );
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
  puzzleSelect.value = p.id;
  themeTextEl.textContent = p.theme;
  statusTextEl.textContent = "Find all words and the spangram.";
  foundWords = new Set();
  spangramFound = false;
  lockedPaths = [];
  lastIncorrectPath = null;
  renderFound();
  renderBoard(p.grid);
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
  getTile(idx).classList.add("selected");
  redrawPath();
  updateSelectionTracker();
}

function extendPath(idx) {
  if (activePath.length && activePath[activePath.length - 1] === idx) return;
  if (activePath.includes(idx)) return; // simple: no revisiting
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
    lockPath(isSpangram ? "spangram" : "locked");
    // persist the path lines for locked words
    lockedPaths.push({
      indices: [...activePath],
      cls: isSpangram ? "spangram" : "locked",
    });
    renderFound();
    setStatus(isSpangram ? `Spangram found: ${upper}!` : `Found: ${upper}`);
    // clear active path so only locked color draws
    activePath = [];
    // redraw on next frame so classes are fully applied before sampling colors
    requestAnimationFrame(() => redrawPath());
    updateSelectionTracker();
    return;
  } else {
    // show incorrect path lines and keep until next click
    lastIncorrectPath = [...activePath];
    redrawPath();
    flashIncorrect();
  }
  activePath = [];
  redrawPath();
  updateSelectionTracker();
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
  if (!currentPuzzle || activePath.length === 0) {
    currentSelectionEl.textContent = "\u00A0"; // non-breaking space to preserve height
    return;
  }
  const text = activePath.map((i) => currentPuzzle.grid[i]).join("");
  currentSelectionEl.textContent = text;
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

document.addEventListener("DOMContentLoaded", init);
