/**
 * petalpunchXO — AI powered by Minimax, Alpha-Beta Pruning, and Q-Learning
 * 
 * Three AI strategies demonstrating different AI paradigms:
 * - Easy:   Q-Learning agent (learned from self-play via reinforcement learning)
 * - Medium: Depth-limited Minimax (classical adversarial search, depth 3)
 * - Hard:   Full Minimax with Alpha-Beta Pruning (optimal/unbeatable)
 *
 * The human is the MAX player, the AI is the MIN player.
 * Utility: +10 for human win, -10 for AI win, 0 for draw.
 */

// ============ STATE ============
const state = {
  board: Array(9).fill(null),   // null = empty, 'human' or 'ai'
  currentPlayer: 'human',
  difficulty: 'medium',
  gameOver: false,
  stats: { nodesExplored: 0, pruned: 0, depth: 0 },
  qTable: null,         // loaded from q_table.json
  qTableLoaded: false,
  gameTree: null,        // stores the last computed game tree for visualization
};

const HUMAN = 'human';
const AI = 'ai';

const WIN_COMBOS = [
  [0,1,2], [3,4,5], [6,7,8],   // rows
  [0,3,6], [1,4,7], [2,5,8],   // cols
  [0,4,8], [2,4,6],             // diags
];

// Win line coordinates (SVG viewBox is 300x300, board has 10px padding + 6px gaps)
// Each cell center: col * (94+6) + 10 + 47 = col*100 + 57, same for row
const cellCenter = (idx) => {
  const row = Math.floor(idx / 3);
  const col = idx % 3;
  const x = col * 100 + 57;
  const y = row * 100 + 57;
  return { x, y };
};

// ============ DOM ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {
  start: $('#screen-start'),
  game: $('#screen-game'),
  result: $('#screen-result'),
};

// ============ Q-TABLE LOADING ============
async function loadQTable() {
  try {
    const response = await fetch('assets/q_table.json');
    const data = await response.json();
    state.qTable = data.q_table;
    state.qTableLoaded = true;
    console.log(`Q-table loaded: ${Object.keys(state.qTable).length} states`);
    console.log('Training metadata:', data.metadata);
  } catch (e) {
    console.warn('Could not load Q-table, RL agent will fall back to random:', e);
    state.qTableLoaded = false;
  }
}

/**
 * Get the RL agent's move using the Q-table.
 * 
 * Board state mapping:
 *   Game uses 'human'/'ai'/null → Q-table uses 1/2/0
 *   Human = player 1 (goes first), AI = player 2
 * 
 * The Q-table was trained with self-play where the agent played both sides.
 * To use it as player 2 (AI), we look up the current state and pick
 * the action with the highest Q-value for the current player.
 */
function getQLearningMove() {
  // Convert board to Q-table format: human=1, ai=2, empty=0
  const qState = state.board.map(v => v === HUMAN ? 1 : v === AI ? 2 : 0);
  const stateKey = qState.join(',');
  
  const available = getAvailableMoves(state.board);
  
  if (state.qTable && state.qTable[stateKey]) {
    const qValues = state.qTable[stateKey];
    
    // Find available move with highest Q-value
    let bestMove = available[0];
    let bestQ = -Infinity;
    
    for (const move of available) {
      const q = parseFloat(qValues[String(move)] || 0);
      if (q > bestQ) {
        bestQ = q;
        bestMove = move;
      }
    }
    
    state.stats.nodesExplored = Object.keys(qValues).length;
    state.stats.depth = 0;
    return bestMove;
  }
  
  // Fallback: random move if state not in Q-table
  state.stats.nodesExplored = 1;
  state.stats.depth = 0;
  return available[Math.floor(Math.random() * available.length)];
}


// ============ SCREEN MANAGEMENT ============
function showScreen(name) {
  Object.values(screens).forEach(s => {
    s.classList.remove('active');
  });
  // small delay for transition
  setTimeout(() => {
    screens[name].classList.add('active');
  }, 50);
}

// ============ SPARKLES ============
function createSparkles() {
  const container = $('#sparkles');
  const chars = ['✦', '✧', '⋆', '✦', '♡'];
  for (let i = 0; i < 15; i++) {
    const el = document.createElement('span');
    el.className = 'sparkle';
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    el.style.left = Math.random() * 100 + '%';
    el.style.top = Math.random() * 100 + '%';
    el.style.animationDelay = Math.random() * 4 + 's';
    el.style.animationDuration = (3 + Math.random() * 3) + 's';
    el.style.fontSize = (8 + Math.random() * 8) + 'px';
    container.appendChild(el);
  }
}

