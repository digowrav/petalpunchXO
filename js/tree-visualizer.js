/**
 * Game Tree Visualizer for petalpunchXO
 * 
 * Renders an interactive minimax game tree showing:
 * - Nodes the AI explored (with scores)
 * - The path the AI chose (highlighted)
 * - Pruned branches (grayed out with ✂ icon)
 * - MAX vs MIN layers
 * - Mini board previews at each node
 * 
 * This only activates on Hard mode (full minimax + α-β pruning)
 * since that's the only mode that builds a complete game tree.
 */

// ============ TREE VISUALIZATION ============

/**
 * Build a simplified tree for rendering.
 * We limit depth to 3 levels to keep it readable.
 * Each node shows: board state, score, whether it was chosen, pruned.
 */
function simplifyTree(tree, maxDepth = 3, currentDepth = 0) {
  if (!tree || currentDepth >= maxDepth) return null;

  const node = {
    board: tree.board || [],
    score: tree.score,
    move: tree.move,
    isLeaf: tree.isLeaf || currentDepth === maxDepth - 1,
    pruned: tree.pruned || false,
    isMaximizing: tree.isMaximizing,
    isBestMove: false,
    children: []
  };

  if (tree.children && tree.children.length > 0) {
    // Limit to first 4 children for readability
    const displayChildren = tree.children.slice(0, 4);
    const hasMore = tree.children.length > 4;

    for (const child of displayChildren) {
      const simplified = simplifyTree(child, maxDepth, currentDepth + 1);
      if (simplified) {
        // Mark the best move
        if (child.move === tree.bestMove) {
          simplified.isBestMove = true;
        }
        node.children.push(simplified);
      }
    }

    if (hasMore) {
      node.children.push({
        isEllipsis: true,
        count: tree.children.length - 4
      });
    }
  }

  return node;
}

/**
 * Render a mini tic-tac-toe board as SVG.
 */
function renderMiniBoard(board, size = 42) {
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

    // Cell background
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" 
            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>`;

    if (board[i] === 'human' || board[i] === 1) {
      // Heart (pink circle for human)
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = w * 0.3;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ff69b4" opacity="0.9"/>`;
    } else if (board[i] === 'ai' || board[i] === 2) {
      // Flower (lavender circle for AI)
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = w * 0.3;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#c9b1ff" opacity="0.9"/>`;
    }
  }

  return svg;
}

/**
 * Calculate tree layout positions using a simple recursive layout.
 */
