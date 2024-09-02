import 'whatwg-fetch';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '.env.development');
dotenv.config({ path: envPath });
