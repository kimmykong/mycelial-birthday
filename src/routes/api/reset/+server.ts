import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resetDatabase } from '$lib/db';

export const POST: RequestHandler = async () => {
  try {
    resetDatabase();
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to reset database' }, { status: 500 });
  }
};
