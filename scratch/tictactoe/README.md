# Tic Tac Toe ♡

A cute pixel-art tic tac toe game powered by AI adversarial search algorithms.

**[Play it live →](#)** *(add your GitHub Pages URL here)*

![screenshot](assets/heart-brooch.png)

## About

This is a single-player tic tac toe game where you play against an AI opponent. The AI uses classic game-tree search algorithms from artificial intelligence — the same concepts used in chess engines and Go programs.

**Player pieces:**
- 💎 **You** — Pink heart gem
- 🌸 **AI** — Cherry blossom flower

## AI & Algorithms

The game features three difficulty levels, each using a different AI strategy:

### Easy — Random Moves
The AI picks a random empty cell. No strategy, just vibes.

### Medium — Depth-Limited Minimax
The AI uses the **Minimax algorithm** with a **depth limit of 3**. Minimax models the game as a two-player zero-sum game tree:

- **MAX** (you) tries to maximize the utility score
- **MIN** (AI) tries to minimize the utility score
- The algorithm recursively explores all possible future game states up to depth 3
- At the depth limit, board states are evaluated using a heuristic utility function

Because the search is cut off early, the AI can make suboptimal moves — it's beatable!

### Hard — Full Minimax with Alpha-Beta Pruning (Unbeatable)
The AI uses **Minimax with Alpha-Beta Pruning** searching the entire game tree (depth 9). This makes it play optimally — you can never beat it, only draw.

**Alpha-Beta Pruning** is an optimization that skips branches of the game tree that can't possibly affect the final decision:

- **Alpha** = best score MAX can guarantee so far (lower bound)
- **Beta** = best score MIN can guarantee so far (upper bound)
- **Prune when β ≤ α** — the remaining branches won't change the outcome

This reduces the number of nodes explored from O(b^d) to O(b^(d/2)) in the best case, where b is the branching factor and d is the depth.

**Utility function:**
- Human win: `+10 + depth` (prefer faster wins)
- AI win: `-10 - depth` (prefer slower losses for the human)
- Draw: `0`

The depth bonus ensures the AI goes for the fastest win and avoids unnecessary delays.

## Stats Display

During gameplay, the stats bar shows real-time metrics from the AI's search:
- **Nodes explored** — total game states evaluated
- **Pruned** — branches skipped by alpha-beta pruning
- **Depth** — search depth used

## Tech Stack

- Pure HTML, CSS, JavaScript — no frameworks, no dependencies
- Pixel art sprites (created in Piskel)
- CSS animations and glassmorphism effects
- Responsive design (works on mobile)
- Deployable via GitHub Pages

## Project Structure

```
tictactoe/
├── assets/
│   ├── background.jpg      ← pixel art sky background
│   ├── bunny.png            ← cute pixel bunnies
│   ├── flower.png           ← AI player piece (cherry blossom)
│   ├── heart-brooch.png     ← decorative winged heart
│   └── heart-gem.png        ← human player piece (pink gem)
├── css/
│   └── styles.css           ← all styling
├── js/
│   └── game.js              ← game logic + AI algorithms
├── index.html               ← single-page app entry point
└── README.md
```

## Deploy with GitHub Pages

1. Push this repo to GitHub
2. Go to Settings → Pages
3. Source: Deploy from a branch → `main` → `/ (root)`
4. Your game will be live at `https://yourusername.github.io/tictactoe/`

## Concepts Demonstrated

- **Adversarial Search** — modeling games as two-player zero-sum problems
- **Minimax Algorithm** — optimal decision-making in game trees
- **Alpha-Beta Pruning** — efficient tree search optimization
- **Game Trees** — recursive exploration of all possible game states
- **Heuristic Evaluation** — depth-adjusted utility functions
- **Computational Complexity** — understanding branching factor and depth tradeoffs

## License

MIT
