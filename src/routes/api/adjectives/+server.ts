import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitAdjective, getTopAdjectives, getSubmissionCount } from '$lib/db';
import { getSessionId } from '$lib/session';

export const GET: RequestHandler = async () => {
  const adjectives = await getTopAdjectives(30);
  return json(adjectives);
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const sessionId = getSessionId(cookies);
  const { word } = await request.json();

  // Check submission count
  const count = await getSubmissionCount(sessionId);
  if (count >= 5) {
    return json({ error: 'Maximum 5 submissions reached' }, { status: 400 });
  }

  // Validate word
  const trimmedWord = word?.trim();
  if (!trimmedWord || trimmedWord.length === 0) {
    return json({ error: 'Word cannot be empty' }, { status: 400 });
  }

  if (trimmedWord.length > 50) {
    return json({ error: 'Word is too long' }, { status: 400 });
  }

  // Submit adjective
  try {
    await submitAdjective(sessionId, trimmedWord);
    const newCount = await getSubmissionCount(sessionId);
    return json({ success: true, count: newCount });
  } catch (error) {
    return json({ error: 'Failed to submit word' }, { status: 500 });
  }
};
