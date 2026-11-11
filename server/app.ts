import express from 'express';
import type Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createPatientRouter } from '@server/modules/patients/patient.routes';
import { ApiFailure, sendApiError, errorHandler } from '@server/http/api-response';
import { patientRepository } from '@server/modules/patients/patient.repository';

export function createApp(db: Database.Database, clientDirectory = resolve('dist/client')) {
  const app = express();
  const patients = patientRepository(db);

  app.disable('x-powered-by');

  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(express.json({ limit: '32kb' }));

  app.use('/api/patients', createPatientRouter(patients));

  app.use('/api', (_req, res) => {
    sendApiError(new ApiFailure('NOT_FOUND'), res);
  });

  if (existsSync(resolve(clientDirectory, 'index.html'))) {
    app.use(
      express.static(clientDirectory, {
        index: false,
        setHeaders: (res, file) => {
          res.setHeader(
            'Cache-Control',
            file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
          );
        },
      }),
    );

    app.get('/{*path}', (req, res, next) => {
      if (extname(req.path) || !req.accepts('html')) {
        next();

        return;
      }

      res.set('Cache-Control', 'no-cache').sendFile(resolve(clientDirectory, 'index.html'));
    });
  }

  app.use((_req, res) => {
    res.status(404).send('Not found');
  });

  app.use(errorHandler);

  return app;
}
