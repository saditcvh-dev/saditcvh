import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-dashboard-view',
  templateUrl: './dashboard.view.html',
})
export class DashboardView {

  constructor(private router: Router) {}

  irABusquedaAvanzada(event: MouseEvent): void {
    const boton = event.currentTarget as HTMLElement;
    boton.classList.add('ring-2', 'ring-[#691831]');

    setTimeout(() => {
      boton.classList.remove('ring-2', 'ring-[#691831]');
      this.router.navigate(['/admin/expedientes']);
    }, 300);
  }

  abrirModalSubida(event: MouseEvent): void {
    const boton = event.currentTarget as HTMLElement;
    boton.classList.add('ring-2', 'ring-[#691831]');

    setTimeout(() => {
      boton.classList.remove('ring-2', 'ring-[#691831]');
      this.router.navigate(['/admin/digitalizacion']);
    }, 300);
  }

  generarReporte(event: MouseEvent): void {
    const boton = event.currentTarget as HTMLElement;
    boton.classList.add('ring-2', 'ring-[#691831]');

    setTimeout(() => {
      boton.classList.remove('ring-2', 'ring-[#691831]');
      this.router.navigate(['/admin/reportes']);
    }, 300);
  }
}
