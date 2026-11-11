import { openDatabase } from '@server/db/database';
import { patientRepository } from '@server/modules/patients/patient.repository';
import { patientInputSchema, type PatientStatus } from '@shared/patient-schema';

const db = openDatabase();

try {
  const repo = patientRepository(db);

  if ((db.prepare('SELECT count(*) AS count FROM patients').get() as { count: number }).count) {
    console.log('Database already contains patients. Seed skipped; no records changed.');
  } else {
    const examples: [
      string,
      string | null,
      string,
      string,
      PatientStatus,
      string,
      string,
      string,
      string,
    ][] = [
      [
        'Avery',
        'Rose',
        'Bennett',
        '2018-04-12',
        'Active',
        '120 Example Lane',
        'Austin',
        'TX',
        '78701',
      ],
      [
        'Noah',
        'James',
        'Chen',
        '2020-08-03',
        'Onboarding',
        '24 Sample Court',
        'Boston',
        'MA',
        '02108',
      ],
      [
        'Maya',
        null,
        'Davis',
        '2017-11-21',
        'Active',
        '360 Fictional Avenue',
        'Portland',
        'OR',
        '97201',
      ],
      [
        'Liam',
        'Oliver',
        'Garcia',
        '2021-02-14',
        'Inquiry',
        '85 Demo Street',
        'San Diego',
        'CA',
        '92101',
      ],
      [
        'Sofia',
        'Elena',
        'Martínez',
        '2019-06-09',
        'Onboarding',
        '16 Placeholder Way',
        'Denver',
        'CO',
        '80202',
      ],
      [
        'Ethan',
        null,
        'O’Neill',
        '2016-09-26',
        'Churned',
        '42 Example Circle',
        'Richmond',
        'VA',
        '23219',
      ],
      [
        'Amelia',
        'Grace',
        'Patel',
        '2020-12-05',
        'Active',
        '17 Sample Terrace',
        'Raleigh',
        'NC',
        '27601',
      ],
      [
        'Oliver',
        'Kai',
        'Wilson',
        '2022-01-17',
        'Inquiry',
        '75 Fictional Road',
        'Columbus',
        'OH',
        '43215',
      ],
    ];

    db.transaction(() => {
      for (const [
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        status,
        line1,
        city,
        state,
        postalCode,
      ] of examples) {
        repo.create(
          patientInputSchema.parse({
            firstName,
            middleName,
            lastName,
            dateOfBirth,
            status,
            address: { line1, line2: '', city, state, postalCode },
          }),
        );
      }
    })();

    console.log('Added 8 fictional patient records.');
  }
} finally {
  db.close();
}
