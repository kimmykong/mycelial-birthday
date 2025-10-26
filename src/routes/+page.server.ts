import type { PageServerLoad } from './$types';
import { getTopAdjectives, getSubmissionCount } from '$lib/db';
import { getSessionId } from '$lib/session';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ cookies }) => {
  const sessionId = getSessionId(cookies);
  const adjectives = await getTopAdjectives(30);
  const submissionCount = await getSubmissionCount(sessionId);

  return {
    adjectives,
    submissionCount,
    submissionEndDate: env.SUBMISSION_END_DATE ? parseInt(env.SUBMISSION_END_DATE) : null
  };
};
