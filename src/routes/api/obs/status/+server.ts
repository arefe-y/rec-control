import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getObsStatus } from '$lib/server/obs';

export const GET: RequestHandler = async () => {
  try {
    const status = await getObsStatus();
    return json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch OBS status.';

    console.error('GET /api/obs/status failed:', message);
    return json({ error: message }, { status: 500 });
  }
};
