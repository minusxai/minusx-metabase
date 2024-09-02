import { toggleMinusX } from "./RPCs/domEvents";
export function enableButtonDragAndToggle(button: HTMLElement) {
  // Unset the 'bottom' style
  button.style.bottom = '';

  let isDragging = false;
  let startY: number;
  let startTop: number;

  const dragThreshold = 5; // Threshold to distinguish drag from click
  let moved = false;

  button.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    moved = false;
    startY = e.clientY;
    startTop = parseInt(window.getComputedStyle(button).top, 10);
    button.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent text selection
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (isDragging) {
      const deltaY = e.clientY - startY;
      if (Math.abs(deltaY) > dragThreshold) {
        moved = true;
      }
      let newTop = startTop + deltaY;

      // Limit the Y range to 5px from top and bottom
      const maxTop = window.innerHeight - button.offsetHeight - 5;
      const minTop = 5;
      newTop = Math.min(Math.max(newTop, minTop), maxTop);

      button.style.top = `${newTop}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      button.style.cursor = 'grab';
      document.body.style.userSelect = 'auto'; // Restore text selection
    }
  });

  button.addEventListener('click', (e: MouseEvent) => {
    if (!moved) {
      // Execute toggle function only if the button was not dragged
      toggleMinusX();
    }
  });
}
