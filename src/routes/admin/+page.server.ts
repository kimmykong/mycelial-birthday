import type { PageServerLoad } from './$types';
import { getAllSessions } from '$lib/db';

export const load: PageServerLoad = async () => {
  const sessions = await getAllSessions();
  return {
    sessions
  };
};
