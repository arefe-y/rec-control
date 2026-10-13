import { writable } from 'svelte/store';

export interface ObsStatus {
  isRecording: boolean;
  currentScene: string;
  recordFilename: string | null;
  lastRecordFilename: string | null;
  recordTimecode: string;
  scenes: string[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
}

export const obsStore = writable<ObsStatus>({
  isRecording: false,
  currentScene: 'Unknown',
  recordFilename: null,
  lastRecordFilename: null,
  recordTimecode: '00:00:00',
  scenes: [],
  isLoading: true,
  isConnected: false,
  error: null,
});
