import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllSubmissions } from '$lib/db';

export const GET: RequestHandler = async () => {
  const submissions = getAllSubmissions();
  return json(submissions);
};
