(function () {
  "use strict";

  var SIZE = 4;
  var WIN_VALUE = 2048;
  var BEST_KEY = "2048-best";
  var SWIPE_THRESHOLD = 30;

  // Board: 2D array of numbers (0 = empty)
  var board = [];
  var score = 0;
  var best = 0;
  var won = false; // win overlay already shown this game
  var keepGoing = false; // user chose to continue after winning
  var gameOver = false;

  // DOM refs
  var tilesEl = document.getElementById("tiles");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var overlayEl = document.getElementById("overlay");
  var overlayMsgEl = document.getElementById("overlay-message");
  var keepBtn = document.getElementById("keep-going");
  var retryBtn = document.getElementById("retry");
  var newGameBtn = document.getElementById("new-game");
  var boardWrap = document.querySelector(".board-wrap");

  /* ---------------- State helpers ---------------- */

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      b.push([0, 0, 0, 0]);
    }
    return b;
  }

  function getEmptyCells() {
    var cells = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) cells.push({ r: r, c: c });
      }
    }
    return cells;
  }

  function addRandomTile() {
    var empty = getEmptyCells();
    if (empty.length === 0) return null;
    var spot = empty[Math.floor(Math.random() * empty.length)];
    board[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
    return spot;
  }

  function loadBest() {
    var stored = null;
    try {
      stored = localStorage.getItem(BEST_KEY);
    } catch (e) {
      stored = null;
    }
    best = stored ? parseInt(stored, 10) || 0 : 0;
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (e) {
      /* ignore (private mode etc.) */
    }
  }

  /* ---------------- Move / merge engine ----------------
   * All moves are generalized to a "slide left" on each row.
   * Direction is normalized by transposing / reversing the board,
   * then restored afterwards.
   */

  function slideRowLeft(row) {
    // Compress non-zero values
    var filtered = row.filter(function (v) {
      return v !== 0;
    });
    var result = [];
    var gained = 0;
    var i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        var mergedVal = filtered[i] * 2;
        result.push(mergedVal);
        gained += mergedVal;
        i += 2; // skip both (one merge per tile per move)
      } else {
        result.push(filtered[i]);
        i += 1;
      }
    }
    while (result.length < SIZE) result.push(0);
    return { row: result, gained: gained };
  }

  function transpose(b) {
    var t = emptyBoard();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        t[c][r] = b[r][c];
      }
    }
    return t;
  }

  function reverseRows(b) {
    return b.map(function (row) {
      return row.slice().reverse();
    });
  }

  function boardsEqual(a, b) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function cloneBoard(b) {
    return b.map(function (row) {
      return row.slice();
    });
  }

  // direction: "left" | "right" | "up" | "down"
  function move(direction) {
    var before = cloneBoard(board);
    var work = board;

    // Normalize so the move becomes a left-slide
    if (direction === "right") {
      work = reverseRows(work);
    } else if (direction === "up") {
      work = transpose(work);
    } else if (direction === "down") {
      work = reverseRows(transpose(work));
    }

    var gainedTotal = 0;
    var slid = work.map(function (row) {
      var res = slideRowLeft(row);
      gainedTotal += res.gained;
      return res.row;
    });

    // Restore orientation
    if (direction === "right") {
      slid = reverseRows(slid);
    } else if (direction === "up") {
      slid = transpose(slid);
    } else if (direction === "down") {
      slid = transpose(reverseRows(slid));
    }

    board = slid;
    var changed = !boardsEqual(before, board);
    return { changed: changed, gained: gainedTotal };
  }

  function canMove() {
    if (getEmptyCells().length > 0) return true;
    // Check for any adjacent equal pair
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = board[r][c];
        if (c + 1 < SIZE && board[r][c + 1] === v) return true;
        if (r + 1 < SIZE && board[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function hasWon() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] >= WIN_VALUE) return true;
      }
    }
    return false;
  }

  /* ---------------- Rendering ---------------- */

  function render() {
    // Re-render tiles fresh each time (simple & reliable)
    tilesEl.textContent = "";
    var frag = document.createDocumentFragment();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = board[r][c];
        if (v === 0) continue;
        var tile = document.createElement("div");
        tile.className = "tile";
        if (v > WIN_VALUE) tile.className += " super";
        tile.setAttribute("data-value", String(v));
        tile.style.gridRowStart = String(r + 1);
        tile.style.gridColumnStart = String(c + 1);
        tile.textContent = String(v);
        frag.appendChild(tile);
      }
    }
    tilesEl.appendChild(frag);

    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  function showOverlay(message, isWin) {
    overlayMsgEl.textContent = message;
    overlayEl.classList.toggle("win", !!isWin);
    keepBtn.hidden = !isWin;
    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
    overlayEl.classList.remove("win");
  }

  /* ---------------- Game flow ---------------- */

  function newGame() {
    board = emptyBoard();
    score = 0;
    won = false;
    keepGoing = false;
    gameOver = false;
    hideOverlay();
    addRandomTile();
    addRandomTile();
    render();
  }

  function handleMove(direction) {
    if (gameOver) return;
    if (overlayEl.hidden === false && !keepGoing) return; // win overlay blocking

    var result = move(direction);
    if (!result.changed) return; // board unchanged -> no new tile

    if (result.gained > 0) {
      score += result.gained;
      if (score > best) {
        best = score;
        saveBest();
      }
    }

    addRandomTile();
    render();

    // Win check (only once per game)
    if (!won && !keepGoing && hasWon()) {
      won = true;
      showOverlay("승리!", true);
      return;
    }

    // Game over check
    if (!canMove()) {
      gameOver = true;
      showOverlay("게임 오버", false);
    }
  }

  /* ---------------- Input: keyboard ---------------- */

  var KEY_MAP = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    a: "left",
    d: "right",
    w: "up",
    s: "down",
    A: "left",
    D: "right",
    W: "up",
    S: "down"
  };

  document.addEventListener("keydown", function (e) {
    var dir = KEY_MAP[e.key];
    if (!dir) return;
    e.preventDefault();
    handleMove(dir);
  });

  /* ---------------- Input: touch swipe ---------------- */

  var touchStartX = 0;
  var touchStartY = 0;
  var touching = false;

  boardWrap.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length !== 1) return;
      touching = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: false }
  );

  boardWrap.addEventListener(
    "touchmove",
    function (e) {
      // Prevent page scroll while interacting with the board
      if (touching) e.preventDefault();
    },
    { passive: false }
  );

  boardWrap.addEventListener(
    "touchend",
    function (e) {
      if (!touching) return;
      touching = false;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - touchStartX;
      var dy = touch.clientY - touchStartY;
      var absX = Math.abs(dx);
      var absY = Math.abs(dy);

      if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;

      if (absX > absY) {
        handleMove(dx > 0 ? "right" : "left");
      } else {
        handleMove(dy > 0 ? "down" : "up");
      }
    },
    { passive: false }
  );

  /* ---------------- Buttons ---------------- */

  newGameBtn.addEventListener("click", newGame);
  retryBtn.addEventListener("click", newGame);

  keepBtn.addEventListener("click", function () {
    keepGoing = true;
    hideOverlay();
  });

  /* ---------------- Init ---------------- */

  loadBest();
  newGame();
})();
