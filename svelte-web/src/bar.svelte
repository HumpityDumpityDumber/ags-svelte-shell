<script lang="ts">
  import Clock from './lib/clock.svelte'
  import AudioVisualizer from './lib/audiovisual.svelte'
  import Controller from './lib/controller.svelte'
</script>

<main>
  <!-- Full-screen audio visualizer background -->
  <div class="audio-background">
    <AudioVisualizer />
  </div>

  <div class="left-section">
    <Clock />
  </div>
  
  <div class="right-section">
    <Controller />
  </div>
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 60px;
    overflow: hidden;
    background-color: transparent;
  }

  main {
    position: relative;
    height: 60px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
  }

  .audio-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .left-section {
    display: flex;
    align-items: flex-start;
    flex: 1;
    justify-content: flex-start;
    padding-left: 10px;
    z-index: 10;
    position: relative;
    height: 25px;
    margin-top: 5px;
  }

  .right-section {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: flex-end;
    padding-right: 10px;
    z-index: 10;
    position: relative;
    margin-top: 5px;
  }
</style>
