import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path'

const execPromise = promisify(exec);

const setup = async () => {
  try {
    // run docker-compose in node
    const pathToRootFolder = path.join(__dirname, '../../..');
    if (process.env.REUSE_DOCKER !== 'true') {
      await execPromise(`cd ${pathToRootFolder}/simulator && docker-compose up -d --build`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    if (process.env.PROD !== 'true') {
      return
    }
    const command = `cd ${pathToRootFolder} && yarn extension-build`
    console.log('Running', command)
    const { stdout, stderr } = await execPromise(command);
    console.log('Stdout:', stdout);
    console.error('Stderr:', stderr);
  } catch (error) {
    console.error('Error setting up:', error.message);
    throw error
  }
}

export default setup