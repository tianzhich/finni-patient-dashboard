import { createApp } from '@server/app';
import { openDatabase } from '@server/db/database';

const db = openDatabase();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

const server = createApp(db).listen(port, host, () =>
  console.log(`API / application: http://${host}:${port}`),
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
