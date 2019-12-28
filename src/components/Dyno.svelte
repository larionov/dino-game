<script>
  import * as PIXI from 'pixi.js'
  import * as particles from 'pixi-particles';
  let windowWidth = 800;
  let windowHeight = 600;

  import { Bump } from '../bump.js';
  let b = new Bump(PIXI);
  let game;
  export let resources;
  export let app;

  let sheet = resources["../assets/sprites/spritesheet.json"].spritesheet;

  var renderer = PIXI.autoDetectRenderer(1920, 1920/4, null);
  renderer.backgroundColor = 0xffffff;

  let gameOver = false;


  $: if (app) app.renderer = renderer;

  $: if(game && app.renderer) game.appendChild(renderer.view);

  import { onMount } from 'svelte';
  import {Howl, Howler} from 'howler';
//  import Character from './Character.svelte';
//  import Ground from './Ground.svelte';
//  import Obstacle from './Obstacle.svelte';
  import { gameStarted, speedX, posY, posX, gravity, jumpVector, frameLength, width, height } from '../store/store.js';

  let explosionContainer = new PIXI.Container();
  explosionContainer.zIndex = 1000;

  //explosionContainer.transform.scale.set(0.25, 0.25);

  let emitter = new particles.Emitter(
      explosionContainer,
      [sheet.textures['explosion02.png'], sheet.textures['explosion01.png'], sheet.textures['explosion00.png']],
      //[sheet.textures['bird-0.png']],
      resources["../assets/emitter.json"].data,
  );
  emitter.emit = false;
  emitter.autoUpdate = true;

  let bunny = new PIXI.AnimatedSprite(sheet.animations["bunny"]);
  bunny.transform.scale.set(1, -1);
  bunny.zIndex = 100;

  console.log(resources);
  let ground = new PIXI.TilingSprite(resources['../assets/ground2.png'].texture, 2400, 24);
  ground.transform.scale.set(1, -1);
  ground.zIndex = 1;

  let explosion = new PIXI.AnimatedSprite(sheet.animations["explosion"]);
  explosion.transform.scale.set(.25, -.25);
  explosion.zIndex = 1000;
  function lerp (start, end, amt){
      return (1-amt)*start+amt*end
  }

  let floorY = 100;

  let isJumping = false;

  let speedVector = 0;

  let jumpStart = 0;
  let prevTime = 0;

  let canJump = true;
  let jumpsLimit = 2;
  let jumpsCount = 0;

  let disableClick = false;

  let loaded = false;

  let obstacles = [];

  $posY = floorY;

  let text = new PIXI.Text('This is a PixiJS text',{fontFamily : 'Arial', fontSize: 24, fill : 0xff1010, align : 'center'});
  text.scale.y = -1;
  $: text.x = 50;
  $: text.y = 50;
  const soundCache = {};

  function groundSpeed(posX) {
      if (posX < 5000) return 15.00;
      if (posX < 300000) return lerp(15.00, 30.00, posX / 300000);
      return 30;
  }

  $: $speedX = groundSpeed($posX);

  const soundJump = new Howl({
      src: ['/assets/footstep05.ogg', '/assets/footstep05.mp3'],
      volume: 0.2,
  });

  const soundExplosion = new Howl({
      src: ['/assets/mp3/soundscrate-explosionboom2.mp3'],
      volume: 0.3,
  });

  const handleKeydown = (e) => {
      if (!$gameStarted) return;
      if (e.type === 'touchstart') disableClick = true;
      if (e.type === 'click' && disableClick) return;

      if (!canJump) return;
      if (jumpsCount >= jumpsLimit) return;

      if (e.type === 'touchstart' || e.type === 'click' || e.code === 'Space') {
          bunny.gotoAndStop(1);
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
      if (!$gameStarted) return;
      canJump = true;
  };


  $: {
      let scale = lerp(.5, 1, (windowWidth - 320) / 1080);
      let ratio = lerp(1/2, 1/4, (windowWidth - 320) / 1080);
      let topPadding = lerp(0, windowHeight/4, (windowWidth - 320) / 1080).toFixed(0);
      app.view.style.transformOrigin = 'top left';
      app.view.style.transform = `scale(${scale}, ${scale})  translate(0, ${topPadding}px)`;
      //app.view.style.width = `${$width}px`;
      //app.view.style.height = `${$height}px`;
      renderer.resize(windowWidth/scale, (windowWidth * ratio)/scale);

      app.stage.position.y = app.view.height / renderer.resolution;
      app.stage.scale.y = -1;
  }
  bunny.animationSpeed = .2;
  bunny.play();

  //  app.stage.scale = new PIXI.Point(0.25, 0.25);
  app.stage.sortableChildren = true;
  app.stage.addChild(bunny);
  app.stage.addChild(ground);
  app.stage.addChild(text);
  app.stage.addChild(explosionContainer);
  ground.y = floorY + 8;
  app.ticker.add((delta) => {
      if (!$gameStarted) return;
      if (gameOver) return;
      isJumping = true;
      speedVector += $gravity * delta;
      $posY += speedVector * delta;
      $posX += $speedX * delta;

      if ($posY <= floorY) {
          speedVector = 0;
          $posY = floorY;
          isJumping = false;
          jumpsCount = 0;
          bunny.play();
      }

      ground.tilePosition.x = windowWidth - $posX % ground.width;

      obstacles.forEach(ob => {
          if ($posX > ob.position + 2000) {
              app.stage.removeChild(ob.sprite);
          }
      });
      obstacles = obstacles.filter(ob => ($posX < ob.position + 2000));
      while(obstacles.length < 5) {
          let ob = {
              position: $posX + renderer.width + Math.floor(Math.random() * Math.floor(5000)),
              sprite: new PIXI.Sprite(sheet.textures["stone.png"]),
          };

          //ob.sprite.transform.scale.set(.25, -.25);
          ob.sprite.transform.scale.set(.75, -.75);
          ob.sprite.zIndex = 0;
          app.stage.addChild(ob.sprite);
          obstacles.push(ob);
      }
      app.stage.sortChildren();

      bunny.x = 100;
      bunny.y = $posY;

      obstacles.forEach(ob => {
          ob.sprite.x = renderer.width - $posX + ob.position;
          ob.sprite.y = floorY;

          const collision = b.hitTestRectangle(bunny, ob.sprite);
          if (collision) {
 			        emitter.emit = true;
              console.log('eeee');
              setTimeout(() => {
                  //$posX = 0;
                  //$gameStarted = false;
                  //app.stage.removeChildren();
                  //gameOver = false;
              }, 1000);
              gameOver = true;
              soundExplosion.play();
              bunny.stop();
          }
      });



      text.text = `${($posX/100).toFixed(0)}`;

			emitter.resetPositionTracking();
			emitter.updateOwnerPos(bunny.x, bunny.y);
  });

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

<div bind:this={game} />
