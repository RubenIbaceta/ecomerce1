import { releaseExpiredReservations } from './orders.service.ts';

export function startReservationCleanup() {
  function clean() {
    void releaseExpiredReservations()
      .then((count) => {
        if (count > 0) console.log('Se liberaron reservas vencidas de ' + count + ' pedido(s).');
      })
      .catch((error: unknown) => console.error('No se pudieron liberar las reservas vencidas.', error));
  }

  clean();
  const timer = setInterval(clean, 30_000);
  timer.unref();
}