function layoutTree(node, x, y, levelWidth, levelHeight, depth = 0) {
  if (!node) return [];

  const positions = [];
  const pos = { node, x, y, depth };
  positions.push(pos);

  if (node.children && node.children.length > 0) {
    const childCount = node.children.length;
    const totalWidth = levelWidth / Math.pow(1.8, depth);
    const startX = x - totalWidth / 2;
    const childSpacing = totalWidth / (childCount > 1 ? childCount - 1 : 1);

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
        const childPositions = layoutTree(child, childX, childY, levelWidth, levelHeight, depth + 1);
        // Add parent connection info
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

/**
 * Render the full game tree as an SVG string.
 */
function renderGameTreeSVG(tree) {
  if (!tree) return '<div class="tree-empty">No game tree available. Play on Hard mode to see the AI\'s decision tree.</div>';

  const simplified = simplifyTree(tree, 3);
  if (!simplified) return '<div class="tree-empty">Tree too small to visualize.</div>';

  const svgWidth = 700;
  const svgHeight = 360;
  const levelHeight = 110;
  const positions = layoutTree(simplified, svgWidth / 2, 40, svgWidth * 0.85, levelHeight);

  let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" class="tree-svg">`;

  // Draw edges first (behind nodes)
  for (const pos of positions) {
    if (pos.parentX !== undefined && pos.parentY !== undefined) {
      const isBest = pos.node.isBestMove;
      const isPruned = pos.node.pruned;
      const strokeColor = isPruned ? 'rgba(255,255,255,0.1)' : 
                          isBest ? '#ff69b4' : 'rgba(255,255,255,0.25)';
      const strokeWidth = isBest ? 2.5 : 1;
      const dashArray = isPruned ? '4,4' : 'none';

      svg += `<line x1="${pos.parentX}" y1="${pos.parentY + 24}" 
              x2="${pos.x}" y2="${pos.y - 2}"
              stroke="${strokeColor}" stroke-width="${strokeWidth}" 
              stroke-dasharray="${dashArray}" opacity="${isPruned ? 0.4 : 1}"/>`;
    }
  }

  // Draw nodes
  for (const pos of positions) {
    const n = pos.node;

    if (n.isEllipsis) {
      // "... +N more" indicator
      svg += `<text x="${pos.x}" y="${pos.y + 10}" 
              text-anchor="middle" fill="rgba(255,255,255,0.4)" 
              font-family="Silkscreen, cursive" font-size="8">
              +${n.count} more</text>`;
      continue;
    }

    if (n.pruned) {
      // Pruned node
      const nodeX = pos.x - 20;
      const nodeY = pos.y - 8;
      svg += `<rect x="${nodeX}" y="${nodeY}" width="40" height="22" rx="6"
              fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" 
              stroke-width="0.5" stroke-dasharray="3,3"/>`;
      svg += `<text x="${pos.x}" y="${pos.y + 6}" text-anchor="middle" 
              fill="rgba(255,255,255,0.3)" font-size="10">✂</text>`;
      continue;
    }

    const isBest = n.isBestMove;
    const isMax = n.isMaximizing;
    const nodeWidth = 54;
    const nodeHeight = 62;
    const nodeX = pos.x - nodeWidth / 2;
    const nodeY = pos.y - 6;

    // Node background
    const bgColor = isBest ? 'rgba(255,105,180,0.2)' : 'rgba(60,30,80,0.4)';
    const borderColor = isBest ? 'rgba(255,105,180,0.6)' : 'rgba(255,255,255,0.12)';
    const glowFilter = isBest ? 'filter="url(#glow)"' : '';

    svg += `<rect x="${nodeX}" y="${nodeY}" width="${nodeWidth}" height="${nodeHeight}" 
            rx="8" fill="${bgColor}" stroke="${borderColor}" stroke-width="${isBest ? 1.5 : 0.5}" 
            ${glowFilter}/>`;

    // Mini board
    const boardX = pos.x - 21;
    const boardY = nodeY + 3;
    svg += `<g transform="translate(${boardX}, ${boardY})">`;
    svg += renderMiniBoard(n.board, 42);
    svg += `</g>`;

    // Score label
    const scoreY = nodeY + nodeHeight - 8;
    const scoreColor = n.score > 0 ? '#ff69b4' : n.score < 0 ? '#c9b1ff' : 'rgba(255,255,255,0.6)';
    const scoreText = n.score !== null && n.score !== undefined ? 
      (n.score > 0 ? `+${n.score}` : `${n.score}`) : '?';
    svg += `<text x="${pos.x}" y="${scoreY}" text-anchor="middle" 
            fill="${scoreColor}" font-family="'Press Start 2P', cursive" 
            font-size="7">${scoreText}</text>`;

    // MAX/MIN label
    if (pos.depth === 0) {
      const layerLabel = isMax ? 'MAX' : 'MIN';
      const layerColor = isMax ? '#ff69b4' : '#c9b1ff';
      svg += `<text x="${nodeX - 4}" y="${nodeY + nodeHeight / 2 + 3}" 
              text-anchor="end" fill="${layerColor}" 
              font-family="Silkscreen, cursive" font-size="7" opacity="0.7">
              ${layerLabel}</text>`;
    }

    // Move label (which cell was played)
    if (n.move !== undefined && n.move !== null) {
      const cellNames = ['TL','TC','TR','ML','C','MR','BL','BC','BR'];
      svg += `<text x="${pos.x}" y="${nodeY - 3}" text-anchor="middle" 
              fill="rgba(255,255,255,0.45)" font-family="Silkscreen, cursive" 
              font-size="6">${cellNames[n.move]}</text>`;
    }
  }

  // Glow filter definition
  svg += `<defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>`;

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
        <span>AI moves</span>
      </div>
      <div class="legend-item">
        <span style="opacity:0.5">✂</span>
        <span>pruned</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:rgba(255,255,255,0.3)"></span>
        <span>explored</span>
      </div>
    </div>
  `;

  return svg;
}

/**
 * Show/hide the game tree panel.
 */
function toggleTreePanel() {
  const panel = document.getElementById('tree-panel');
  if (!panel) return;

  const isVisible = panel.classList.contains('visible');
  
  if (isVisible) {
    panel.classList.remove('visible');
  } else {
    // Render the tree
    const content = document.getElementById('tree-content');
    if (state.gameTree) {
      content.innerHTML = renderGameTreeSVG(state.gameTree);
    } else {
      content.innerHTML = '<div class="tree-empty">Make a move on Hard mode to see the decision tree!</div>';
    }
    panel.classList.add('visible');
  }
}

// Export for use in game.js
window.toggleTreePanel = toggleTreePanel;
window.renderGameTreeSVG = renderGameTreeSVG;