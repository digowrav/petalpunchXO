/**
 * Game Tree Visualizer for petalpunchXO
 * 
 * Renders an interactive, expandable minimax game tree.
 * Starts showing only 2 levels, with "expand" buttons to go deeper.
 * Each node shows a mini board, score, and move label.
 */

// ============ TREE STATE ============
let currentMaxDepth = 2; // start with 2 levels visible
let currentSimplifiedTree = null;

// ============ TREE SIMPLIFICATION ============
function simplifyTree(tree, maxDepth = 2, currentDepth = 0) {
  if (!tree || currentDepth >= maxDepth) return null;

  const node = {
    board: tree.board || [],
    score: tree.score,
    move: tree.move,
    isLeaf: tree.isLeaf || currentDepth === maxDepth - 1,
    pruned: tree.pruned || false,
    isMaximizing: tree.isMaximizing,
    isBestMove: false,
    hasHiddenChildren: false,
    children: []
  };

  if (tree.children && tree.children.length > 0) {
    // Check if we're at the depth limit but there ARE children
    if (currentDepth === maxDepth - 1 && tree.children.some(c => !c.pruned && !c.isEllipsis)) {
      node.hasHiddenChildren = true;
    }

    // Limit to 5 children max per node for readability
    const maxChildren = 5;
    const displayChildren = tree.children.slice(0, maxChildren);
    const hasMore = tree.children.length > maxChildren;

    for (const child of displayChildren) {
      const simplified = simplifyTree(child, maxDepth, currentDepth + 1);
      if (simplified) {
        if (child.move === tree.bestMove) {
          simplified.isBestMove = true;
        }
        node.children.push(simplified);
      } else if (child.pruned) {
        node.children.push({
          pruned: true,
          move: child.move,
          board: child.board,
          score: null
        });
      }
    }

    if (hasMore) {
      node.children.push({
        isEllipsis: true,
        count: tree.children.length - maxChildren
      });
    }
  }

  return node;
}

