import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { createTestApp } from '@server/tests/test-helpers';

test('production static hosting keeps API errors and missing assets separate from SPA routes', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'finni-static-'));

  try {
    writeFileSync(join(directory, 'index.html'), '<html>Patient workspace</html>');
    mkdirSync(join(directory, 'assets'));
    writeFileSync(join(directory, 'assets/app-123.js'), 'console.log("test")');

    const { app } = createTestApp(context, directory);

    await request(app).get('/').expect(200).expect('Content-Type', /html/);
    await request(app).get('/patients').expect(200).expect('Cache-Control', 'no-cache');

    await request(app)
      .get('/assets/app-123.js')
      .expect(200)
      .expect('Cache-Control', /immutable/);

    await request(app).get('/assets/missing.js').expect(404);
    await request(app).get('/api/missing').expect(404).expect('Content-Type', /json/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
