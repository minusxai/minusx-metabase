import { checkRespondToUser } from "../../checks/checkRespondToUser";
import { runAllCells } from "../../mods/runAllCells";
import { TestRunner, loadStateFromFile } from "../../utils/testRunner";
import { TestConfig } from '../../fixtures/jupyter';

const testConfig: TestConfig = {
  description: "Summarise a notebook",
  file: "sin_wave.ipynb",
  initialMinusxState: loadStateFromFile('authState.json'),
  init: [runAllCells],
  instruction: "Summarise this notebook",
  checks: [checkRespondToUser]
}

TestRunner(testConfig)
