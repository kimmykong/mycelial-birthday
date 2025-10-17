import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

// Initialize Redis client with connection string
let redis: Redis | null = null;

function getRedis(): Redis | null {
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

export interface Submission {
  id: string;
  session_id: string;
  word: string;
  created_at: string;
}

// Keys:
// adjectives:<word> -> count (number)
// adjectives:sorted -> sorted set of words by count
// submissions:<sessionId> -> list of submission IDs
// submission:<id> -> submission data

export async function submitAdjective(sessionId: string, word: string): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis not configured');

  const normalizedWord = word.toLowerCase().trim();
  const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  // Create submission record
  const submission: Submission = {
    id: submissionId,
    session_id: sessionId,
    word: normalizedWord,
    created_at: timestamp
  };

  // Store submission as JSON string
  await redis.set(`submission:${submissionId}`, JSON.stringify(submission));

  // Add to session's submissions list
  await redis.lpush(`submissions:${sessionId}`, submissionId);

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

  const submissionIds = await redis.lrange(`submissions:${sessionId}`, 0, -1);
  return submissionIds ? submissionIds.length : 0;
}

export async function getAllSubmissions(): Promise<Submission[]> {
  const redis = getRedis();
  if (!redis) return [];

  // Get all submission keys
  const keys = await redis.keys('submission:*');

  if (!keys || keys.length === 0) {
    return [];
  }

  // Fetch all submissions
  const submissions: Submission[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const submission = JSON.parse(data);
      submissions.push(submission);
    }
  }

  // Sort by created_at descending
  submissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return submissions;
}

export async function resetDatabase(): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis not configured');

  // Get all keys
  const adjectiveKeys = await redis.keys('adjectives:*');
  const submissionKeys = await redis.keys('submission*');

  const allKeys = [...(adjectiveKeys || []), ...(submissionKeys || [])];

  // Delete all keys
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}
