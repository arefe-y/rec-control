export interface ObsConfig {
  host: string;
  port: number;
  password: string;
}

export type ObsAction = 'start-recording' | 'stop-recording' | 'switch-scene';

export interface ObsActionPayload {
  action: ObsAction;
  sceneName?: string;
}

export interface ObsActionResult {
  message: string;
  recordFilename?: string | null;
}

export interface ObsStatusResponse {
  currentScene: string;
  scenes: string[];
  isRecording: boolean;
  recordFilename: string | null;
  recordTimecode: string;
}