// ============ CONFETTI ============
function spawnConfetti() {
  const colors = ['#ff69b4', '#c9b1ff', '#fce4ec', '#f8a4c8', '#fff', '#ffb6c1'];
  const shapes = ['♡', '✦', '⋆', '✿', '❀'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = -20 + 'px';
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.fontSize = (10 + Math.random() * 14) + 'px';
    el.style.animationDelay = Math.random() * 0.8 + 's';
    el.style.animationDuration = (2 + Math.random() * 2) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

// ============ GAME LOGIC ============
function checkWinner(board) {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', combo: null };
  }
  return null;
}

function getAvailableMoves(board) {
  return board.reduce((moves, cell, i) => {
    if (cell === null) moves.push(i);
    return moves;
  }, []);
}

// ============ MINIMAX + ALPHA-BETA PRUNING ============

/**
 * Evaluate board from MAX (human) perspective.
 * +10 if human wins, -10 if AI wins, 0 for draw or non-terminal.
 * Depth bonus: prefer faster wins / slower losses.
 */
function evaluate(board, depth) {
  const result = checkWinner(board);
  if (!result) return 0;
  if (result.winner === HUMAN) return 10 + depth;  // prefer fast wins
  if (result.winner === AI) return -10 - depth;      // prefer slow losses
  return 0; // draw
}

/**
 * Minimax with Alpha-Beta Pruning.
 * builds a game tree object for visualization when buildTree=true.
 * 
 * @param {Array} board - Current board state
 * @param {number} depth - Remaining depth to search
 * @param {boolean} isMaximizing - true if it's MAX's (human's) turn to evaluate
 * @param {number} alpha - Best score MAX can guarantee (lower bound)
 * @param {number} beta - Best score MIN can guarantee (upper bound)
 * @param {boolean} usePruning - Whether to apply alpha-beta pruning
 * @returns {{ score: number, move: number|null }}
 */
function minimax(board, depth, isMaximizing, alpha, beta, usePruning, buildTree = false) {
  state.stats.nodesExplored++;

  const result = checkWinner(board);
  if (result || depth === 0) {
    const score = evaluate(board, depth);
    return { 
      score, 
      move: null,
      tree: buildTree ? { board: [...board], score, children: [], isLeaf: true } : null
    };
  }

  const moves = getAvailableMoves(board);
  const treeNode = buildTree ? { 
    board: [...board], 
    children: [], 
    isMaximizing, 
    isLeaf: false 
  } : null;

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
      board[move] = HUMAN;
      const result = minimax(board, depth - 1, false, alpha, beta, usePruning, buildTree);
      board[move] = null;

      if (buildTree && result.tree) {
        result.tree.move = move;
        result.tree.score = result.score;
        treeNode.children.push(result.tree);
      }

      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }

      if (usePruning) {
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) {
          state.stats.pruned++;
          if (buildTree) {
            // Mark remaining moves as pruned
            for (let j = moves.indexOf(move) + 1; j < moves.length; j++) {
              treeNode.children.push({ 
                move: moves[j], 
                pruned: true, 
                board: [...board],
                score: null 
              });
            }
          }
          break;
        }
      }
    }

    if (buildTree) {
      treeNode.score = bestScore;
      treeNode.bestMove = bestMove;
    }
    return { score: bestScore, move: bestMove, tree: treeNode };

  } else {
    let bestScore = Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
      board[move] = AI;
      const result = minimax(board, depth - 1, true, alpha, beta, usePruning, buildTree);
      board[move] = null;

      if (buildTree && result.tree) {
        result.tree.move = move;
        result.tree.score = result.score;
        treeNode.children.push(result.tree);
      }

      if (result.score < bestScore) {
        bestScore = result.score;
        bestMove = move;
      }

      if (usePruning) {
        beta = Math.min(beta, bestScore);
        if (beta <= alpha) {
          state.stats.pruned++;
          if (buildTree) {
            for (let j = moves.indexOf(move) + 1; j < moves.length; j++) {
              treeNode.children.push({ 
                move: moves[j], 
                pruned: true, 
                board: [...board],
                score: null 
              });
            }
          }
          break;
        }
      }
    }

    if (buildTree) {
      treeNode.score = bestScore;
      treeNode.bestMove = bestMove;
    }
    return { score: bestScore, move: bestMove, tree: treeNode };
  }
}
/**
 * Get the AI's move based on difficulty.
 */
