import type { Handle } from '@sveltejs/kit';
import { isAuthenticated, isAdminAuthenticated } from '$lib/session';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
  const { url, cookies } = event;

  // Allow login pages and API login endpoints
  if (url.pathname === '/login' || url.pathname === '/api/login' ||
      url.pathname === '/admin/login' || url.pathname === '/api/admin/login') {
    return resolve(event);
  }

  // Check admin authentication for admin routes
  if (url.pathname.startsWith('/admin')) {
    if (!isAdminAuthenticated(cookies)) {
      return new Response(null, {
        status: 302,
        headers: {
          location: '/admin/login'
        }
      });
    }
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

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => {
      // Inject Umami analytics script if configured
      if (env.UMAMI_WEBSITE_ID && env.UMAMI_SCRIPT_URL) {
        const umamiScript = `<script defer src="${env.UMAMI_SCRIPT_URL}" data-website-id="${env.UMAMI_WEBSITE_ID}"></script>`;
        // Inject before closing </head> tag
        return html.replace('</head>', `${umamiScript}</head>`);
      }
      return html;
    }
  });

  return response;
};
