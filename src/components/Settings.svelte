<script>
  import { posY, jumpVector, gravity } from '../store/store.js';

  export let isOpen;
  const handleCloseButton = () => {
      isOpen.set(false);
  };
</script>



<!--Modal-->
<div
  on:click|stopPropagation
  class={`modal ${$isOpen ? '' : 'opacity-0 pointer-events-none'} fixed w-full h-full top-0 left-0 flex items-center justify-center`}>
  <div class="modal-overlay absolute w-full h-full bg-gray-900 opacity-50"></div>

  <div class="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">

    <button on:click={handleCloseButton} class="modal-close absolute top-0 right-0 cursor-pointer flex flex-col items-center mt-4 mr-4 text-white text-sm z-50">
      <svg class="fill-current text-white" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
        <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"></path>
      </svg>
      <span class="text-sm">(Esc)</span>
    </button>

    <!-- Add margin if you want to see some of the overlay behind the modal-->
    <div class="modal-content py-4 text-left px-6">
      <!--Title-->
      <div class="flex justify-between items-center pb-3">
        <p class="text-2xl font-bold">Simple Modal!</p>
        <div class="modal-close cursor-pointer z-50" on:click={handleCloseButton}>
          <svg class="fill-current text-black" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
            <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"></path>
          </svg>
        </div>
      </div>

      <!--Body-->
      <div class="w-full">
        <input
          class="w-full"
          type="range"
          bind:value={$jumpVector}
          min={-3000}
          max={3000}
          step={1} />
        <div style="padding-left: 10px;">
          <div>
            {Math.round($jumpVector)}
          </div>
          <small>jumpVector</small>
        </div>
      </div>
      <div class="w-full">
        <input
          class="w-full"
          type="range"
          bind:value={$gravity}
          min={-3000}
          max={3000}
          step={1} />
        <div style="padding-left: 10px;">
          <div>
            {$gravity}
        </div>
          <small>gravity</small>
        </div>
      </div>
      <!--Footer-->
      <div class="flex justify-end pt-2">
        <button on:click={handleCloseButton} class="px-4 bg-transparent p-3 rounded-lg text-indigo-500 hover:bg-gray-100 hover:text-indigo-400 mr-2">Action</button>
        <button on:click={handleCloseButton} class="modal-close px-4 bg-indigo-500 p-3 rounded-lg text-white hover:bg-indigo-400">Close</button>
      </div>

    </div>
  </div>
</div>
