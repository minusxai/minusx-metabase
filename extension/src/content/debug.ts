import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { fireEvent } from '@testing-library/dom';
window.userEvent = userEvent
window.fireEvent = fireEvent
