import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaLocal'
})
export class FechaLocalPipe implements PipeTransform {

  transform(fecha: string | null | undefined): string {
  if (!fecha) return '';

  return new Date(fecha).toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

}
