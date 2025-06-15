<script lang="ts">
  import Clock from './lib/clock.svelte'
  import Cubes from './lib/threejs/cubes.svelte'
</script>

<main>
  <!-- Three.js cubes as background -->
  <Cubes />
  
  <div class="left-section">
    <Clock />
  </div>
  
  <div class="center-section">
    <!-- Center content -->
  </div>
  
  <div class="right-section">
    <!-- Add right widgets here -->
  </div>
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 35px;
    overflow: hidden;
    background-color: transparent;
  }

  main {
    position: relative;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .left-section {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: flex-start;
    padding-left: 10px;
    z-index: 10;
    position: relative;
  }

  .center-section {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    z-index: 10;
    position: relative;
  }

  .right-section {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: flex-end;
    padding-right: 10px;
    z-index: 10;
    position: relative;
  }
</style>
