import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-dashboard-view',
  templateUrl: './dashboard.view.html',
  styleUrls: ['./dashboard.view.css']
})
export class DashboardView {

  constructor(private router: Router, private authService: AuthService) {}

  irABusquedaAvanzada(event: MouseEvent): void {
    const boton = event.currentTarget as HTMLElement;
    boton.classList.add('ring-2', 'ring-[#691831]');

    setTimeout(() => {
      boton.classList.remove('ring-2', 'ring-[#691831]');
      this.router.navigate(['/admin/explorador']);
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
  
  isAdmin(): boolean {
    return this.authService.hasRole('administrador');
  }
  isUserConsulta(): boolean {
    return this.authService.hasRole('consulta');
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
