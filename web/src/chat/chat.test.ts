import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../state/store', () => ({ getState: vi.fn() }));
vi.mock('../state/dispatch', () => ({ dispatch: vi.fn() }));
vi.mock('../app/toast', () => ({ toast: vi.fn() }));
vi.mock('../helpers/utils', () => ({ getUniqueString: () => 'test-session' }));
vi.mock('../helpers/origin', () => ({ getParsedIframeInfo: () => ({ r: 'test' }) }));

import { getState } from '../state/store';
import { dispatch } from '../state/dispatch';
import { toast } from '../app/toast';
import reducer, { addUserMessage } from '../state/chat/reducer';
import chat from './chat';

const content = { type: 'DEFAULT' as const, text: 'Hello World', images: [] };

describe('Chat Messages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initializes an empty active thread', () => {
    const state = reducer(undefined, { type: '@@init' });
    expect(state.activeThread).toBe(0);
    expect(state.threads).toHaveLength(1);
    expect(state.threads[0].messages).toEqual([]);
  });

  it('adds a user message through the reducer', () => {
    const state = reducer(undefined, addUserMessage({ content, debug: {} }));
    expect(state.threads[0].messages[0].role).toBe('user');
    expect(state.threads[0].messages[0].content).toEqual(content);
  });

  it('dispatches a message for an authenticated user', async () => {
    vi.mocked(getState).mockReturnValue({ auth: { is_authenticated: true } } as ReturnType<typeof getState>);
    await chat.addUserMessage({ content });
    expect(dispatch).toHaveBeenCalledWith(addUserMessage({ content, debug: {} }));
    expect(toast).not.toHaveBeenCalled();
  });

  it('requests login instead of dispatching for an unauthenticated user', async () => {
    vi.mocked(getState).mockReturnValue({ auth: { is_authenticated: false } } as ReturnType<typeof getState>);
    await chat.addUserMessage({ content });
    expect(dispatch).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });
});
