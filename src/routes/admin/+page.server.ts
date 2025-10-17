import type { PageServerLoad } from './$types';
import { getAllSubmissions } from '$lib/db';

export const load: PageServerLoad = async () => {
  const submissions = await getAllSubmissions();
  return {
    submissions
  };
};
