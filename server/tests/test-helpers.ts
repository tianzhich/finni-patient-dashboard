import type { TestContext } from 'node:test';
import { createApp } from '@server/app';
import { openDatabase } from '@server/db/database';

export function createTestApp(context: TestContext, clientDirectory = '/nonexistent-client') {
  const db = openDatabase(':memory:');

  context.after(() => db.close());

  return { db, app: createApp(db, clientDirectory) };
}
