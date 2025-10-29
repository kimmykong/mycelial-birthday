import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitAdjective, getTopAdjectives, getSubmissionCount } from '$lib/db';
import { getSessionId } from '$lib/session';
import { env } from '$env/dynamic/private';
import { isRateLimited } from '$lib/rateLimit.ts';
import { sanitizeAdjective } from '$lib/sanitize.ts';

export const GET: RequestHandler = async () => {
  const adjectives = await getTopAdjectives(30);
  return json(adjectives);
};

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const { word, newSession } = await request.json();
  const sessionId = getSessionId(cookies, newSession === true);
  const clientIp = getClientAddress();

  // Rate limiting: 50 submissions per minute per IP (increased for testing)
  const rateLimited = await isRateLimited({
    key: `adjective:${clientIp}`,
    limit: 20,
    window: 60
  });

  if (rateLimited) {
    return json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // Check if submissions are allowed (from now until the configured end date)
  if (env.SUBMISSION_END_DATE) {
    const now = new Date();
    const endDate = parseInt(env.SUBMISSION_END_DATE);

    if (now.getTime() > endDate) {
      return json({ error: 'Submissions are closed' }, { status: 403 });
    }
  }

  // Sanitize and validate input
  const { sanitized, isValid, error: sanitizeError } = sanitizeAdjective(word);

  if (!isValid) {
    return json({ error: sanitizeError || 'Invalid input' }, { status: 400 });
  }

  // Submit adjective and return updated data in one response
  try {
    await submitAdjective(sessionId, sanitized);
    const [newCount, adjectives] = await Promise.all([
      getSubmissionCount(sessionId),
      getTopAdjectives(30)
    ]);
    return json({ success: true, count: newCount, adjectives });
  } catch (error) {
    return json({ error: 'Failed to submit word' }, { status: 500 });
  }
};