function getAIMove() {
  state.stats = { nodesExplored: 0, pruned: 0, depth: 0 };

  switch (state.difficulty) {
    case 'easy': {
      state.stats.depth = 0;
      return getQLearningMove();
    }

    case 'medium': {
      const maxDepth = 3;
      state.stats.depth = maxDepth;
      const { move } = minimax(
        [...state.board], maxDepth, false, -Infinity, Infinity, false
      );
      return move;
    }

    case 'hard': {
      const maxDepth = 9;
      state.stats.depth = maxDepth;
      // Build game tree for visualization (only top 2 levels to keep it manageable)
      const buildViz = getAvailableMoves(state.board).length <= 7;
      const { move, tree } = minimax(
        [...state.board], maxDepth, false, -Infinity, Infinity, true, buildViz
      );
      if (tree) state.gameTree = tree;
      return move;
    }
  }
}

// ============ AI EXPLAINER ============
function getAIExplanation(move, difficulty) {
  const cellNames = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];
  
  const pos = cellNames[move];
  const nodes = state.stats.nodesExplored.toLocaleString();
  const pruned = state.stats.pruned.toLocaleString();
  
  if (difficulty === 'easy') {
    if (state.qTableLoaded) {
      return `RL agent chose ${pos} — this move had the highest Q-value based on ${nodes} learned state-action pairs from self-play training.`;
    }
    return `Picked ${pos} randomly.`;
  }
  
  if (difficulty === 'medium') {
    return `Minimax searched ${nodes} possible futures (depth 3) and chose ${pos} as the strongest move.`;
  }
  
  if (difficulty === 'hard') {
    return `Alpha-beta pruning explored ${nodes} states, pruned ${pruned} branches, and chose ${pos}.`;
  }
}

// ============ UI UPDATES ============
function renderBoard() {
  const cells = $$('.cell');
  cells.forEach((cell, i) => {
    const val = state.board[i];
    if (val && !cell.classList.contains('taken')) {
      cell.classList.add('taken');
      const img = document.createElement('img');
      img.src = val === HUMAN ? 'assets/heart-gem.png' : 'assets/flower.png';
      img.alt = val === HUMAN ? 'heart' : 'flower';
      cell.appendChild(img);
    }
  });
}

function updatePlayerIndicator() {
  const tagYou = $('#tag-you');
  const tagAi = $('#tag-ai');
  if (state.currentPlayer === HUMAN) {
    tagYou.classList.add('active');
    tagAi.classList.remove('active');
  } else {
    tagYou.classList.remove('active');
    tagAi.classList.add('active');
  }
}

function updateStats() {
  $('#stat-nodes').textContent = state.stats.nodesExplored.toLocaleString();
  $('#stat-pruned').textContent = state.stats.pruned.toLocaleString();
  $('#stat-depth').textContent = state.stats.depth || '—';
}

function setStatus(text) {
  $('#game-status').textContent = text;
}

function showThinking(show) {
  $('#ai-thinking').classList.toggle('visible', show);
}


function showExplanation(text) {
  const el = $('#ai-explanation');
  if (el) {
    el.textContent = text;
    el.classList.add('visible');
  }
}

function hideExplanation() {
  const el = $('#ai-explanation');
  if (el) el.classList.remove('visible');
}

// ============ GAME FLOW ============
function handleCellClick(e) {
  const cell = e.currentTarget;
  const index = parseInt(cell.dataset.index);

  if (state.gameOver || state.currentPlayer !== HUMAN || state.board[index] !== null) {
    return;
  }

  // Human places piece
  state.board[index] = HUMAN;
  renderBoard();
  hideExplanation();

  // Check for game end
  const result = checkWinner(state.board);
  if (result) {
    endGame(result);
    return;
  }

  // Switch to AI
  state.currentPlayer = AI;
  updatePlayerIndicator();
  setStatus('');
  showThinking(true);

  // Delay for thinking animation
  setTimeout(() => {
    const aiMove = getAIMove();
    state.board[aiMove] = AI;
    renderBoard();
    updateStats();
    showThinking(false);

    // Show AI explanation
    const explanation = getAIExplanation(aiMove, state.difficulty);
    showExplanation(explanation);

    const result2 = checkWinner(state.board);
    if (result2) {
      endGame(result2);
      return;
    }

    state.currentPlayer = HUMAN;
    updatePlayerIndicator();
    setStatus('your turn ');
  }, 1200 + Math.random() * 400); // 500-900ms delay
}

