let board = [];
let neighborCount = [];
let revealed = [];
let flagged = [];
let firstClick = true;
let gameOver = false;
let flagMode = false;

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
    const flagToggle = document.getElementById('flag-mode-toggle');
    if (flagToggle) {
        flagToggle.addEventListener('change', (e) => {
            flagMode = e.target.checked;
        });
    }
    
}

/**
 * Generates a new Minesweeper board with randomly placed mines, excluding the specified cell and its neighbors.
 *
 * The function initializes the global `board` array with mines, ensuring that the cell at {@link excludeRow}, {@link excludeCol} and its adjacent cells are always safe. It also computes and stores the number of adjacent mines for each cell in the global `neighborCount` array.
 *
 * @param {number} excludeRow - The row index of the cell to exclude from mine placement (typically the first clicked cell).
 * @param {number} excludeCol - The column index of the cell to exclude from mine placement.
 */
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

/**
 * Handles left-click events on a Minesweeper cell, revealing the cell or performing chording actions.
 *
 * If the cell is flagged or the game is over, the click is ignored. On the first click, generates the board excluding the clicked cell. If the cell is already revealed and has adjacent mines, performs chording: reveals all unflagged neighbors if the number of flagged neighbors matches the cell's mine count, ending the game if a mine is revealed. If flag mode is active and the click is not from a right-click, toggles the flag instead of revealing. Reveals the cell if it is not a mine; if it is a mine, ends the game and reveals all mines.
 *
 * @param {MouseEvent} event - The click event on the cell.
 * @param {boolean} [fromRight=false] - Indicates if the click originated from a right-click handler to prevent recursive toggling.
 */
function handleCellClick(event,fromRight=false) {
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
                                alert("Game Over! You hit a mine. Press Restart to play again.");
                                gameOver = true;
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

    if (flagMode && !fromRight) {
        handleCellRightClick(event,false);  // Treat tap as flag
        return;
    }
    
    if (board[r][c]) {
        revealMine(r, c);
        gameOver = true;
        revealAllMines();
        alert("Game Over! You hit a mine. Press Restart to play again.");
        return;
    }    

    revealCell(r, c);
    checkWin();
}


/**
 * Handles right-click events on a Minesweeper cell to toggle its flagged state.
 *
 * If flag mode is active and the event is not triggered from a left-click, treats the right-click as a reveal instead.
 *
 * @param {MouseEvent} event - The right-click event on the cell.
 * @param {boolean} [fromLeft=false] - Indicates if the event originated from a left-click handler to prevent recursion.
 */
function handleCellRightClick(event,fromLeft=false) {
    event.preventDefault();
    if (gameOver) return;
    if (flagMode && !fromLeft) {
        handleCellClick(event, true);
        return;
    }
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

/**
 * Reveals the cell at the specified row and column, recursively revealing neighboring cells if there are no adjacent mines.
 *
 * If the cell contains a mine, displays a bomb emoji and marks it as a mine. If the cell has adjacent mines, displays the count. If there are no adjacent mines, performs a flood fill to reveal all contiguous empty cells.
 *
 * @param {number} r - Row index of the cell to reveal.
 * @param {number} c - Column index of the cell to reveal.
 */
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
