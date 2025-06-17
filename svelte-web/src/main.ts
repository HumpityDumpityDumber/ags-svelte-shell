import { mount } from 'svelte'
import Bar from './bar.svelte'

const app = mount(Bar, {
  target: document.getElementById('app')!,
})

export default app
