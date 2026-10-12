import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleObsAction } from '$lib/server/obs';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    const response = await handleObsAction(payload);
    return json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to handle OBS action.';

    console.error('POST /api/obs/action failed:', message);
    return json({ error: message }, { status: 500 });
  }
};
