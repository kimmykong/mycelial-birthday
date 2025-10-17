import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setAdminAuthenticated } from '$lib/session';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminchangeme';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { password } = await request.json();

  if (password === ADMIN_PASSWORD) {
    setAdminAuthenticated(cookies, true);
    return json({ success: true });
  }

  return json({ error: 'Invalid password' }, { status: 401 });
};
