<script>
  import Sprites from './assets/Sprites-project.svg';
  import Dyno from './components/Dyno.svelte';
  import Router from './components/Router.svelte';

  let jumpVector = -1100;
  let gravity = 1700;
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
  <div class="relative">
    <input
      class="w-screen"
      type="range"
      bind:value={jumpVector}
      min={-3000}
      max={3000}
      step={1} />
    <div style="padding-left: 10px;">
      <div>
        {Math.round(jumpVector)}
      </div>
      <small>jumpVector</small>
    </div>
  </div>
  <div class="relative">
    <input
      class="w-screen"
      type="range"
      bind:value={gravity}
      min={-3000}
      max={3000}
      step={1} />
    <div style="padding-left: 10px;">
      <div>
        {gravity}
      </div>
      <small>gravity</small>
    </div>
  </div>
</div>
<main class="overflow-hidden">
  <Router/>
  <Dyno jumpVector={jumpVector} gravity={gravity} />
</main>
