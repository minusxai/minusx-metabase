import { sleep } from '../../helpers/utils';

export default async function ripple(x: number, y: number, wait = 1000, style?: Record<string, string>) {
  const rippleRadius = 30;
  const ripple = document.createElement('div');
  ripple.classList.add('web-agent-ripple');
  ripple.style.width = ripple.style.height = `${rippleRadius * 2}px`;
  // Take scroll position into account
  ripple.style.top = `${window.scrollY + y - rippleRadius}px`;
  ripple.style.left = `${x - rippleRadius}px`;
  if (style) {
    for (let key in style) {
      ripple.style[key] = style[key]
    }
  }

  document.body.appendChild(ripple);

  await sleep(wait);
  ripple.remove();
}
