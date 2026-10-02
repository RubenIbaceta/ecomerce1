import dotenv from 'dotenv';
import { createApp } from './app.ts';
import { startReservationCleanup } from './modules/orders/reservation-worker.ts';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const port = Number(process.env.PORT ?? 3001);
const app = createApp();
startReservationCleanup();

app.listen(port, '0.0.0.0', () => {
  console.log(`API disponible en http://localhost:${port}`);
});
