import { releaseExpiredReservations } from './orders.service.ts';

export function startReservationCleanup() {
  function clean() {
    void releaseExpiredReservations()
      .then((count) => {
        if (count > 0) console.log('Se liberaron reservas vencidas de ' + count + ' pedido(s).');
      })
      .catch((error: unknown) => {
        const detail = process.env.NODE_ENV === 'production'
          ? error instanceof Error ? error.name : 'UnknownError'
          : error;
        console.error('No se pudieron liberar las reservas vencidas.', detail);
      });
  }

  clean();
  const timer = setInterval(clean, 30_000);
  timer.unref();
}
