import { randomBytes } from 'crypto';

export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

export function getSessionId(cookies: any): string {
  let sessionId = cookies.get('session_id');

  if (!sessionId) {
    sessionId = generateSessionId();
    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });
  }

  return sessionId;
}

export function isAuthenticated(cookies: any): boolean {
  return cookies.get('authenticated') === 'true';
}

export function setAuthenticated(cookies: any, value: boolean): void {
  if (value) {
    cookies.set('authenticated', 'true', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 24 hours
    });
  } else {
    cookies.delete('authenticated', { path: '/' });
  }
}
