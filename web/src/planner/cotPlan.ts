import _ from 'lodash';
import { simplePlan } from './simplePlan';
import { CoTPlannerConfig } from 'apps/types';

export async function cotPlan(signal: AbortSignal, plannerConfig: CoTPlannerConfig) {
  {
    // Thinking stage
    await simplePlan(signal, {type: 'simple', ...plannerConfig.thinkingStage} )
  }
  signal.throwIfAborted();
  // Tool choice stage
  {
    await simplePlan(signal, {type: 'simple', ...plannerConfig.toolChoiceStage} )
  }
}