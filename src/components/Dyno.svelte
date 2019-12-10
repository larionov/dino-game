<script>
  import Character from './Character.svelte';
  import Ground from './Ground.svelte';
  import { posY } from '../store/store.js';

  let floorY = 600;

  let isJumping = false;

  let speedVector = 0;
  export let jumpVector = -90;
  export let gravity = 60;

  let jumpAnimation;

  let jumpStart = 0;
  let prevTime = 0;

  $posY = floorY;

  const jump = (timestamp) => {
      if (!prevTime) prevTime = timestamp;
      const frameLength = timestamp - prevTime;
      isJumping = true;
      speedVector += gravity * frameLength/1000;
      $posY += speedVector * frameLength/1000;

      jumpAnimation = requestAnimationFrame(jump);
      if ($posY > floorY) {
          speedVector = 0;
          cancelAnimationFrame(jumpAnimation);
          $posY = floorY;
          isJumping = false;
      }
      prevTime = timestamp;
  };

  const handleKeydown = (e) => {
      console.log(e);
      if (e.type === 'touchstart' || e.type === 'click' || e.code === 'Space') {
          speedVector = jumpVector;
          prevTime = 0;
          requestAnimationFrame(jump);
      }
  };

</script>

<style type="text/postcss">
</style>
<svelte:window
  on:keydown={handleKeydown}
  on:click={handleKeydown}
  on:touchstart={handleKeydown}
/>
<div class="flex items-center justify-center h-screen bg-gray-200">
  <svg xmlns="http://www.w3.org/2000/svg" class="w-screen h-screen" viewBox="0 0 800 600" shape-rendering="crispEdges">
    <Character posY={posY} isJumping={isJumping} />
  </svg>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><Ground /></svg>
</div>
