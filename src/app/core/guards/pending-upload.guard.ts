import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { CargaMasivaService } from '../services/digitalizacion-carga-masiva.service';

export const pendingUploadGuard: CanDeactivateFn<any> = (component, currentRoute, currentState, nextState) => {
  const service = inject(CargaMasivaService);
  if (service.isUploadingVal) {
    return confirm('Tienes subidas de archivos activas en segundo plano. Si cambias de ruta o de pestaña, el proceso de subida se cancelará de inmediato. ¿Estás seguro de que deseas salir?');
  }
  return true;
};
