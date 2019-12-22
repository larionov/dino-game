<script>
	export let posY;
	export let isJumping;

  let cycle = ['#idle', '#running'];
  let current = 0;

  setInterval(() => current = (current + 1) % cycle.length, 100);

</script>

<g transform={`translate(100, ${$posY})`}>
  <use xlink:href={isJumping ? '#running' : cycle[current]} transform={`scale(0.5, 0.5)`}/>
</g>
