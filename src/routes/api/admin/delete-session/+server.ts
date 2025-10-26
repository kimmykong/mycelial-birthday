import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/db';
import { isAdminAuthenticated } from '$lib/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
  // Check if admin is authenticated
  if (!isAdminAuthenticated(cookies)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await request.json();

  if (!sessionId) {
    return json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    // Delete the session and decrement word counts
    await deleteSession(sessionId);

    console.log(`Deleted session: ${sessionId}`);

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return json({ error: 'Failed to delete session' }, { status: 500 });
  }
};
