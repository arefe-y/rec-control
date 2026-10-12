import { env } from '$env/dynamic/private';
import type {
  ObsActionPayload,
  ObsActionResult,
  ObsConfig,
  ObsStatusResponse,
} from '$lib/types/obs';
import OBSWebSocket from 'obs-websocket-js';

function getObsConfig(): ObsConfig {
  return {
    host: env.OBS_HOST,
    port: Number(env.OBS_PORT),
    password: env.OBS_PASSWORD,
  };
}

async function connectObs(): Promise<OBSWebSocket> {
  const { host, port, password } = getObsConfig();
  const obs = new OBSWebSocket();

  try {
    //Elin => i delete  {rpcVersion: 1}
    await obs.connect(`ws://${host}:${port}`, password);
    return obs;
  } catch (error) {
    console.error('OBS connection error:', error);
    throw new Error(`Could not connect to OBS at ws://${host}:${port}`);
  }
}

async function getCurrentSceneName(obs: OBSWebSocket): Promise<string> {
  try {
    const result = await obs.call('GetCurrentProgramScene');
    return result.sceneName ?? result.currentProgramSceneName;
  } catch (error) {
    console.warn('Unable to get current scene:', error);
    return 'Unknown scene';
  }
}

async function getAvailableScenes(obs: OBSWebSocket): Promise<string[]> {
  try {
    const { scenes } = await obs.call('GetSceneList');
    const names: string[] = [];

    for (const scene of scenes) {
      if (typeof scene.sceneName === 'string' && scene.sceneName.length > 0) {
        names.push(scene.sceneName);
      }
    }
    return names;
  } catch (error) {
    console.warn('Unable to load scene list:', error);
    return [];
  }
}

async function getRecordStatus(obs: OBSWebSocket) {
  const { outputActive, outputTimecode } = await obs.call('GetRecordStatus');
  return {
    isRecording: outputActive,
    recordFilename: null,
    recordTimecode: outputTimecode,
  };
}

async function startRecording(obs: OBSWebSocket): Promise<ObsActionResult> {
  const filePromise = new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 2000);

    obs.on('RecordStateChanged', (event) => {
      if (event.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
        clearTimeout(timer);
        resolve(event.outputPath || null);
      }
    });
  });

  await obs.call('StartRecord');
  const recordFilename = await filePromise;

  return { message: 'Recording started.', recordFilename };
}

async function stopRecording(obs: OBSWebSocket): Promise<ObsActionResult> {
  const { outputPath } = await obs.call('StopRecord');

  return { message: 'Recording stopped.', recordFilename: outputPath || null };
}

async function switchScene(
  obs: OBSWebSocket,
  sceneName?: string,
): Promise<ObsActionResult> {
  if (!sceneName) {
    throw new Error('A scene name is required to switch scenes.');
  }

  await obs.call('SetCurrentProgramScene', { sceneName });

  return { message: `Switched to scene: ${sceneName}` };
}

export async function getObsStatus(): Promise<ObsStatusResponse> {
  const obs = await connectObs();

  try {
    const [currentScene, scenes, recording] = await Promise.all([
      getCurrentSceneName(obs),
      getAvailableScenes(obs),
      getRecordStatus(obs),
    ]);

    return {
      currentScene,
      scenes,
      isRecording: recording.isRecording,
      recordFilename: recording.recordFilename,
      recordTimecode: recording.recordTimecode,
    };
  } finally {
    await obs.disconnect();
  }
}

export async function handleObsAction(
  payload: ObsActionPayload,
): Promise<ObsActionResult> {
  const obs = await connectObs();

  try {
    switch (payload.action) {
      case 'start-recording':
        return await startRecording(obs);
      case 'stop-recording':
        return await stopRecording(obs);
      case 'switch-scene':
        return await switchScene(obs, payload.sceneName);
    }
  } finally {
    await obs.disconnect();
  }
}
