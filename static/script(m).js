let player = [0, 0];
let maze = [];
let timer;
let timeLeft = 30;
let playerName = '';
let moveCount = 0;
let end = [0, 0]; // updated from backend

function drawMaze() {
    const board = document.getElementById("board");
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${maze[0].length}, 40px)`;
    board.style.gridTemplateRows = `repeat(${maze.length}, 40px)`;

    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell ' + maze[y][x];
            if (x === 0 && y === 0) cell.classList.add('start-cell');
            if (x === end[0] && y === end[1]) cell.classList.add('end-cell');
            if (x === player[0] && y === player[1]) cell.classList.add('player');
            board.appendChild(cell);
        }
    }
}

function startTimer() {
    timeLeft = 30;
    document.getElementById('timer').textContent = `⏳ Time Left: ${timeLeft}s`;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = `⏳ Time Left: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            showGameOverModal("⏰ Time's up! You lost.");
        }
    }, 1000);
}

function startGame() {
    playerName = document.getElementById("player-name").value || "Anonymous";

    fetch(`/get_maze?name=${encodeURIComponent(playerName)}`)
        .then(res => res.json())
        .then(data => {
            maze = data.maze;
            player = data.player;
            end = data.end;
            drawMaze();
            startTimer();
            loadScoreboard();

            document.getElementById("start-screen").style.display = "none";
            document.getElementById("game-container").style.display = "flex";
            document.getElementById("welcome-msg").textContent = `Good luck, ${playerName}!`;
        });
}

function movePlayer(direction) {
    fetch('/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
    }).then(res => res.json())
      .then(data => {
        if (data.status === 'won') {
            clearInterval(timer);
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });

            let message = "🎉 You won the maze!";
            if (data.best_player) message += " 🥇 You're the best player!";
            else if (data.top_player) message += " 🏅 You're one of the top players!";

            setTimeout(() => {
                showGameOverModal(message);
                loadScoreboard();
            }, 300);
        } else if (data.status === 'ok') {
            moveCount++;
            maze = data.maze;
            player = data.player;
            end = data.end || end;
            if (moveCount % 3 === 0) shiftEndCell();

            if (player[0] === end[0] && player[1] === end[1]) {
                clearInterval(timer);
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
                setTimeout(() => {
                    showGameOverModal("🎉 You won the maze!");
                    loadScoreboard();
                }, 300);
            } else {
                drawMaze();
            }
        }
    });
}


function shiftEndCell() {
    let candidates = [];

    const lastRow = maze.length - 1;
    for (let x = 0; x < maze[0].length; x++) {
        if (maze[lastRow][x] === 0 && (x !== player[0] || lastRow !== player[1])) {
            candidates.push([x, lastRow]);
        }
    }

    const lastCol = maze[0].length - 1;
    for (let y = 0; y < maze.length; y++) {
        if (maze[y][lastCol] === 0 && (lastCol !== player[0] || y !== player[1])) {
            candidates.push([lastCol, y]);
        }
    }

    if (candidates.length > 0) {
        maze[end[1]][end[0]] = 0;
        end = candidates[Math.floor(Math.random() * candidates.length)];
        maze[end[1]][end[0]] = 2;
    }
}

function resetMaze() {
    fetch('/reset', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            maze = data.maze;
            player = data.player;
            end = data.end;
            moveCount = 0;
            drawMaze();
            startTimer();
            document.getElementById("game-over-modal").style.display = "none";
        });
}

function showHint() {
    fetch('/hint')
        .then(res => res.json())
        .then(data => {
            const path = data.hint;
            const board = document.getElementById('board');
            for (const [x, y] of path) {
                const index = y * maze[0].length + x;
                board.children[index].style.backgroundColor = '#f5dc58';
            }
            setTimeout(drawMaze, 2000);
        });
}

function loadScoreboard() {
    fetch('/scoreboard')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("scoreboard");
            list.innerHTML = '';
            data.forEach(entry => {
                const li = document.createElement("li");
                li.textContent = `${entry.player} - ${entry.time}s on ${entry.date}`;
                list.appendChild(li);
            });
        });
}

function showGameOverModal(message) {
    document.getElementById("game-over-message").textContent = message;
    document.getElementById("game-over-modal").style.display = "flex";
}

function startOver() {
    document.getElementById("game-over-modal").style.display = "none";
    resetMaze();
    document.getElementById("game-container").style.display = "none";
    document.getElementById("start-screen").style.display = "block";
    document.getElementById("player-name").value = "";
}

// Swipe Controls
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, false);

document.addEventListener('touchend', function (e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < 30 && absY < 30) return;

    let direction = null;
    if (absX > absY) {
        direction = dx > 0 ? 'right' : 'left';
    } else {
        direction = dy > 0 ? 'down' : 'up';
    }

    vibrate();
    showDirectionToast(directionArrow(direction));
    movePlayer(direction);
}, false);

function vibrate() {
    if (navigator.vibrate) navigator.vibrate(50);
}

function directionArrow(dir) {
    return {
        up: '⬆️ Up',
        down: '⬇️ Down',
        left: '⬅️ Left',
        right: '➡️ Right'
    }[dir];
}

function showDirectionToast(message) {
    const toast = document.getElementById("swipe-toast");
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, 700);
}

document.addEventListener('keydown', e => {
    const keyMap = {
        'ArrowUp': 'up', 'w': 'up',
        'ArrowDown': 'down', 's': 'down',
        'ArrowLeft': 'left', 'a': 'left',
        'ArrowRight': 'right', 'd': 'right',
        'r': 'reset', 'R': 'reset'
    };
    const action = keyMap[e.key];
    const isGameActive = document.getElementById("game-container").style.display !== "none";
    if (!isGameActive) return;

    if (action === 'reset') resetMaze();
    else if (action) movePlayer(action);
});
