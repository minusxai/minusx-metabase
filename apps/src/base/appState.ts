import { createStore } from "./appHook";
import { defaultInternalState, InternalState } from "./defaultState";
import { AppController } from "./appController";
import { Prediction } from "../../../web/src/helpers/LLM/types";

// Runs in web context
export abstract class AppState<T extends InternalState, K> {
  abstract initialInternalState: T;
  abstract actionController: AppController<K>;
  _stateCache: Record<string, K> = {};

  // 1. Handles setup
  async setup() {}

  // 2. Get diagnostics
  async getDiagnostics(): Promise<object> {
    return {}
  }

  // 3. Get / set internal state
  public useStore() {
      return createStore(this.initialInternalState)
  }

  public abstract getState(): Promise<K>;

  public getCachedState(id: string): K | undefined {
    return this._stateCache[id];
  }

  public setCachedState(id: string, state: K) {
    this._stateCache[id] = state;
  }

  // Get / set internal state
  public async getPlannerConfig() {
    return this.useStore().getState().llmConfigs.default;
  }

  public async getSuggestionsConfig() {
    return this.useStore().getState().llmConfigs.suggestions;
  }

  // Get query selectors
  public async getQuerySelectorMap() {
    return this.useStore().getState().querySelectorMap;
  }

  // Get prediction. default is undefined
  public getPrediction(appState: K): Prediction | undefined {
    return undefined;
  }
}

export abstract class DefaultAppState<T> extends AppState<InternalState, T> {
  initialInternalState = defaultInternalState;
}
