-- Tic Tac Toe Database Schema

-- Games table (completed games history)
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    challenge_id VARCHAR(255),
    player1_id VARCHAR(255) NOT NULL,
    player1_name VARCHAR(255) NOT NULL,
    player2_id VARCHAR(255) NOT NULL,
    player2_name VARCHAR(255) NOT NULL,
    mode VARCHAR(50) DEFAULT 'normal',
    status VARCHAR(50) NOT NULL,
    winner_id VARCHAR(255),
    move_time_limit INT DEFAULT 0,
    first_to INT DEFAULT 1,
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    total_rounds INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_challenge_id ON games(challenge_id);
CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Player statistics
CREATE TABLE IF NOT EXISTS player_stats (
    user_id VARCHAR(255) PRIMARY KEY,
    user_name VARCHAR(255),
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    games_lost INT DEFAULT 0,
    games_draw INT DEFAULT 0,
    total_moves INT DEFAULT 0,
    fastest_win_moves INT,
    last_played TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Move history (for replay/analytics)
CREATE TABLE IF NOT EXISTS moves (
    id SERIAL PRIMARY KEY,
    game_id INT REFERENCES games(id) ON DELETE CASCADE,
    player_id VARCHAR(255) NOT NULL,
    position INT NOT NULL,
    symbol VARCHAR(1) NOT NULL,
    move_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
