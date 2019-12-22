<script>
  import {Howl, Howler} from 'howler';
  import Character from './Character.svelte';
  import Ground from './Ground.svelte';
  import { posY, posX, gravity, jumpVector, frameLength } from '../store/store.js';

  let floorY = 600;
  let windowWidth;
  let windowHeight;
  let width = 0;
  let height = 0;

  let isJumping = false;

  let speedVector = 0;
  let speedGround = 600;

  let jumpStart = 0;
  let prevTime = 0;

  let canJump = true;
  let jumpsLimit = 2;
  let jumpsCount = 0;

  let disableClick = false;

  $posY = floorY;

  const soundCache = {};

  const soundJump = new Howl({
      src: ['/assets/footstep05.ogg'],
      volume: 0.2,
  });

  const render = (timestamp) => {
      if (!prevTime) prevTime = timestamp;
      $frameLength = timestamp - prevTime;
      isJumping = true;
      speedVector += $gravity * $frameLength/1000;

      $posY += speedVector * $frameLength/1000;
      $posX += speedGround * $frameLength/1000;

      if ($posY > floorY) {
          speedVector = 0;
          $posY = floorY;
          isJumping = false;
          jumpsCount = 0;
      }
      prevTime = timestamp;
      requestAnimationFrame(render);
  };

  requestAnimationFrame(render);

  const handleKeydown = (e) => {
      if (e.type === 'touchstart') disableClick = true;
      if (e.type === 'click' && disableClick) return;

      if (!canJump) return;
      if (jumpsCount >= jumpsLimit) return;

      if (e.type === 'touchstart' || e.type === 'click' || e.code === 'Space') {
          speedVector = $jumpVector;
          jumpsCount = jumpsCount + 1;
          prevTime = 0;
          canJump = false;
          soundJump.play();
      }
      if (e.type === 'click') {
          canJump = true;
      }
  };
  const handleKeyup = (e) => {
      canJump = true;
  };

  $: width = windowWidth < 800 ? 800 : windowWidth;
  $: height = windowHeight;
  $: if ($posX > 1650) $posX = 0;
</script>

<style type="text/postcss">
</style>
<svelte:window
  bind:innerWidth={windowWidth}
  bind:innerHeight={windowHeight}
  on:keydown={handleKeydown}
  on:keyup={handleKeyup}
  on:click={handleKeydown}
  on:touchstart={handleKeydown}
  on:touchend={handleKeyup}


/>
<div class="flex items-center justify-center h-screen bg-gray-200">
  <svg xmlns="http://www.w3.org/2000/svg" class="w-screen h-screen" viewBox={`0 0 ${width || 0} ${height || 0}`} shape-rendering="crispEdges">

    <defs>
      <pattern id="smallGrid" width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="gray" stroke-width="0.5"/>
      </pattern>
      <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#smallGrid)"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1"/>
      </pattern>
    </defs>

    <!--rect width={`${width}px`} height={`${height}px`} fill="url(#grid)" /-->
    <Character posY={posY} isJumping={isJumping} />
    <g transform={`translate(${-$posX}, 805), scale(4,4)`}>
      <Ground />
    </g>

  </svg>
</div>
