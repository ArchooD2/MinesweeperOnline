let board = [];
let neighborCount = [];
let revealed = [];
let flagged = [];
let firstClick = true;
let gameOver = false;

function initGame() {
    // Initialize the revealed and flagged status arrays
    for (let r = 0; r < BOARD_SIZE; r++) {
        revealed[r] = [];
        flagged[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            revealed[r][c] = false;
            flagged[r][c] = false;
        }
    }
    // Build the HTML table for the board
    const container = document.getElementById('game-container');
    const table = document.createElement('table');
    for (let r = 0; r < BOARD_SIZE; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < BOARD_SIZE; c++) {
            const td = document.createElement('td');
            td.setAttribute('data-row', r);
            td.setAttribute('data-col', c);
            // Attach event listeners for left-click and right-click
            td.addEventListener('click', handleCellClick);
            td.addEventListener('contextmenu', handleCellRightClick);
            td.addEventListener('mouseenter', handleMouseEnter);
            td.addEventListener('mouseleave', handleMouseLeave);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    container.innerHTML = '';
    container.appendChild(table);
    // Attach reset button event
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => location.reload());
    }
}

function generateBoard(excludeRow, excludeCol) {
    // Create an empty board and place mines randomly, excluding the first clicked cell
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
    let totalCells = BOARD_SIZE * BOARD_SIZE;
    let mineCount = NUM_MINES;
    // List all possible cell indices except the one to exclude
    let candidates = [];
    for (let i = 0; i < totalCells; i++) {
        let r = Math.floor(i / BOARD_SIZE);
        let c = i % BOARD_SIZE;
        let isSafeZone = Math.abs(r - excludeRow) <= 1 && Math.abs(c - excludeCol) <= 1;
        if (isSafeZone) continue;
        candidates.push(i);
    }
    // Shuffle the list of candidates
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    // Pick the first mineCount positions for mines
    for (let k = 0; k < mineCount && k < candidates.length; k++) {
        let idx = candidates[k];
        let r = Math.floor(idx / BOARD_SIZE);
        let c = idx % BOARD_SIZE;
        board[r][c] = true;
    }
    // Calculate neighbor mine counts for each cell
    neighborCount = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c]) {
                continue;
            }
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    let nr = r + dr;
                    let nc = c + dc;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                        if (board[nr][nc]) count++;
                    }
                }
            }
            neighborCount[r][c] = count;
        }
    }
}

function handleCellClick(event) {
    if (gameOver) return;

    const cell = event.currentTarget;
    const r = parseInt(cell.getAttribute('data-row'));
    const c = parseInt(cell.getAttribute('data-col'));

    if (flagged[r][c]) return;

    if (firstClick) {
        generateBoard(r, c);
        firstClick = false;
    }

    if (revealed[r][c]) {
        // --- CHORDING ---
        const count = neighborCount[r][c];
        if (count > 0) {
            let flaggedCount = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr;
                    let nc = c + dc;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                        if (flagged[nr][nc]) flaggedCount++;
                    }
                }
            }
            if (flaggedCount === count) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        let nr = r + dr;
                        let nc = c + dc;
                        if (
                            nr >= 0 && nr < BOARD_SIZE &&
                            nc >= 0 && nc < BOARD_SIZE &&
                            !revealed[nr][nc] && !flagged[nr][nc]
                        ) {
                            if (board[nr][nc]) {
                                revealMine(nr, nc);
                                revealAllMines();
                                alert("Game Over! You hit a mine.");
                                location.reload();
                                return;
                            }
                            revealCell(nr, nc);
                        }
                    }
                }
                checkWin();
            }
        }
        return; // Don't do normal reveal again if already revealed
    }

    if (board[r][c]) {
        revealMine(r, c);
        gameOver = true;
        revealAllMines();
        alert("Game Over! You hit a mine.");
        location.reload();
        return;
    }

    revealCell(r, c);
    checkWin();
}


