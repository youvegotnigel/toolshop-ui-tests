import { test, expect } from '../../src/fixtures';
import { StatusSchema } from '../../src/api/schemas/auth.schema';
import { logger } from '../../src/utils/logger';

// Setup project: proves the site and API answer, and records the Toolshop build under test.
// eslint-disable-next-line no-restricted-syntax -- the setup project checks the API directly by design
test('record which Toolshop build is under test', async ({ api }) => {
  await test.step('Read the API status and version', async () => {
    const res = await api.get('/status');
    await expect(res).toBeOK();
    const status = StatusSchema.parse(await res.json());
    test.info().annotations.push({ type: 'toolshop-version', description: status.version });
    logger.info(`Toolshop ${status.version} (${status.environment}), run tag qa-${process.env.RUN_ID ?? ''}`);
  });
});
