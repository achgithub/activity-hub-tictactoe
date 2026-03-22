package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

var redisClient *redis.Client
var ctx = context.Background()

const (
	GAME_TTL_ACTIVE    = 3600 // 1 hour for active games
	GAME_TTL_COMPLETED = 300  // 5 minutes for completed games
)

// CreateGame creates a new game in Redis
func CreateGame(game *Game) error {
	key := fmt.Sprintf("game:%s", game.ID)

	// Marshal game to JSON
	data, err := json.Marshal(game)
	if err != nil {
		return fmt.Errorf("failed to marshal game: %w", err)
	}

	// Store in Redis with TTL
	err = redisClient.Set(ctx, key, data, GAME_TTL_ACTIVE*time.Second).Err()
	if err != nil {
		return fmt.Errorf("failed to store game in Redis: %w", err)
	}

	return nil
}

// GetGame retrieves a game from Redis
func GetGame(ctxParam context.Context, gameID string) (*Game, error) {
	key := fmt.Sprintf("game:%s", gameID)

	data, err := redisClient.Get(ctxParam, key).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("game not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get game from Redis: %w", err)
	}

	var game Game
	err = json.Unmarshal([]byte(data), &game)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal game: %w", err)
	}

	return &game, nil
}

// UpdateGame updates a game in Redis
func UpdateGame(game *Game) error {
	key := fmt.Sprintf("game:%s", game.ID)

	// Marshal game to JSON
	data, err := json.Marshal(game)
	if err != nil {
		return fmt.Errorf("failed to marshal game: %w", err)
	}

	// Determine TTL based on status
	ttl := GAME_TTL_ACTIVE
	if game.Status == GameStatusCompleted || game.Status == GameStatusAbandoned {
		ttl = GAME_TTL_COMPLETED
	}

	// Update in Redis
	err = redisClient.Set(ctx, key, data, time.Duration(ttl)*time.Second).Err()
	if err != nil {
		return fmt.Errorf("failed to update game in Redis: %w", err)
	}

	return nil
}

// DeleteGame removes a game from Redis
func DeleteGame(gameID string) error {
	key := fmt.Sprintf("game:%s", gameID)

	err := redisClient.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete game from Redis: %w", err)
	}

	return nil
}

// CompleteGame marks a game as completed
func CompleteGame(gameID string, winnerID *string) error {
	game, err := GetGame(ctx, gameID)
	if err != nil {
		return err
	}

	now := time.Now().Unix()
	game.Status = GameStatusCompleted
	game.WinnerID = winnerID
	game.CompletedAt = &now

	// Update with shorter TTL
	return UpdateGame(game)
}

// PublishGameEvent publishes an event to a game's event channel
func PublishGameEvent(gameID string, eventType string, payload interface{}) error {
	channel := fmt.Sprintf("game:%s:events", gameID)

	event := SSEEvent{
		Type:    eventType,
		Payload: payload,
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	err = redisClient.Publish(ctx, channel, string(data)).Err()
	if err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	return nil
}

// SubscribeToGame subscribes to a game's event channel and returns a channel for receiving messages
func SubscribeToGame(ctxParam context.Context, gameID string) (*redis.PubSub, <-chan *redis.Message) {
	channel := fmt.Sprintf("game:%s:events", gameID)
	pubsub := redisClient.Subscribe(ctxParam, channel)
	return pubsub, pubsub.Channel()
}
