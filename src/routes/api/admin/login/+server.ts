import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setAdminAuthenticated } from '$lib/session';
import { ADMIN_PASSWORD } from '$env/static/private';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { password } = await request.json();

  console.log('Received password:', password);
  console.log('Expected password:', ADMIN_PASSWORD);
  console.log('Match:', password === ADMIN_PASSWORD);

  if (password === ADMIN_PASSWORD) {
    setAdminAuthenticated(cookies, true);
    return json({ success: true });
  }

  return json({ error: 'Invalid password' }, { status: 401 });
};
