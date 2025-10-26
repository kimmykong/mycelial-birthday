import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
  return {
    loginQuestion: env.LOGIN_QUESTION || 'Password',
    loginPlaceholder: env.LOGIN_PLACEHOLDER || 'password'
  };
};
