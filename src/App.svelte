<script>
  import Sprites from './assets/Sprites-project.svg';
  import Dyno from './components/Dyno.svelte';
  import Router from './components/Router.svelte';
  import Settings from './components/Settings.svelte';
  import { isSettingsOpen, frameLength } from './store/store.js';

  const onSettingsClick = () => {

      $isSettingsOpen = !$isSettingsOpen;
  };
  const onSettingsClose = (e) => {
      $isSettingsOpen = false;
  };
  if ('serviceWorker' in navigator) {
      //navigator.serviceWorker.register('/service-worker.js');

      navigator.serviceWorker.addEventListener('activate', function(event) {
          event.waitUntil(
              caches.keys().then(function(cacheNames) {
                  return Promise.all(
                      cacheNames.filter(function(cacheName) {
                          return true;
                          // Return true if you want to remove this cache,
                          // but remember that caches are shared across
                          // the whole origin
                      }).map(function(cacheName) {
                          return caches.delete(cacheName);
                      })
                  );
              })
          );
      });
  }
</script>

<style lang="postcss">
</style>
<div style="display: none">{@html Sprites }</div>
<div class="absolute">
  <button
    on:click|stopPropagation={onSettingsClick}
    class="relative bg-transparent border "
  >
  <small>{$frameLength.toFixed(0)}</small>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path class="heroicon-ui" d="M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
  </button>
</div>
<main class="overflow-hidden">
  <Router/>
  <Settings isOpen={isSettingsOpen} onClose={onSettingsClose}/>
  <Dyno />
</main>
