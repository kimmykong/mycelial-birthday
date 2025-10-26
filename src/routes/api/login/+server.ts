import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setAuthenticated } from '$lib/session';

const PASSWORD = process.env.PASSWORD || 'changeme';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { password } = await request.json();

  if (password === PASSWORD) {
    setAuthenticated(cookies, true);
    return json({ success: true });
  }

  return json({ error: ':( try again. I believe in you <3' }, { status: 401 });
};
