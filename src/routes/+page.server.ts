import type { PageServerLoad } from './$types';
import { getTopAdjectives, getSubmissionCount } from '$lib/db';
import { getSessionId } from '$lib/session';

export const load: PageServerLoad = async ({ cookies }) => {
  const sessionId = getSessionId(cookies);
  const adjectives = await getTopAdjectives(30);
  const submissionCount = await getSubmissionCount(sessionId);

  return {
    adjectives,
    submissionCount
  };
};