function endGame(result) {
  state.gameOver = true;

  if (result.combo) {
    // Highlight winning cells
    result.combo.forEach(i => {
      $$('.cell')[i].classList.add('win-cell');
    });

    // Draw win line
    const [a, , c] = result.combo;
    const start = cellCenter(a);
    const end = cellCenter(c);
    const line = $('#win-line');
    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', end.x);
    line.setAttribute('y2', end.y);
    setTimeout(() => line.classList.add('drawn'), 50);
  }

  // Show result screen after delay
  setTimeout(() => {
    showResultScreen(result.winner);
  }, 1200);
}

function showResultScreen(winner) {
  const iconWrap = $('#result-icon-wrap');
  const title = $('#result-title');
  const sub = $('#result-sub');
  const statsDiv = $('#result-stats');

  iconWrap.innerHTML = '';

  if (winner === HUMAN) {
    iconWrap.innerHTML = '<img src="assets/heart-brooch.png" alt="win">';
    title.textContent = 'You Win!';
    sub.textContent = 'amazing job ♡';
    spawnConfetti();
  } else if (winner === AI) {
    iconWrap.innerHTML = '<img src="assets/bunny.png" alt="lose" style="width:120px">';
    title.textContent = 'You Lost';
    sub.textContent = 'the AI was too strong...';
  } else {
    iconWrap.innerHTML = '<img src="assets/flower.png" alt="draw">';
    title.textContent = "It's a Draw";
    sub.textContent = 'perfectly balanced ✿';
  }

  // Difficulty-specific result subtitle
  if (winner === AI && state.difficulty === 'hard') {
    sub.textContent = 'minimax with α-β pruning is unbeatable!';
  } else if (winner === AI && state.difficulty === 'easy') {
    sub.textContent = 'the RL agent learned well from self-play!';
  } else if (winner === HUMAN && state.difficulty === 'easy') {
    sub.textContent = 'you outsmarted the Q-learning agent!';
  }

  const algoName = state.difficulty === 'easy' ? 'Q-learning' : 
                   state.difficulty === 'medium' ? 'minimax' : 'α-β pruning';


  // Stats
  statsDiv.innerHTML = `
    <div class="result-stat">
      <span class="result-stat-label">nodes</span>
      <span class="result-stat-value">${state.stats.nodesExplored.toLocaleString()}</span>
    </div>
    <div class="result-stat">
      <span class="result-stat-label">pruned</span>
      <span class="result-stat-value">${state.stats.pruned.toLocaleString()}</span>
    </div>
    <div class="result-stat">
      <span class="result-stat-label">mode</span>
      <span class="result-stat-value">${state.difficulty}</span>
    </div>
  `;

  showScreen('result');
}

function resetGame() {
  state.board = Array(9).fill(null);
  state.currentPlayer = HUMAN;
  state.gameOver = false;
  state.stats = { nodesExplored: 0, pruned: 0, depth: 0 };
  state.gameTree = null;

  // Clear board UI
  $$('.cell').forEach(cell => {
    cell.classList.remove('taken', 'win-cell');
    cell.innerHTML = '';
  });

  // Clear win line
  const line = $('#win-line');
  line.classList.remove('drawn');
  line.setAttribute('x1', 0);
  line.setAttribute('y1', 0);
  line.setAttribute('x2', 0);
  line.setAttribute('y2', 0);

  updatePlayerIndicator();
  updateStats();
  setStatus('your turn');
  showThinking(false);
  hideExplanation();
}

// ============ EVENT LISTENERS ============
function init() {
  createSparkles();
  loadQTable(); // async load the RL policy

  // Difficulty selection
  $$('.btn-difficulty').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.btn-difficulty').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.difficulty = btn.dataset.difficulty;
    });
  });

  // Play button
  $('#btn-play').addEventListener('click', () => {
    resetGame();
    showScreen('game');
  });

  // Cell clicks
  $$('.cell').forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });

  // Game controls
  $('#btn-restart').addEventListener('click', resetGame);
  $('#btn-home').addEventListener('click', () => {
    resetGame();
    showScreen('start');
  });

  // Result screen buttons
  $('#btn-play-again').addEventListener('click', () => {
    resetGame();
    showScreen('game');
  });
  $('#btn-result-home').addEventListener('click', () => {
    resetGame();
    showScreen('start');
  });
}

// start
init();
