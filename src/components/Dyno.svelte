<script>
  import {Howl, Howler} from 'howler';
  import Character from './Character.svelte';
  import Ground from './Ground.svelte';
  import Obstacle from './Obstacle.svelte';
  import { speedX, posY, posX, gravity, jumpVector, frameLength, width, height } from '../store/store.js';

  function lerp (start, end, amt){
      return (1-amt)*start+amt*end
  }

  let floorY = 600;
  let windowWidth;
  let windowHeight;

  let isJumping = false;

  let speedVector = 0;

  let jumpStart = 0;
  let prevTime = 0;

  let canJump = true;
  let jumpsLimit = 2;
  let jumpsCount = 0;

  let disableClick = false;

  let gameRunning = true;

  $posY = floorY;

  const soundCache = {};

  function groundSpeed(posX) {
      if (posX < 5000) return 800;
      if (posX < 300000) return lerp(800, 1800, posX / 300000);
      return 1800;
  }

  $: $speedX = parseInt(groundSpeed($posX), 10);

  const soundJump = new Howl({
      src: ['/assets/footstep05.ogg', '/assets/footstep05.mp3'],
      volume: 0.2,
  });

  const render = (timestamp) => {
      if (!gameRunning) return;

      if (!prevTime) prevTime = timestamp;
      $frameLength = timestamp - prevTime;
      isJumping = true;
      speedVector += $gravity * $frameLength/1000;

      $posY += speedVector * $frameLength/1000;
      $posX += parseInt($speedX * $frameLength/1000);

      if ($posY > floorY) {
          speedVector = 0;
          $posY = floorY;
          isJumping = false;
          jumpsCount = 0;
      }
      prevTime = timestamp;

      if (!checkCollision($posX, 3000, 100, 100)) {
          gameRunning = false;
      }
      if (!checkCollision($posX, 3500, 100, 100)) {
          gameRunning = false;
      }
      if (!checkCollision($posX, 4000, 100, 100)) {
          gameRunning = false;
      }
      if (!checkCollision($posX, 4300, 100, 100)) {
          gameRunning = false;
      }
      requestAnimationFrame(render);
  };

  requestAnimationFrame(render);

  function checkCollision(posX,distance,w, height) {
      console.log(posX - distance - $width, -2 * w,  -3 * w);
      if(posX - distance - $width > -2*w) {
          if (posX - distance - $width < -1*w){
              if ($posY >500) {
                  return false;
              }
          }
      }
      return true;
  }
  const handleKeydown = (e) => {
      if (!gameRunning) return;
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
      if (!gameRunning) return;
      canJump = true;
  };

  $: $width = windowWidth < 800 ? 800 : windowWidth;
  $: $height = windowHeight;
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
  <svg xmlns="http://www.w3.org/2000/svg" class="w-screen h-screen" viewBox={`0 0 ${$width || 0} ${$height || 0}`} shape-rendering="crispEdges">

    <defs>
      <pattern id="smallGrid" width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="gray" stroke-width="0.5"/>
      </pattern>
      <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#smallGrid)"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1"/>
      </pattern>
    </defs>
    <text x="20" y="35" class="small">{$posX}</text>
    <text x="20" y="55" class="small">{$speedX}</text>
    <!--rect width={`${width}px`} height={`${height}px`} fill="url(#grid)" /-->
    <Character posY={posY} isJumping={isJumping} isOver={!gameRunning}/>
    <Ground posX={posX} />
    <Obstacle posX={posX} distance={3000} />
    <Obstacle posX={posX} distance={3500} />
    <Obstacle posX={posX} distance={4000} />
    <Obstacle posX={posX} distance={4300} />
  </svg>
</div>
