<script>
  import { width, posX } from '../store/store.js';
  import svg from '../assets/stone.svg';
  import svgScared from '../assets/stone-scared.svg';

  export let distance;

  let x = 0;
  $: x = Math.floor($posX) - distance;
</script>

<!--g transform={`translate(${$width -x}, 705)`}>
  {#if ($width - x) < 200}
    {@html svgScared}
  {:else}
    {@html svg}
  {/if}
</g -->
