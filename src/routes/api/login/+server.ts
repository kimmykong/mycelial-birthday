import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setAuthenticated } from '$lib/session';
import { isRateLimited } from '$lib/rateLimit.ts';

const PASSWORD = process.env.PASSWORD || 'changeme';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const { password } = await request.json();
  const clientIp = getClientAddress();

  // Rate limiting: 5 login attempts per minute per IP
  const rateLimited = await isRateLimited({
    key: `login:${clientIp}`,
    limit: 5,
    window: 60
  });

  if (rateLimited) {
    return json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  if (password === PASSWORD) {
    setAuthenticated(cookies, true);
    return json({ success: true });
  }

  return json({ error: ':( try again. I believe in you <3' }, { status: 401 });
};
