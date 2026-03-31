"""
Q-Learning Agent for Tic Tac Toe
================================
Trains a reinforcement learning agent to play tic tac toe by self-play.

This script demonstrates:
- Q-learning (model-free, off-policy RL)
- Epsilon-greedy exploration vs exploitation
- State-action value function approximation
- Self-play training (agent plays against itself)
- Policy extraction and export to JSON for web deployment

The trained Q-table is exported as a JSON file that the JavaScript
frontend can load, allowing the RL agent to play in the browser
without any server needed.
"""

import json
import random
import numpy as np
from collections import defaultdict
from tqdm import tqdm


class TicTacToe:
    """Game environment for training."""

    def __init__(self):
        self.board = [0] * 9  # 0=empty, 1=player1, 2=player2
        self.current_player = 1

    def reset(self):
        self.board = [0] * 9
        self.current_player = 1
        return self.get_state()

    def get_state(self):
        """Return board state as a tuple (hashable for Q-table)."""
        return tuple(self.board)

    def get_available_moves(self):
        return [i for i, v in enumerate(self.board) if v == 0]

    def make_move(self, action):
        """
        Make a move and return (next_state, reward, done).
        
        Rewards (from the perspective of the player who just moved):
          +1.0 for winning
          -1.0 for losing
          +0.3 for drawing (slight positive — a draw against a 
                perfect player means you played well)
           0.0 for non-terminal moves
        """
        if self.board[action] != 0:
            raise ValueError(f"Illegal move: cell {action} is occupied")

        self.board[action] = self.current_player
        
        winner = self.check_winner()
        
        if winner == self.current_player:
            return self.get_state(), 1.0, True
        elif winner == 3 - self.current_player:
            return self.get_state(), -1.0, True
        elif winner == 'draw':
            return self.get_state(), 0.3, True
        
        # Switch player
        self.current_player = 3 - self.current_player
        return self.get_state(), 0.0, False

    def check_winner(self):
        """Return winner (1 or 2), 'draw', or None if game ongoing."""
        lines = [
            [0,1,2], [3,4,5], [6,7,8],  # rows
            [0,3,6], [1,4,7], [2,5,8],  # cols
            [0,4,8], [2,4,6],            # diags
        ]
        for a, b, c in lines:
            if self.board[a] != 0 and self.board[a] == self.board[b] == self.board[c]:
                return self.board[a]
        if all(v != 0 for v in self.board):
            return 'draw'
        return None


class QLearningAgent:
    """
    Q-Learning agent for tic tac toe.
    
    Q-learning update rule:
        Q(s, a) <- Q(s, a) + α * [r + γ * max_a' Q(s', a') - Q(s, a)]
    
    Where:
        s     = current state
        a     = action taken
        r     = reward received
        s'    = next state
        α     = learning rate (how fast we update)
        γ     = discount factor (how much we value future rewards)
        max_a'= best action value in next state
    
    Exploration strategy: epsilon-greedy
        With probability ε, take a random action (explore)
        With probability 1-ε, take the best known action (exploit)
        ε decays over time so we explore less as we learn more
    """

    def __init__(self, learning_rate=0.1, discount_factor=0.95, 
                 epsilon_start=1.0, epsilon_end=0.01, epsilon_decay=0.99995):
        self.q_table = defaultdict(lambda: defaultdict(float))
        self.lr = learning_rate          # α
        self.gamma = discount_factor     # γ
        self.epsilon = epsilon_start     # ε (current)
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        
        # Training metrics
        self.training_history = {
            'episode_rewards': [],
            'epsilon_values': [],
            'q_table_sizes': [],
            'win_rates': [],        # rolling win rate
        }

    def get_action(self, state, available_moves, training=True):
        """
        Epsilon-greedy action selection.
        
        During training: explore with probability ε, exploit with 1-ε
        During play: always exploit (pick best known action)
        """
        if training and random.random() < self.epsilon:
            # EXPLORE: random action
            return random.choice(available_moves)
        else:
            # EXPLOIT: pick action with highest Q-value
            q_values = {a: self.q_table[state][a] for a in available_moves}
            max_q = max(q_values.values()) if q_values else 0
            # Break ties randomly (important early in training)
            best_actions = [a for a, q in q_values.items() if q == max_q]
            return random.choice(best_actions)

    def update(self, state, action, reward, next_state, done, next_available_moves):
        """
        Q-learning update: Q(s,a) <- Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
        """
        current_q = self.q_table[state][action]
        
        if done:
            # Terminal state: no future rewards
            target = reward
        else:
            # Non-terminal: include discounted future value
            future_q = max(
                [self.q_table[next_state][a] for a in next_available_moves],
                default=0
            )
            target = reward + self.gamma * future_q
        
        # Update Q-value
        self.q_table[state][action] = current_q + self.lr * (target - current_q)

    def decay_epsilon(self):
        """Decay exploration rate."""
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)


