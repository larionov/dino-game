<script>
  import GroundImg from './GroundImg.svelte';
  import { posX, width } from '../store/store.js';
  let x = 0;
  let gWidth=635*4;
  $: x = parseInt($posX, 10) % 4000;

  let groundWidth = 0;
  let groundEl;

  //$: console.log( $posX, x, $width);
</script>

<svg width="4000" height="50" viewBox="0 0 4000 50" x={$width - x +  gWidth} y="805">
  <g transform="scale(4,4)">
     <GroundImg />
  </g>
</svg>
<svg width="4000" height="50" viewBox="0 0 4000 50" x={$width - x} y="805">
  <g transform="scale(4,4)">
     <GroundImg />
  </g>
</svg>
<svg width="4000" height="50" viewBox="0 0 4000 50" x={$width - x - gWidth} y="805">
  <g transform="scale(4,4)">
     <GroundImg />
  </g>
</svg>
