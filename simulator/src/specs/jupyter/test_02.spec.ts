import { checkAppState } from "../../checks/checkAppState";
import { runAllCells } from "../../mods/runAllCells";
import { TestRunner, loadStateFromFile } from "../../utils/testRunner";
import { TestConfig } from '../../fixtures/jupyter';

const testConfig: TestConfig = {
  description: "line to bar",
  file: "cos_wave.ipynb",
  initialMinusxState: loadStateFromFile('authState.json'),
  init: [runAllCells],
  instruction: "convert line plot to bar plot",
  checks: [checkAppState({strInFinalAppState: 'px.bar', strNotInFinalAppState: 'px.line'})]
}

TestRunner(testConfig)