function handleCellRightClick(event) {
    event.preventDefault();
    if (gameOver) return;
    const cell = event.currentTarget;
    const r = parseInt(cell.getAttribute('data-row'));
    const c = parseInt(cell.getAttribute('data-col'));
    if (revealed[r][c]) {
        return; // cannot flag an already revealed cell
    }
    if (flagged[r][c]) {
        // Unflag the cell
        flagged[r][c] = false;
        cell.classList.remove('flagged');
        cell.textContent = '';
    } else {
        // Flag the cell
        flagged[r][c] = true;
        cell.classList.add('flagged');
        cell.textContent = '\uD83D\uDEA9'; // 🚩 flag emoji
    }
}

function revealCell(r, c) {
    // Reveal cell at (r,c); if it has 0 adjacent mines, flood-fill neighbors
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;
    if (revealed[r][c] || flagged[r][c]) return;
    const table = document.querySelector('#game-container table');
    const cell = table.rows[r].cells[c];
    revealed[r][c] = true;
    cell.classList.add('revealed');
    if (board[r][c]) {
        // If somehow revealing a mine (shouldn't happen here)
        cell.textContent = '\uD83D\uDCA3'; // 💣 bomb emoji
        cell.classList.add('mine');
        return;
    }
    const count = neighborCount[r][c];
    if (count > 0) {
        // Show the number of adjacent mines
        cell.textContent = count;
        cell.classList.add('number-' + count);
    } else {
        // Empty cell, recursively reveal neighbors
        cell.textContent = '';
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                revealCell(r + dr, c + dc);
            }
        }
    }
}

function revealMine(r, c) {
    // Reveal a mine at (r,c)
    const table = document.querySelector('#game-container table');
    const cell = table.rows[r].cells[c];
    cell.classList.add('revealed');
    cell.textContent = '\uD83D\uDCA3'; // 💣 bomb emoji
    cell.classList.add('mine');
}

function revealAllMines() {
    // Reveal all mines (called on game over)
    const table = document.querySelector('#game-container table');
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] && !revealed[r][c]) {
                const cell = table.rows[r].cells[c];
                cell.classList.add('revealed');
                cell.textContent = '\uD83D\uDCA3'; // 💣
                cell.classList.add('mine');
            }
        }
    }
}

function checkWin() {
    // Check if all non-mine cells have been revealed
    let revealedCount = 0;
    let totalSafe = BOARD_SIZE * BOARD_SIZE - NUM_MINES;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (revealed[r][c]) revealedCount++;
        }
    }
    if (revealedCount === totalSafe) {
        gameOver = true;
        // Flag remaining mines for visual feedback
        const table = document.querySelector('#game-container table');
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] && !revealed[r][c]) {
                    const cell = table.rows[r].cells[c];
                    cell.textContent = '\uD83D\uDEA9';
                    cell.classList.add('flagged');
                }
            }
        }
        alert('Congratulations! You cleared the board! Moving to the next level...');
        // Notify the server to update the user's progress, then reload for next level
        fetch('/win', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ size: BOARD_SIZE })
        }).then(response => {
            location.reload();
        });
    }
}

// Start the game when the page loads
initGame();

function handleMouseEnter(event) {
    const cell = event.currentTarget;
    const r = parseInt(cell.getAttribute('data-row'));
    const c = parseInt(cell.getAttribute('data-col'));

    if (!revealed[r][c]) return;

    const count = neighborCount[r][c];
    if (count <= 0) return;

    const table = document.querySelector('#game-container table');
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            let nr = r + dr;
            let nc = c + dc;
            if (
                nr >= 0 && nr < BOARD_SIZE &&
                nc >= 0 && nc < BOARD_SIZE &&
                !revealed[nr][nc]
            ) {
                const neighbor = table.rows[nr].cells[nc];
                neighbor.classList.add('chording-hover');
            }
        }
    }
}

function handleMouseLeave(event) {
    const table = document.querySelector('#game-container table');
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            table.rows[r].cells[c].classList.remove('chording-hover');
        }
    }
}
