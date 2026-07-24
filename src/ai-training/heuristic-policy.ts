import {
  actionFeatures,
  createHeuristicPolicy as createRuntimeHeuristicPolicy,
  defaultHeuristicWeights,
  scoreAction,
  trainedHeuristicWeights,
  type ActionFeatureVector,
  type HeuristicWeights,
} from '../game/heuristic-policy.ts';
import { baselinePolicy, type Policy } from './policies.ts';

export {
  actionFeatures,
  defaultHeuristicWeights,
  scoreAction,
  trainedHeuristicWeights,
  type ActionFeatureVector,
  type HeuristicWeights,
};

export { createV2Policy } from './heuristic-policy-advanced.ts';

export function createHeuristicPolicy(weights: HeuristicWeights): Policy {
  return createRuntimeHeuristicPolicy(weights, baselinePolicy);
}
