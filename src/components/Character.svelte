<script>
	export let posY;
	export let isJumping;
  import { speedX } from '../store/store.js';

  let cycle = ['#idle', '#running'];
  let current = 0;

  function lerp (start, end, amt){
      return (1-amt)*start+amt*end
  }

  function switchLegs() {
      current = (current + 1) % cycle.length;
      const timeout = Math.floor(lerp(80, 30, ($speedX - 799) / 1000));
      setTimeout(switchLegs, timeout);
  }
  switchLegs();

</script>

<g transform={`translate(100, ${$posY})`}>
  <use xlink:href={isJumping ? '#running' : cycle[current]} transform={`scale(0.5, 0.5)`}/>
</g>
