import type { Handle } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/session';

export const handle: Handle = async ({ event, resolve }) => {
  const { url, cookies } = event;

  // Allow login page and API login endpoint
  if (url.pathname === '/login' || url.pathname === '/api/login') {
    return resolve(event);
  }

  // Check authentication for all other routes
  if (!isAuthenticated(cookies)) {
    return new Response(null, {
      status: 302,
      headers: {
        location: '/login'
      }
    });
  }

  return resolve(event);
};
