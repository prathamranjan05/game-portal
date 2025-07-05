const boardDiv = document.getElementById('game-board');
const statusDiv = document.getElementById('status');
const resetBtn = document.getElementById('restart-btn');
const resetScoreboardBtn = document.getElementById('reset-scoreboard-btn');
const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');
const toast = document.getElementById('ttt-toast');

let gameOver = false;
let currentPlayer = "X";
let lastAIMoveCell = null;
let firstMoveMade = false;

// ✅ Default to AI mode on first visit
if (!localStorage.getItem("ttt-mode")) {
  localStorage.setItem("ttt-mode", "AI");
}

// ✅ Reflect saved mode in UI
let isTwoPlayer = localStorage.getItem("ttt-mode") === "2P";
modeToggle.checked = isTwoPlayer;
modeLabel.textContent = "2 Player Mode";  // ✅ Always show this text

// ✅ Toggle Handler
modeToggle.addEventListener("change", () => {
  isTwoPlayer = modeToggle.checked;
  const newMode = isTwoPlayer ? "2P" : "AI";
  localStorage.setItem("ttt-mode", newMode);
  modeLabel.textContent = "2 Player Mode";  // ✅ Static label
  showToast(`Mode set to ${isTwoPlayer ? '2 Player' : 'Vs AI'}`);
  resetGame();
});

// ✅ Reset game without full reload
function resetGame() {
  fetch("/ttt-reset", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        gameOver = false;
        currentPlayer = "X";
        firstMoveMade = false;
        boardDiv.innerHTML = "";
        setupBoard();
        statusDiv.textContent = isTwoPlayer ? "Player X's turn" : "Your turn (X)";
        modeToggle.disabled = false;
        modeToggle.style.opacity = 1;
        modeLabel.textContent = "2 Player Mode";  // ✅ Reapply static label
      }
    });
}

// ✅ Create board cells dynamically
function setupBoard() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add('mini-border-right');
      if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add('mini-border-bottom');
      cell.addEventListener('click', () => {
        if (cell.classList.contains('x') || cell.classList.contains('o') || cell.classList.contains('locked') || gameOver) return;
        if (!isTwoPlayer && currentPlayer !== "X") return;
        makeMove(r, c);
      });
      boardDiv.appendChild(cell);
    }
  }
}
setupBoard();

// Instruction modal
const instructionsModal = document.getElementById('instructions-modal');
document.getElementById('open-instructions-btn').onclick = () => instructionsModal.style.display = 'flex';
document.getElementById('close-instructions-btn').onclick = () => instructionsModal.style.display = 'none';
window.addEventListener('click', e => { if (e.target === instructionsModal) instructionsModal.style.display = 'none'; });

// Scoreboard
let xWins = parseInt(localStorage.getItem('xWins')) || 0;
let oWins = parseInt(localStorage.getItem('oWins')) || 0;
let draws = parseInt(localStorage.getItem('draws')) || 0;

function updateScoreboard() {
  document.getElementById("x-wins").textContent = xWins;
  document.getElementById("o-wins").textContent = oWins;
  document.getElementById("draws").textContent = draws;
}
updateScoreboard();

// Lock toggle after first move
function lockToggle() {
  modeToggle.disabled = true;
  modeToggle.style.opacity = 0.4;
}

// Toast
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 2000);
}

// Reset buttons
resetBtn.onclick = () => {
  fetch("/ttt-reset", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem('ttt-mode', isTwoPlayer ? "2P" : "AI");
        modeToggle.disabled = false;
        modeToggle.style.opacity = 1;
        showToast("Select a mode before your first move!");
        location.reload();
      }
    });
};

resetScoreboardBtn.onclick = () => {
  xWins = oWins = draws = 0;
  localStorage.setItem('xWins', 0);
  localStorage.setItem('oWins', 0);
  localStorage.setItem('draws', 0);
  updateScoreboard();
};

function triggerConfetti() {
  if (window.confetti) {
    confetti({ particleCount: 500, spread: 90, origin: { y: 0.6 } });
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
    script.onload = () => confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
    document.head.appendChild(script);
  }
}

function handleGameOver(winner) {
  gameOver = true;
  const modal = document.getElementById("ttt-modal");
  const resultText = document.getElementById("ttt-result-text");

  if (winner === "D") {
    resultText.textContent = "It's a Draw!";
    draws++;
  } else {
    resultText.textContent = winner === "X" ? "Player X Wins!" : (isTwoPlayer ? "Player O Wins!" : "AI O Wins!");
    winner === "X" ? xWins++ : oWins++;
    triggerConfetti();
  }

  localStorage.setItem('xWins', xWins);
  localStorage.setItem('oWins', oWins);
  localStorage.setItem('draws', draws);
  updateScoreboard();
  modal.style.display = "flex";
}

document.getElementById("ttt-close").onclick = () => document.getElementById("ttt-modal").style.display = "none";
document.getElementById("ttt-restart").onclick = () => resetBtn.click();
window.onclick = e => {
  if (e.target.id === "ttt-modal") document.getElementById("ttt-modal").style.display = "none";
};

async function makeMove(r, c) {
  if (gameOver) return;

  if (!firstMoveMade) {
    lockToggle();
    firstMoveMade = true;
  }

  const res = await fetch('/ttt-move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row: r, col: c, player: currentPlayer, mode: isTwoPlayer ? "2P" : "AI" })
  });
  const data = await res.json();
  if (data.invalid) return;
  updateBoard(data);

  if (data.game_over) {
    handleGameOver(data.winner);
    return;
  }

  if (!isTwoPlayer && currentPlayer === "O") {
    const resAI = await fetch('/ttt-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: 'O', mode: "AI" })
    });
    const dataAI = await resAI.json();
    if (!dataAI.invalid) {
      updateBoard(dataAI);
      if (dataAI.game_over) handleGameOver(dataAI.winner);
    }
  }
}

function updateBoard(data) {
  currentPlayer = data.current_player;
  gameOver = data.game_over;
  statusDiv.textContent = `Current Player: ${currentPlayer}`;

  if (lastAIMoveCell) lastAIMoveCell.classList.remove("ai-last-move");

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = boardDiv.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
      const val = data.board[r][c];
      cell.textContent = val;
      cell.classList.remove('x', 'o', 'ai-last-move');
      if (val === "X") cell.classList.add('x');
      else if (val === "O") cell.classList.add('o');
    }
  }

  if (data.ai_last_move) {
    const { row, col } = data.ai_last_move;
    const cell = boardDiv.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
    if (cell) {
      cell.classList.add('ai-last-move');
      lastAIMoveCell = cell;
    }
  }

  if (data.active_board !== -1) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = boardDiv.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
        const miniBoardIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        cell.classList.toggle('locked', miniBoardIndex !== data.active_board);
      }
    }
  } else {
    document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('locked'));
  }

  for (let mr = 0; mr < 3; mr++) {
    for (let mc = 0; mc < 3; mc++) {
      const status = data.mini_status[mr][mc];
      for (let rr = mr * 3; rr < mr * 3 + 3; rr++) {
        for (let cc = mc * 3; cc < mc * 3 + 3; cc++) {
          const cell = boardDiv.querySelector(`.cell[data-row='${rr}'][data-col='${cc}']`);
          cell.classList.remove('mini-win-x', 'mini-win-o');
          if (status === "X") cell.classList.add('mini-win-x');
          else if (status === "O") cell.classList.add('mini-win-o');
        }
      }
    }
  }
}
