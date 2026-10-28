import { afterEach, expect, test, vi } from 'vitest';
import buildConfig from '../../vite.config';

afterEach(() => vi.unstubAllEnvs());

test('publishes application configuration without unrelated build environment values', () => {
  vi.stubEnv('SERVER_PATH', 'https://example.invalid/api');
  vi.stubEnv('GIT_COMMIT_ID', 'fixture');
  vi.stubEnv('PRIVATE_BUILD_TOKEN', 'private-fixture-value');
  const config = buildConfig({ mode: 'development' });
  const environment = config.define!['process.env'];
  expect(environment.SERVER_PATH).toBe('https://example.invalid/api');
  expect(environment.GIT_COMMIT_ID).toBe('fixture');
  expect(environment.NODE_ENV).toBe('development');
  expect(Object.hasOwn(environment, 'PRIVATE_BUILD_TOKEN')).toBe(false);
  expect(Object.hasOwn(environment, 'PATH')).toBe(false);
});
