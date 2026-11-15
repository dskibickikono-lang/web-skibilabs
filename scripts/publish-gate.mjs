// Bramka publikacji: bez potwierdzenia danych firmy przez właściciela build do publikacji nie przejdzie.
// Uruchamiana przez `npm run gate` i jako pierwszy krok `npm run build:publish`.
import { company, publishBlockers } from '../src/config/company.ts';

const blockers = publishBlockers(company);
if (blockers.length > 0) {
  console.error('Publikacja zablokowana — src/config/company.ts wymaga uzupełnienia i potwierdzenia:');
  for (const b of blockers) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`Dane firmy potwierdzone przez: ${company.ownerConfirmation.confirmedBy} (${company.ownerConfirmation.confirmedAt}).`);
