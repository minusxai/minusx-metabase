import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { fireEvent } from '@testing-library/dom';
import { dropText } from './RPCs/actions'
window.userEvent = userEvent
window.fireEvent = fireEvent
window.dropText = dropText
