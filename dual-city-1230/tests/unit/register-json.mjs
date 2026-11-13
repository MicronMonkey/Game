// Lets Node import the game's `import x from '*.json'` modules (Vite handles this in the browser).
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function load(url, ctx, next) {
  if (url.endsWith('.json')) {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL(url), 'utf8');
    return { format: 'module', source: 'export default ' + src + ';', shortCircuit: true };
  }
  return next(url, ctx);
}`));
