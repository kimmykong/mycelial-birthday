import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setAdminAuthenticated } from '$lib/session';
import { ADMIN_PASSWORD } from '$env/static/private';
import { isRateLimited } from '$lib/rateLimit.ts';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const { password } = await request.json();
  const clientIp = getClientAddress();

  // Rate limiting: 3 admin login attempts per 5 minutes per IP (stricter than regular login)
  const rateLimited = await isRateLimited({
    key: `admin-login:${clientIp}`,
    limit: 3,
    window: 300
  });

  if (rateLimited) {
    return json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  if (password === ADMIN_PASSWORD) {
    setAdminAuthenticated(cookies, true);
    return json({ success: true });
  }

  return json({ error: 'Invalid password' }, { status: 401 });
};
