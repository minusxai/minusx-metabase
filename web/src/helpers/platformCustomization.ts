export function getPlatformShortcut() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘ + k' : 'Ctrl + k';
}
