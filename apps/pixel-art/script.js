(function () {
  "use strict";

  // ---- Constants ----
  var GRID = 16;
  var TOTAL = GRID * GRID; // 256
  var EXPORT_SCALE = 32; // 16 * 32 = 512px output
  var PALETTE = [
    "#000000", "#FFFFFF", "#9E9E9E", "#E53935",
    "#FB8C00", "#FDD835", "#7CB342", "#43A047",
    "#00ACC1", "#29B6F6", "#1E88E5", "#3949AB",
    "#8E24AA", "#EC407A", "#6D4C41", "#FFCC80"
  ];

  // ---- State ----
  var cells = new Array(TOTAL).fill(null); // null = empty, else hex string
  var cellEls = new Array(TOTAL);
  var currentColor = "#776e65";
  var eraser = false;
  var isDrawing = false;

  // ---- DOM refs ----
  var board = document.getElementById("board");
  var paletteEl = document.getElementById("palette");
  var customInput = document.getElementById("custom-color");
  var currentSwatch = document.getElementById("current-swatch");
  var eraserBtn = document.getElementById("eraser-btn");
  var clearBtn = document.getElementById("clear-btn");
  var saveBtn = document.getElementById("save-btn");
  var swatchEls = [];

  // ---- Build palette ----
  PALETTE.forEach(function (color) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.backgroundColor = color;
    btn.setAttribute("aria-label", "색상 " + color);
    btn.dataset.color = color;
    btn.addEventListener("click", function () {
      selectColor(color);
    });
    paletteEl.appendChild(btn);
    swatchEls.push(btn);
  });

  // ---- Build board ----
  for (var i = 0; i < TOTAL; i++) {
    var px = document.createElement("div");
    px.className = "px";
    px.dataset.index = String(i);
    board.appendChild(px);
    cellEls[i] = px;
  }

  // ---- Selection UI ----
  function updateSelectionUI() {
    swatchEls.forEach(function (btn) {
      var match = !eraser && btn.dataset.color.toLowerCase() === currentColor.toLowerCase();
      btn.classList.toggle("selected", match);
    });
    customInput.parentElement.classList.toggle(
      "selected",
      !eraser && !isPaletteColor(currentColor)
    );
    currentSwatch.style.backgroundColor = eraser ? "transparent" : currentColor;
    eraserBtn.setAttribute("aria-pressed", eraser ? "true" : "false");
  }

  function isPaletteColor(color) {
    return PALETTE.some(function (c) {
      return c.toLowerCase() === color.toLowerCase();
    });
  }

  function selectColor(color) {
    currentColor = color;
    eraser = false;
    updateSelectionUI();
  }

  // ---- Painting ----
  function renderCell(index) {
    var color = cells[index];
    cellEls[index].style.backgroundColor = color || "";
  }

  function paintCell(index) {
    if (index < 0 || index >= TOTAL) return;
    var newVal = eraser ? null : currentColor;
    if (cells[index] === newVal) return;
    cells[index] = newVal;
    renderCell(index);
  }

  function indexFromEvent(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.classList && el.classList.contains("px")) {
      return parseInt(el.dataset.index, 10);
    }
    return -1;
  }

  // ---- Pointer events (mouse + touch + pen unified) ----
  board.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    isDrawing = true;
    if (board.setPointerCapture) {
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
    }
    var idx = indexFromEvent(e);
    if (idx >= 0) paintCell(idx);
  });

  board.addEventListener("pointermove", function (e) {
    if (!isDrawing) return;
    e.preventDefault();
    var idx = indexFromEvent(e);
    if (idx >= 0) paintCell(idx);
  });

  function endDraw() {
    isDrawing = false;
  }

  board.addEventListener("pointerup", endDraw);
  board.addEventListener("pointercancel", endDraw);
  // Safety: end drawing if pointer released anywhere (e.g. outside board).
  window.addEventListener("pointerup", endDraw);

  // ---- Custom color ----
  function onCustom() {
    selectColor(customInput.value);
  }
  customInput.addEventListener("input", onCustom);
  customInput.addEventListener("change", onCustom);

  // ---- Eraser toggle ----
  eraserBtn.addEventListener("click", function () {
    eraser = !eraser;
    updateSelectionUI();
  });

  // ---- Clear all ----
  clearBtn.addEventListener("click", function () {
    if (!window.confirm("전체 지우기 하시겠습니까?")) return;
    for (var i = 0; i < TOTAL; i++) {
      cells[i] = null;
      renderCell(i);
    }
  });

  // ---- PNG export ----
  saveBtn.addEventListener("click", function () {
    var size = GRID * EXPORT_SCALE; // 512
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    for (var i = 0; i < TOTAL; i++) {
      var color = cells[i];
      if (!color) continue; // empty stays transparent
      var x = (i % GRID) * EXPORT_SCALE;
      var y = Math.floor(i / GRID) * EXPORT_SCALE;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, EXPORT_SCALE, EXPORT_SCALE);
    }

    function triggerDownload(href, revoke) {
      var a = document.createElement("a");
      a.href = href;
      a.download = "pixel-art.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (revoke) {
        setTimeout(function () { URL.revokeObjectURL(href); }, 1000);
      }
    }

    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (blob) {
          triggerDownload(URL.createObjectURL(blob), true);
        } else {
          triggerDownload(canvas.toDataURL("image/png"), false);
        }
      }, "image/png");
    } else {
      triggerDownload(canvas.toDataURL("image/png"), false);
    }
  });

  // ---- Init ----
  updateSelectionUI();
})();
