import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path'

const execPromise = promisify(exec);

const teardown = async () => {
  try {
    // run docker-compose in node
    const pathToRootFolder = path.join(__dirname, '../../..');
    if (process.env.REUSE_DOCKER !== 'true') {
      const { stdout, stderr } = await execPromise(`cd ${pathToRootFolder}/simulator && docker-compose down`);
      console.log('Stdout:', stdout);
      console.error('Stderr:', stderr);
    }
  } catch (error) {
    console.error('Error in teardown:', error.message);
    throw error
  }
}

export default teardown