def train_agent(num_episodes=200000, eval_interval=5000):
    """
    Train a Q-learning agent via self-play.
    
    The agent plays as BOTH player 1 and player 2 against itself.
    This is crucial — by playing both sides, the agent learns to
    play well regardless of which side it's on, and it faces an
    increasingly strong opponent as it improves.
    
    Args:
        num_episodes: Total number of games to play
        eval_interval: How often to evaluate and log metrics
    
    Returns:
        Trained QLearningAgent
    """
    agent = QLearningAgent()
    env = TicTacToe()
    
    # For tracking win rates
    recent_results = []  # 'win', 'loss', 'draw' from player 1's perspective
    
    print("=" * 60)
    print("  Q-Learning Training for Tic Tac Toe")
    print("=" * 60)
    print(f"  Episodes:       {num_episodes:,}")
    print(f"  Learning rate:  {agent.lr}")
    print(f"  Discount (γ):   {agent.gamma}")
    print(f"  ε start → end:  {agent.epsilon} → {agent.epsilon_end}")
    print("=" * 60)
    print()
    
    for episode in tqdm(range(num_episodes), desc="Training"):
        state = env.reset()
        episode_reward = 0
        
        # Store transitions for both players so we can update both
        transitions = {1: [], 2: []}
        
        done = False
        while not done:
            player = env.current_player
            available = env.get_available_moves()
            
            # Agent picks action (same agent plays both sides)
            action = agent.get_action(state, available, training=True)
            
            next_state, reward, done = env.make_move(action)
            
            # Store transition
            transitions[player].append({
                'state': state,
                'action': action,
                'reward': reward if done else 0,
                'next_state': next_state,
                'done': done,
                'next_available': env.get_available_moves() if not done else []
            })
            
            # If game ended with a reward, the OTHER player gets negative reward
            if done and reward != 0 and reward != 0.3:
                other_player = 3 - player
                if transitions[other_player]:
                    transitions[other_player][-1]['reward'] = -reward
                    transitions[other_player][-1]['done'] = True
            
            # Draw reward for both
            if done and reward == 0.3:
                other_player = 3 - player
                if transitions[other_player]:
                    transitions[other_player][-1]['reward'] = 0.3
                    transitions[other_player][-1]['done'] = True
            
            state = next_state
            episode_reward += reward
        
        # Update Q-values for all transitions from both players
        for player in [1, 2]:
            for t in transitions[player]:
                agent.update(
                    t['state'], t['action'], t['reward'],
                    t['next_state'], t['done'], t['next_available']
                )
        
        agent.decay_epsilon()
        
        # Track results
        winner = env.check_winner()
        if winner == 1:
            recent_results.append('win')
        elif winner == 2:
            recent_results.append('loss')
        else:
            recent_results.append('draw')
        
        # Keep only last 1000 results for rolling average
        if len(recent_results) > 1000:
            recent_results = recent_results[-1000:]
        
        # Log metrics periodically
        if (episode + 1) % eval_interval == 0:
            win_rate = recent_results.count('win') / len(recent_results)
            draw_rate = recent_results.count('draw') / len(recent_results)
            loss_rate = recent_results.count('loss') / len(recent_results)
            
            agent.training_history['episode_rewards'].append(episode_reward)
            agent.training_history['epsilon_values'].append(agent.epsilon)
            agent.training_history['q_table_sizes'].append(len(agent.q_table))
            agent.training_history['win_rates'].append(win_rate)
            
            print(f"\n  Episode {episode+1:>7,} | "
                  f"ε={agent.epsilon:.4f} | "
                  f"Q-states={len(agent.q_table):,} | "
                  f"P1 wins={win_rate:.1%} draws={draw_rate:.1%} losses={loss_rate:.1%}")
    
    print("\n" + "=" * 60)
    print(f"  Training complete!")
    print(f"  Final Q-table size: {len(agent.q_table):,} states")
    print(f"  Final epsilon: {agent.epsilon:.6f}")
    print("=" * 60)
    
    return agent


def evaluate_against_random(agent, num_games=10000):
    """
    Evaluate the trained agent against a random opponent.
    Tests both as player 1 (going first) and player 2 (going second).
    """
    env = TicTacToe()
    results = {'win': 0, 'loss': 0, 'draw': 0}
    
    for game in range(num_games):
        state = env.reset()
        # Alternate who goes first
        agent_player = 1 if game % 2 == 0 else 2
        done = False
        
        while not done:
            available = env.get_available_moves()
            
            if env.current_player == agent_player:
                # Agent's turn (exploit only, no exploration)
                action = agent.get_action(state, available, training=False)
            else:
                # Random opponent
                action = random.choice(available)
            
            state, reward, done = env.make_move(action)
        
        winner = env.check_winner()
        if winner == agent_player:
            results['win'] += 1
        elif winner == 'draw':
            results['draw'] += 1
        else:
            results['loss'] += 1
    
    print(f"\n  Evaluation vs Random ({num_games:,} games):")
    print(f"    Wins:   {results['win']:>6,} ({results['win']/num_games:.1%})")
    print(f"    Draws:  {results['draw']:>6,} ({results['draw']/num_games:.1%})")
    print(f"    Losses: {results['loss']:>6,} ({results['loss']/num_games:.1%})")
    
    return results


