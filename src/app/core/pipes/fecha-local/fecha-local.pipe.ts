import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaLocal'
})
export class FechaLocalPipe implements PipeTransform {

  transform(fecha: string | null | undefined): string {
    if (!fecha) return '';
    const fechaSinUTC = fecha.replace('Z', '');

    return new Date(fechaSinUTC).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
