<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  let interval: number;

  onMount(() => {
    interval = setInterval(() => {
      time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }, 1000);
  });

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<p>{time}</p>

<style>
  p {
    font-family: Google Sans Rounded;
    font-size: 16px;
    font-weight: 800;
    text-align: center;
    margin: 0;
    padding: 10px;
    color: #c2c2c2;
  }
</style>