def evaluate_against_minimax(agent, num_games=1000):
    """
    Evaluate the trained agent against a perfect minimax player.
    A well-trained agent should draw every game against minimax.
    """
    env = TicTacToe()
    results = {'win': 0, 'loss': 0, 'draw': 0}
    
    def minimax_move(board, player):
        """Simple minimax for evaluation."""
        def minimax(b, is_max, depth):
            winner = check_winner_simple(b)
            if winner == player:
                return 10 - depth
            elif winner == 3 - player:
                return depth - 10
            elif winner == 'draw':
                return 0
            
            moves = [i for i, v in enumerate(b) if v == 0]
            if is_max:
                best = -100
                for m in moves:
                    b[m] = player
                    best = max(best, minimax(b, False, depth + 1))
                    b[m] = 0
                return best
            else:
                best = 100
                for m in moves:
                    b[m] = 3 - player
                    best = min(best, minimax(b, True, depth + 1))
                    b[m] = 0
                return best
        
        moves = [i for i, v in enumerate(board) if v == 0]
        best_score = -100
        best_move = moves[0]
        for m in moves:
            board[m] = player
            score = minimax(board, False, 0)
            board[m] = 0
            if score > best_score:
                best_score = score
                best_move = m
        return best_move
    
    def check_winner_simple(board):
        lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
        for a, b, c in lines:
            if board[a] != 0 and board[a] == board[b] == board[c]:
                return board[a]
        if all(v != 0 for v in board):
            return 'draw'
        return None
    
    for game in range(num_games):
        state = env.reset()
        agent_player = 1 if game % 2 == 0 else 2
        done = False
        
        while not done:
            available = env.get_available_moves()
            
            if env.current_player == agent_player:
                action = agent.get_action(state, available, training=False)
            else:
                action = minimax_move(list(env.board), env.current_player)
            
            state, reward, done = env.make_move(action)
        
        winner = env.check_winner()
        if winner == agent_player:
            results['win'] += 1
        elif winner == 'draw':
            results['draw'] += 1
        else:
            results['loss'] += 1
    
    print(f"\n  Evaluation vs Minimax ({num_games:,} games):")
    print(f"    Wins:   {results['win']:>6,} ({results['win']/num_games:.1%})")
    print(f"    Draws:  {results['draw']:>6,} ({results['draw']/num_games:.1%})")
    print(f"    Losses: {results['loss']:>6,} ({results['loss']/num_games:.1%})")
    
    return results


def export_q_table(agent, filepath='q_table.json'):
    """
    Export the Q-table as JSON for the web frontend.
    
    The Q-table maps state -> {action: q_value}.
    States are stored as strings (e.g., "0,0,1,2,0,0,1,0,2")
    where 0=empty, 1=player (human in web), 2=opponent (AI in web).
    
    We flip the perspective so the AI plays as player 2 in the web game
    (the human goes first). The Q-table stores the best moves for 
    the AI given any board state.
    """
    q_data = {}
    
    for state, actions in agent.q_table.items():
        if not actions:
            continue
        # Convert state tuple to string key
        state_key = ','.join(str(v) for v in state)
        # Only keep the best action's Q-value and the full action map
        q_data[state_key] = {str(a): round(v, 4) for a, v in actions.items()}
    
    export = {
        'metadata': {
            'algorithm': 'Q-Learning',
            'episodes_trained': len(agent.training_history['episode_rewards']) * 5000,
            'learning_rate': agent.lr,
            'discount_factor': agent.gamma,
            'total_states': len(q_data),
            'description': 'Q-table trained via self-play. States are board '
                          'positions as comma-separated values (0=empty, '
                          '1=player1, 2=player2). Actions are cell indices 0-8.'
        },
        'q_table': q_data
    }
    
    with open(filepath, 'w') as f:
        json.dump(export, f)
    
    file_size = len(json.dumps(export)) / 1024
    print(f"\n  Exported Q-table to {filepath}")
    print(f"  States: {len(q_data):,}")
    print(f"  File size: {file_size:.1f} KB")
    
    return export


def export_training_history(agent, filepath='training_history.json'):
    """Export training metrics for visualization."""
    with open(filepath, 'w') as f:
        json.dump(agent.training_history, f)
    print(f"  Exported training history to {filepath}")


# ============ MAIN ============
if __name__ == '__main__':
    # Train
    agent = train_agent(num_episodes=200000, eval_interval=5000)
    
    # Evaluate
    print("\n" + "=" * 60)
    print("  EVALUATION")
    print("=" * 60)
    evaluate_against_random(agent, num_games=10000)
    evaluate_against_minimax(agent, num_games=1000)
    
    # Export for web
    print("\n" + "=" * 60)
    print("  EXPORT")
    print("=" * 60)
    export_q_table(agent, 'q_table.json')
    export_training_history(agent, 'training_history.json')
    
    print("\n  Done! Copy q_table.json to your petalpunchXO/assets/ folder.")
    print("  The JS frontend will load this file to power the RL agent.")
