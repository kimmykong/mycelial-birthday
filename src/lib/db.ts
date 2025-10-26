import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

// Initialize Redis client with connection string
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  const REDIS_URL = env.REDIS_URL;
  if (!REDIS_URL) {
    console.warn('REDIS_URL not found in environment variables');
    return null;
  }

  if (!redis) {
    console.log('Initializing Redis connection to:', REDIS_URL.substring(0, 20) + '...');
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying
        return Math.min(times * 50, 2000); // Exponential backoff
      }
    });
  }

  return redis;
}

export interface Adjective {
  word: string;
  count: number;
}

// New simplified schema:
// session:<sessionId> -> JSON array of words ["kind", "funny", "smart"]
// adjectives:<word> -> count (number)
// adjectives:sorted -> sorted set of words by count

export async function submitAdjective(sessionId: string, word: string): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis not configured');

  const normalizedWord = word.toLowerCase().trim();

  // Get current session words
  const sessionData = await redis.get(`session:${sessionId}`);
  const sessionWords: string[] = sessionData ? JSON.parse(sessionData) : [];

  // Add new word to session
  sessionWords.push(normalizedWord);
  await redis.set(`session:${sessionId}`, JSON.stringify(sessionWords));

  // Increment word count
  const newCount = await redis.incr(`adjectives:${normalizedWord}`);

  // Update sorted set for leaderboard
  await redis.zadd('adjectives:sorted', newCount, normalizedWord);
}

export async function getTopAdjectives(limit: number = 30): Promise<Adjective[]> {
  const redis = getRedis();
  if (!redis) return [];

  // Get top words from sorted set (highest scores first)
  const words = await redis.zrevrange('adjectives:sorted', 0, limit - 1);

  if (!words || words.length === 0) {
    return [];
  }

  // Get counts for each word
  const adjectives: Adjective[] = [];
  for (const word of words) {
    const count = await redis.get(`adjectives:${word}`);
    if (count !== null) {
      adjectives.push({ word: word, count: parseInt(count) });
    }
  }

  return adjectives;
}

export async function getSubmissionCount(sessionId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  const sessionData = await redis.get(`session:${sessionId}`);
  const sessionWords: string[] = sessionData ? JSON.parse(sessionData) : [];
  return sessionWords.length;
}

export async function getAllSessions(): Promise<{ sessionId: string; words: string[] }[]> {
  const redis = getRedis();
  if (!redis) return [];

  // Get all session keys
  const keys = await redis.keys('session:*');

  if (!keys || keys.length === 0) {
    return [];
  }

  // Fetch all sessions
  const sessions: { sessionId: string; words: string[] }[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const sessionId = key.replace('session:', '');
      const words = JSON.parse(data);
      sessions.push({ sessionId, words });
    }
  }

  return sessions;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis not configured');

  // Get session words before deletion
  const sessionData = await redis.get(`session:${sessionId}`);
  if (!sessionData) {
    return; // Session doesn't exist
  }

  const sessionWords: string[] = JSON.parse(sessionData);

  // Decrement counts for each word and update sorted set
  for (const word of sessionWords) {
    const newCount = await redis.decr(`adjectives:${word}`);

    if (newCount <= 0) {
      // Remove word completely if count is 0 or less
      await redis.del(`adjectives:${word}`);
      await redis.zrem('adjectives:sorted', word);
    } else {
      // Update sorted set with new count
      await redis.zadd('adjectives:sorted', newCount, word);
    }
  }

  // Delete session
  await redis.del(`session:${sessionId}`);
}

export async function resetDatabase(): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis not configured');

  // Get all keys
  const adjectiveKeys = await redis.keys('adjectives:*');
  const sessionKeys = await redis.keys('session:*');

  const allKeys = [...(adjectiveKeys || []), ...(sessionKeys || [])];

  // Delete all keys
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}
