import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, fromEvent, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { MunicipioService } from '../../../../core/services/explorador-municipio.service';
import { AutorizacionTreeService } from '../../../../core/services/explorador-autorizacion-tree.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface sidebarInfo {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  progress: number;
  show: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
})
export class Sidebar {
  sidebarOpen = true;
  isMobile = false;
  private resizeSubscription!: Subscription;
  private treeService = inject(AutorizacionTreeService);
  @Input() territoriesCount = 0;

  // private readonly apiUrl = `${environment.apiUrl}/municipios`;
  // private readonly apiUrlUsuarios = `${environment.apiUrl}/users/my-territories`;

  dashboardInfo: any;
  @Output() sidebarToggled = new EventEmitter<boolean>();


  constructor(private router: Router, private authService: AuthService, private http: HttpClient, private municipioService: MunicipioService) {
    this.checkViewport();
  }

  sidebarInfo: sidebarInfo = {
    label: 'Cargando...',
    value: '',
    status: 'good',
    progress: 0,
    show: false
  };
  ngOnInit(): void {
    this.initializeSidebarState();

    // Inicializar información del dashboard
    // de environment.apiUrl}/dashboard/status`;
    this.http.get(`${environment.apiUrl}/dashboard/status`)
      .subscribe((data: any) => {
        this.sidebarInfo = {
          label: data.label,
          value: data.value,
          status: data.status,
          progress: data.progress,
          show: data.show
        };
      });

    // Suscribirse a eventos de resize con debounce para mejor performance
    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(100))
      .subscribe(() => {
        this.onResize();
      });
  }

  ngOnDestroy(): void {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobile;
    this.checkViewport();

    // Si cambia de desktop a mobile, cerrar sidebar automáticamente
    if (!wasMobile && this.isMobile && this.sidebarOpen) {
      this.closeSidebar();
    }
    // Si cambia de mobile a desktop, abrir sidebar automáticamente
    else if (wasMobile && !this.isMobile && !this.sidebarOpen) {
      this.openSidebar();
    }
  }

  private checkViewport(): void {
    // Tailwind's md breakpoint = 768px
    this.isMobile = window.innerWidth < 768;
  }

  private initializeSidebarState(): void {
    // Al inicio, sidebar abierto en desktop, cerrado en mobile
    if (this.isMobile) {
      this.sidebarOpen = false;
    } else {
      this.sidebarOpen = true;
    }
    this.sidebarToggled.emit(this.sidebarOpen);
  }



  // openSidebar(): void {
  //   this.sidebarOpen = true;
  //   this.sidebarToggled.emit(true);

  //   // Bloquear scroll en body cuando sidebar está abierto en móvil
  //   if (this.isMobile) {
  //     document.body.style.overflow = 'hidden';
  //   }
  // }

  // closeSidebar(): void {
  //   this.sidebarOpen = false;
  //   this.sidebarToggled.emit(false);

  //   // Restaurar scroll en body
  //   if (this.isMobile) {
  //     document.body.style.overflow = '';
  //   }
  // }

  // Método público para abrir sidebar desde header
  public open(): void {
    this.openSidebar();
  }

  // Método público para cerrar sidebar desde header
  public close(): void {
    this.closeSidebar();
  }

  // Método público para verificar si está abierto
  public isOpen(): boolean {
    return this.sidebarOpen;
  }

  // Método público para obtener estado mobile
  public getIsMobile(): boolean {
    return this.isMobile;
  }
  // toggleSidebar() {
  //   this.sidebarOpen = !this.sidebarOpen;
  //   this.sidebarToggled.emit(this.sidebarOpen);
  //   console.log("Sidebar open state:", this.sidebarOpen);
  // }
  // toggleSidebar(): void {
  //   if (this.sidebarOpen) {
  //     this.closeSidebar();
  //   } else {
  //     this.openSidebar();
  //   }
  // }
  // Nuevas variables para las funcionalidades
  showNotificationsDropdown = false;
  showQuickValidateMenu = false;
  maintenanceMode: boolean = false;


  // Datos de ejemplo - en producción vendrían de un servicio
  pendingValidationCount = 12;
  totalNotifications = 3;
  lastBackupTime = '2024-01-15 03:00';
  lastBackupStatus: 'success' | 'failed' = 'success';
  diskUsage = 75; // porcentaje



  // Métodos
  toggleNotifications() {
    this.showNotificationsDropdown = !this.showNotificationsDropdown;
    // Cerrar otros menús si están abiertos
    if (this.showQuickValidateMenu) {
      this.showQuickValidateMenu = false;
    }
  }

  quickValidate(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showQuickValidateMenu = !this.showQuickValidateMenu;
    // Cerrar notificaciones si están abiertas
    if (this.showNotificationsDropdown) {
      this.showNotificationsDropdown = false;
    }
  }

  validateRandom() {
    // Lógica para validar 5 expedientes aleatorios
    console.log('Validando 5 expedientes aleatorios...');
    this.showQuickValidateMenu = false;

    // Aquí iría la llamada al servicio
    // this.expedienteService.validateRandom(5).subscribe(...)
  }

  goToValidationQueue() {
    // Navegar a la vista de validación
    this.router.navigate(['/admin/expedientes'], { queryParams: { filter: 'pending' } });
    this.showQuickValidateMenu = false;
  }

  toggleMaintenanceMode() {
    if (this.maintenanceMode) {
      // Activar modo mantenimiento
      console.log('Activando modo mantenimiento...');
      // this.systemService.enableMaintenanceMode().subscribe(...)

      // Mostrar banner global
      this.showMaintenanceBanner();
    } else {
      // Desactivar modo mantenimiento
      console.log('Desactivando modo mantenimiento...');
      // this.systemService.disableMaintenanceMode().subscribe(...)
    }
  }

  showMaintenanceBanner() {
    // Implementar lógica para mostrar banner global
    // Podría ser un servicio de notificaciones o un componente global
  }

  // Método para cerrar dropdowns al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    // Cerrar notificaciones si se hace clic fuera
    if (!target.closest('.relative.ml-auto')) {
      this.showNotificationsDropdown = false;
    }

    // Cerrar menú de validación rápida si se hace clic fuera
    if (!target.closest('.group')) {
      this.showQuickValidateMenu = false;
    }
  }




  /**
   * Maneja la lógica de cierre de sesión.
   * Llama al método logout del AuthService.
   */
  onLogout(): void {
    // El servicio maneja la petición al backend, limpia el estado local
    // y redirige al usuario a la página de login.
    this.authService.logout().subscribe({
      next: (success) => {
        // this.municipioService.reset();
        // this.treeService.reset();
        this.treeService.reset();
        // Opcional: Puedes añadir un console.log o un toast de éxito
        console.log('Sesión cerrada exitosamente');
      },
      error: (err) => {
        // Opcional: Manejo de errores (aunque el logout del servicio
        // ya está configurado para retornar 'true' incluso en error de backend)
        console.error('Error al cerrar sesión', err);
      }
    });
  }

  /**
   * Verifica si el usuario actual tiene rol de administrador
   */
  isAdmin(): boolean {
    return this.authService.hasRole('administrador');
  }

  // Método para manejar clics en enlaces (cierra sidebar en móvil)
  onNavLinkClick(): void {
    if (this.isMobile && this.sidebarOpen) {
      this.closeSidebar();
    }
  }

  // Método para manejar la tecla Escape
  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event): void {
    if (this.isMobile && this.sidebarOpen) {
      this.closeSidebar();
    }
  }

  // Corrige el método toggleSidebar para mejor manejo en móvil
  toggleSidebar(): void {
    if (this.isMobile) {
      if (this.sidebarOpen) {
        this.closeSidebar();
      } else {
        this.openSidebar();
      }
    } else {
      // En desktop, simplemente alternar
      this.sidebarOpen = !this.sidebarOpen;
      this.sidebarToggled.emit(this.sidebarOpen);
    }
  }

  // Asegúrate de que estos métodos existen en tu componente:
  private openSidebar(): void {
    this.sidebarOpen = true;
    this.sidebarToggled.emit(true);

    // Bloquear scroll en body cuando sidebar está abierto en móvil
    if (this.isMobile) {
      document.body.style.overflow = 'hidden';
    }
  }

  private closeSidebar(): void {
    this.sidebarOpen = false;
    this.sidebarToggled.emit(false);

    // Restaurar scroll en body
    if (this.isMobile) {
      document.body.style.overflow = '';
    }
  }
}