// ============ MINI BOARD RENDERER ============
function renderMiniBoard(board, size = 48) {
  const cellSize = size / 3;
  const pad = 1;
  let svg = '';

  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = col * cellSize + pad;
    const y = row * cellSize + pad;
    const w = cellSize - pad * 2;
    const h = cellSize - pad * 2;

    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" 
            fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>`;

    if (board[i] === 'human' || board[i] === 1) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      svg += `<circle cx="${cx}" cy="${cy}" r="${w * 0.28}" fill="#ff69b4" opacity="0.9"/>`;
    } else if (board[i] === 'ai' || board[i] === 2) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      svg += `<circle cx="${cx}" cy="${cy}" r="${w * 0.28}" fill="#c9b1ff" opacity="0.9"/>`;
    }
  }

  return svg;
}

// ============ LAYOUT ENGINE ============
function layoutTree(node, x, y, availableWidth, levelHeight, depth = 0) {
  if (!node) return [];

  const positions = [{ node, x, y, depth }];

  if (node.children && node.children.length > 0) {
    const childCount = node.children.length;
    const nodeSpacing = 120; // minimum px between child centers
    const totalNeeded = (childCount - 1) * nodeSpacing;
    const actualWidth = Math.min(totalNeeded, availableWidth * 0.9);
    const startX = x - actualWidth / 2;
    const childSpacing = childCount > 1 ? actualWidth / (childCount - 1) : 0;

    for (let i = 0; i < childCount; i++) {
      const child = node.children[i];
      const childX = childCount === 1 ? x : startX + i * childSpacing;
      const childY = y + levelHeight;

      if (child.isEllipsis) {
        positions.push({
          node: child,
          x: childX,
          y: childY,
          depth: depth + 1,
          parentX: x,
          parentY: y
        });
      } else {
        const childPositions = layoutTree(
          child, childX, childY, 
          availableWidth / childCount, levelHeight, depth + 1
        );
        if (childPositions.length > 0) {
          childPositions[0].parentX = x;
          childPositions[0].parentY = y;
        }
        positions.push(...childPositions);
      }
    }
  }

  return positions;
}

// ============ MAIN RENDER ============
function renderGameTreeSVG(tree) {
  if (!tree) {
    return '<div class="tree-empty">No game tree available. Play on Hard mode to see the AI\'s decision tree.</div>';
  }

  const simplified = simplifyTree(tree, currentMaxDepth);
  currentSimplifiedTree = simplified;
  if (!simplified) {
    return '<div class="tree-empty">Tree too small to visualize.</div>';
  }

  // Count levels for dynamic sizing
  function countLevels(n, d = 0) {
    if (!n || !n.children || n.children.length === 0) return d;
    let max = d;
    for (const c of n.children) {
      if (!c.isEllipsis && !c.pruned) max = Math.max(max, countLevels(c, d + 1));
    }
    return max;
  }

  // Count max width at each level
  function countMaxWidth(n) {
    if (!n || !n.children) return 1;
    let total = 0;
    for (const c of n.children) {
      if (!c.isEllipsis) total += countMaxWidth(c);
      else total += 1;
    }
    return Math.max(1, total);
  }

  const levels = countLevels(simplified) + 1;
  const maxLeaves = countMaxWidth(simplified);
  const nodeSpacing = 120;
  const levelHeight = 140;
  const padding = 80;

  const svgWidth = Math.max(600, maxLeaves * nodeSpacing + padding * 2);
  const svgHeight = levels * levelHeight + padding;

  const positions = layoutTree(simplified, svgWidth / 2, 50, svgWidth - padding * 2, levelHeight);

  let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" 
             class="tree-svg" style="min-width:${Math.min(svgWidth, 1400)}px">`;

  // Glow filter
  svg += `<defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

  // ---- EDGES ----
  const nodeHeight = 80;
  for (const pos of positions) {
    if (pos.parentX === undefined) continue;

    const isBest = pos.node.isBestMove;
    const isPruned = pos.node.pruned;

    let strokeColor, strokeWidth, dashArray, opacity;
    if (isPruned) {
      strokeColor = 'rgba(255,255,255,0.08)';
      strokeWidth = 1;
      dashArray = '6,4';
      opacity = 0.5;
    } else if (isBest) {
      strokeColor = '#ff69b4';
      strokeWidth = 2.5;
      dashArray = 'none';
      opacity = 1;
    } else {
      strokeColor = 'rgba(255,255,255,0.15)';
      strokeWidth = 1;
      dashArray = 'none';
      opacity = 0.8;
    }

    svg += `<line x1="${pos.parentX}" y1="${pos.parentY + nodeHeight / 2 + 4}" 
            x2="${pos.x}" y2="${pos.y - 8}"
            stroke="${strokeColor}" stroke-width="${strokeWidth}" 
            stroke-dasharray="${dashArray}" opacity="${opacity}"
            ${isBest ? 'filter="url(#softglow)"' : ''}/>`;
  }

  // ---- NODES ----
  const cellNames = ['TL','TC','TR','ML','C','MR','BL','BC','BR'];
  const nodeWidth = 76;

  for (const pos of positions) {
    const n = pos.node;

    // Ellipsis node
    if (n.isEllipsis) {
      svg += `<text x="${pos.x}" y="${pos.y + 10}" text-anchor="middle" 
              fill="rgba(255,255,255,0.35)" font-family="Silkscreen, cursive" 
              font-size="10">+${n.count} more</text>`;
      continue;
    }

    // Pruned node
    if (n.pruned) {
      svg += `<rect x="${pos.x - 24}" y="${pos.y - 4}" width="48" height="28" rx="8"
              fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" 
              stroke-width="0.5" stroke-dasharray="4,3"/>`;
      svg += `<text x="${pos.x}" y="${pos.y + 14}" text-anchor="middle" 
              fill="rgba(255,255,255,0.25)" font-size="12">✂</text>`;
      if (n.move !== undefined) {
        svg += `<text x="${pos.x}" y="${pos.y - 10}" text-anchor="middle" 
                fill="rgba(255,255,255,0.2)" font-family="Silkscreen, cursive" 
                font-size="8">${cellNames[n.move] || ''}</text>`;
      }
      continue;
    }

    // Regular node
    const isBest = n.isBestMove;
    const nx = pos.x - nodeWidth / 2;
    const ny = pos.y - 4;

    // Background
    const bg = isBest ? 'rgba(255,105,180,0.18)' : 'rgba(40,20,60,0.5)';
    const border = isBest ? 'rgba(255,105,180,0.5)' : 'rgba(255,255,255,0.1)';

    svg += `<rect x="${nx}" y="${ny}" width="${nodeWidth}" height="${nodeHeight}" 
            rx="10" fill="${bg}" stroke="${border}" 
            stroke-width="${isBest ? 1.5 : 0.5}"
            ${isBest ? 'filter="url(#glow)"' : ''}/>`;

    // Mini board
    const boardSize = 48;
    const boardX = pos.x - boardSize / 2;
    const boardY = ny + 6;
    svg += `<g transform="translate(${boardX}, ${boardY})">`;
    svg += renderMiniBoard(n.board, boardSize);
    svg += `</g>`;

    // Score
    const scoreY = ny + nodeHeight - 10;
    const scoreColor = n.score > 0 ? '#ff69b4' : n.score < 0 ? '#c9b1ff' : 'rgba(255,255,255,0.5)';
    const scoreText = n.score !== null && n.score !== undefined ?
      (n.score > 0 ? `+${n.score}` : `${n.score}`) : '?';
    svg += `<text x="${pos.x}" y="${scoreY}" text-anchor="middle" 
            fill="${scoreColor}" font-family="'Press Start 2P', cursive" 
            font-size="8">${scoreText}</text>`;

    // Move label above node
    if (n.move !== undefined && n.move !== null) {
      svg += `<text x="${pos.x}" y="${ny - 6}" text-anchor="middle" 
              fill="rgba(255,255,255,0.4)" font-family="Silkscreen, cursive" 
              font-size="8">${cellNames[n.move]}</text>`;
    }

    // MAX/MIN label for root
    if (pos.depth === 0) {
      const label = n.isMaximizing === false ? 'MIN' : 'MAX';
      const labelColor = n.isMaximizing === false ? '#c9b1ff' : '#ff69b4';
      svg += `<text x="${nx - 6}" y="${ny + nodeHeight / 2 + 3}" text-anchor="end" 
              fill="${labelColor}" font-family="Silkscreen, cursive" 
              font-size="9" opacity="0.7">${label}</text>`;
    }

    // "Has more" indicator (expandable children hidden)
    if (n.hasHiddenChildren && n.children.length === 0) {
      svg += `<text x="${pos.x}" y="${ny + nodeHeight + 16}" text-anchor="middle" 
              fill="rgba(201,177,255,0.5)" font-family="Silkscreen, cursive" 
              font-size="7">▼ deeper</text>`;
    }
  }

  svg += `</svg>`;

  // Legend
  svg += `
    <div class="tree-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background:#ff69b4"></span>
        <span>chosen path</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:#c9b1ff"></span>
        <span>AI (MIN)</span>
      </div>
      <div class="legend-item">
        <span style="opacity:0.4;font-size:10px">✂</span>
        <span>pruned</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:rgba(255,255,255,0.25)"></span>
        <span>explored</span>
      </div>
    </div>
  `;

  return svg;
}

// ============ PANEL CONTROLS ============
function toggleTreePanel() {
  const panel = document.getElementById('tree-panel');
  const overlay = document.getElementById('tree-overlay');
  if (!panel) return;

  const isVisible = panel.classList.contains('visible');

  if (isVisible) {
    panel.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
  } else {
    currentMaxDepth = 2;
    refreshTreeContent();
    panel.classList.add('visible');
    if (overlay) overlay.classList.add('visible');
  }
}

function expandTree() {
  currentMaxDepth++;
  if (currentMaxDepth > 5) currentMaxDepth = 5; // cap at 5 levels
  refreshTreeContent();
}

function collapseTree() {
  currentMaxDepth = Math.max(2, currentMaxDepth - 1);
  refreshTreeContent();
}

function refreshTreeContent() {
  const content = document.getElementById('tree-content');
  if (!content) return;

  if (typeof state !== 'undefined' && state.gameTree) {
    content.innerHTML = renderGameTreeSVG(state.gameTree);
  } else {
    content.innerHTML = '<div class="tree-empty">Make a move on Hard mode to see the decision tree!</div>';
  }

  // Update depth indicator
  const depthLabel = document.getElementById('tree-depth-label');
  if (depthLabel) {
    depthLabel.textContent = `showing ${currentMaxDepth} levels`;
  }
}

// Export
window.toggleTreePanel = toggleTreePanel;
window.expandTree = expandTree;
window.collapseTree = collapseTree;
window.renderGameTreeSVG = renderGameTreeSVG;
