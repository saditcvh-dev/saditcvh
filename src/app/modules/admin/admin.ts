import { Component, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { UserService } from '../../core/services/user.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Sidebar } from './components/sidebar/sidebar';

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  sidebarOpen = false;
  isMobileView = false;
  @ViewChild('sidebar') sidebarComponent!: Sidebar;
  private userService = inject(UserService);
  territoriesCount = signal(0);


  ngOnInit(): void {
    this.updateMobileView();  // ✅ Actualizar estado móvil al inicio
    this.logUserPermissions();
  }

  ngAfterViewInit(): void {
    // ✅ CORREGIDO: Sincronizar con el estado REAL del sidebar
    setTimeout(() => {
      if (this.sidebarComponent) {
        // Respetar el estado inicial del sidebar (inicia cerrado)
        // No forzar ningún estado, el sidebar ya emitió su estado inicial
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobileView;
    this.updateMobileView();

    // ✅ Si cambia de desktop a mobile, cerrar sidebar
    if (!wasMobile && this.isMobileView && this.sidebarOpen) {
      this.sidebarOpen = false;
      // Opcional: cerrar también el sidebar component
      if (this.sidebarComponent) {
        this.sidebarComponent.close();
      }
    }
  }

  private updateMobileView(): void {
    this.isMobileView = window.innerWidth < 768;
  }

  onSidebarToggled(isOpen: boolean): void {
    //  Recibe el estado real del sidebar
    this.sidebarOpen = isOpen;
  }

  onMobileMenuToggled(): void {
    if (this.sidebarComponent) {
      this.sidebarComponent.toggleSidebar();
    }
  }

  private logUserPermissions(): void {
    // console.log('%c--- Iniciando sesión administrativa ---', 'color: #691831; font-weight: bold; font-size: 12px;');

    this.userService.getMyTerritories().pipe(
      catchError(err => {
        console.error('Error al recuperar configuración territorial:', err);
        return of(null);
      })
    ).subscribe(response => {
      if (response && response.success) {
        const territories = response.data;

        // console.log(`%cTerritorios asignados: ${territories.length}`, 'color: #BC955B; font-weight: bold;');

        // Formateamos la data para que el log sea legible en tabla
        const summary = territories.map(t => ({
          Municipio: `#${t.num} ${t.nombre}`,
          Permisos: t.permisos.join(' | ')
        }));

        if (summary.length > 0) {
          // console.table(summary);
          this.territoriesCount.set(response.data.length);
        } else {
          console.warn('El usuario no tiene territorios asignados en la matriz.');
        }
      }
    });
  }
}