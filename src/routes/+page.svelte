<script lang="ts">
  import { onMount } from 'svelte';
  import { obsStore } from '$lib/stores/obs';
  import type { ObsAction, ObsStatusResponse } from '$lib/types/obs';

  let selectedScene = '';
  let isSubmitting = false;
  let statusRefreshId = 0;

  async function parseApiResponse(response: Response) {
    try {
      return await response.json();
    } catch {
      return {
        error: `Unexpected response from server (HTTP ${response.status}).`,
      };
    }
  }

  // It asks the backend for OBS’s status and puts the result into the store
  async function refreshStatus() {
    const refreshId = ++statusRefreshId;

    try {
      const response = await fetch('/api/obs/status');
      const payload = await parseApiResponse(response);

      if (refreshId !== statusRefreshId) return;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to load OBS status.');
      }

      const status: ObsStatusResponse = payload;

      // Keep the user's dropdown choice unless that scene no longer exists.
      if (!status.scenes.includes(selectedScene)) {
        selectedScene = status.currentScene;
      }

      obsStore.update((state) => {
        const startedElsewhere = status.isRecording && !state.isRecording;
        return {
          ...state,
          ...status,
          isLoading: false,
          isConnected: true,
          error: null,
          recordFilename:
            status.isRecording && !startedElsewhere
              ? state.recordFilename
              : null,
          lastRecordFilename: status.isRecording
            ? startedElsewhere
              ? null
              : state.lastRecordFilename
            : (state.recordFilename ?? state.lastRecordFilename),
        };
      });
    } catch (error) {
      if (refreshId !== statusRefreshId) return;
      console.error('OBS status refresh failed:', error);
      obsStore.update((state) => ({
        ...state,
        isLoading: false,
        isConnected: false,
        error:
          error instanceof Error ? error.message : 'Unable to connect to OBS.',
      }));
    }
  }

  // Start recording, Stop recording or Switch scene
  async function triggerAction(action: ObsAction, sceneName?: string) {
    isSubmitting = true;

    try {
      const response = await fetch('/api/obs/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, sceneName }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(
          payload.error ?? 'There was a problem sending the OBS request.',
        );
      }
      if (action === 'start-recording') {
        obsStore.update((state) => ({
          ...state,
          isRecording: true,
          recordFilename: payload.recordFilename ?? null,
          lastRecordFilename: null,
        }));
      } else if (action === 'stop-recording') {
        obsStore.update((state) => ({
          ...state,
          isRecording: false,
          recordFilename: null,
          lastRecordFilename:
            payload.recordFilename ??
            state.recordFilename ??
            state.lastRecordFilename,
        }));
      }

      await refreshStatus();
    } catch (error) {
      console.error('OBS action failed:', error);
      obsStore.update((state) => ({
        ...state,
        error: error instanceof Error ? error.message : 'OBS action failed.',
      }));
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    void refreshStatus();
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 2000);

    return () => window.clearInterval(interval);
  });

  $: sceneOptions = $obsStore.scenes;
  $: recordLabel = $obsStore.isRecording
    ? $obsStore.recordFilename
      ? `${$obsStore.recordFilename} (recording in progress)`
      : 'Recording in progress'
    : ($obsStore.lastRecordFilename ?? 'No active recording');
</script>

<svelte:head>
  <title>OBS Control</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
  <div
    class="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-panel backdrop-blur"
  >
    <header
      class="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <p class="text-sm uppercase tracking-[0.22em] text-sky-300">
          OBS Control
        </p>
        <h1 class="mt-2 text-3xl font-semibold text-white">
          Streaming & recording dashboard
        </h1>
      </div>

      <div
        class="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-200"
      >
        <span class="inline-flex items-center gap-2">
          <span
            class={`inline-block h-2.5 w-2.5 rounded-full ${$obsStore.isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}
          ></span>
          <span class="font-medium text-slate-400">OBS:</span>
        </span>
        <span>{$obsStore.isConnected ? 'Connected' : 'Disconnected'}</span>
        <span class="text-slate-500">•</span>
        <span>{$obsStore.isRecording ? 'Recording live' : 'Standby'}</span>
      </div>
    </header>

    {#if $obsStore.isLoading}
      <div
        class="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200"
      >
        Connecting to OBS and loading status...
      </div>
    {/if}

    {#if $obsStore.error}
      <div
        class="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
      >
        {$obsStore.error}
      </div>
    {/if}

    <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2">
          <button
            class="rounded-2xl bg-sky-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || $obsStore.isRecording}
            on:click={() => void triggerAction('start-recording')}
          >
            Start recording
          </button>

          <button
            class="rounded-2xl bg-rose-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !$obsStore.isRecording}
            on:click={() => void triggerAction('stop-recording')}
          >
            Stop recording
          </button>
        </div>

        <div class="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <label
            for="scene-select"
            class="mb-3 block text-sm font-medium text-slate-300"
            >Current scene</label
          >
          <div class="flex flex-col gap-3 sm:flex-row">
            <select
              id="scene-select"
              bind:value={selectedScene}
              class="flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-3 text-slate-100 outline-none transition focus:border-sky-500"
            >
              {#if sceneOptions.length === 0}
                <option value="">No scenes available</option>
              {:else}
                {#each sceneOptions as scene}
                  <option value={scene}>{scene}</option>
                {/each}
              {/if}
            </select>

            <button
              class="rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 font-medium text-slate-100 transition hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !selectedScene}
              on:click={() => void triggerAction('switch-scene', selectedScene)}
            >
              Switch scene
            </button>
          </div>
        </div>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p class="text-sm uppercase tracking-[0.18em] text-slate-400">
            Live scene
          </p>
          <p class="mt-3 text-2xl font-semibold text-white">
            {$obsStore.currentScene}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p class="text-sm uppercase tracking-[0.18em] text-slate-400">
            Recording file
          </p>
          <p class="mt-3 break-words text-lg font-medium text-sky-200">
            {recordLabel}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p class="text-sm uppercase tracking-[0.18em] text-slate-400">
            Timecode
          </p>
          <p class="mt-3 text-2xl font-semibold text-white">
            {$obsStore.recordTimecode}
          </p>
        </div>
      </aside>
    </div>
  </div>
</div>
