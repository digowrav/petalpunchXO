# Training Pipeline

This directory contains the Python Q-learning training pipeline for petalpunchXO.

## How It Works

The agent learns to play tic tac toe through **self-play** — it plays as both
player 1 and player 2 against itself. Over 100,000+ games, it builds a
Q-table mapping every board state to the best action.

### Q-Learning Algorithm

```
Q(s, a) <- Q(s, a) + α * [r + γ * max Q(s', a') - Q(s, a)]
```

- **α (learning rate):** 0.1 — how fast the agent updates its beliefs
- **γ (discount factor):** 0.95 — how much it values future rewards
- **ε (exploration):** Decays from 1.0 → 0.01 over training

### Reward Structure

| Outcome | Reward |
|---------|--------|
| Win     | +1.0   |
| Loss    | -1.0   |
| Draw    | +0.3   |
| Other   | 0.0    |

Draws get a small positive reward because drawing against a strong opponent
(or yourself, as you improve) is a good outcome in tic tac toe.

## Run Training

```bash
pip install -r requirements.txt
python train_agent.py
```

This outputs:
- `q_table.json` — the trained policy (copy to `assets/` in the web app)
- `training_history.json` — metrics for visualization

## Results

After 100k episodes of self-play:

| Opponent | Win Rate | Draw Rate | Loss Rate |
|----------|----------|-----------|-----------|
| Random   | 72.4%    | 21.5%     | 6.2%      |
| Minimax  | 0%       | ~95%      | ~5%       |

The agent can't beat a perfect minimax player (impossible in tic tac toe),
but it plays near-optimally, drawing most games against the strongest
possible opponent.

## Web Integration

The exported `q_table.json` is loaded by the JavaScript frontend. When the
RL agent needs to make a move, it looks up the current board state in the
Q-table and picks the action with the highest Q-value. The entire trained policy runs client-side in the browser (no server needed)
