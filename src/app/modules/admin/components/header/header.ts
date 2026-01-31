import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
})
export class Header implements OnInit {


  themeSubmenuOpen = false;
  currentTheme: 'light' | 'dark' | 'system' = 'system';


  @Input() sidebarOpen!: boolean;
  @Input() isMobileView!: boolean;

  @Output() mobileMenuToggled = new EventEmitter<void>();

  isMobile = false;
  profileOpen = false;
  mobileSearchOpen = false;

  constructor(private authService: AuthService) {
    this.checkViewport();
  }



  private checkViewport(): void {
    this.isMobile = window.innerWidth < 768;
    // Cerrar búsqueda móvil si se cambia a desktop
    if (!this.isMobile && this.mobileSearchOpen) {
      this.mobileSearchOpen = false;
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuToggled.emit();
    this.closeMobileSearch(); // Cerrar búsqueda si está abierta
  }

  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }

  openMobileSearch(): void {
    this.mobileSearchOpen = true;
    this.profileOpen = false; // Cerrar perfil si está abierto
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen = false;
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Lógica de búsqueda
    console.log('Buscando:', input.value);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      if (this.isMobile) {
        this.openMobileSearch();
      } else {
        const input = document.getElementById('globalSearch') as HTMLInputElement;
        input?.focus();
      }
    }

    if (event.key === 'Escape' && this.mobileSearchOpen) {
      this.closeMobileSearch();
    }

    if (event.key === 'Escape' && this.profileOpen) {
      this.profileOpen = false;
    }
  }

  // Manejar clic fuera del dropdown
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative') && this.profileOpen) {
      this.profileOpen = false;
    }
  }
  // Variables para notificaciones
  notificationsOpen = false;
  totalNotifications = 5;
  unreadNotifications = 3;


  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
    // Cerrar perfil si está abierto
    if (this.profileOpen) {
      this.profileOpen = false;
    }
  }


  handleNotificationClick(notification: any) {
    // Marcar como leída
    if (!notification.read) {
      notification.read = true;
      this.unreadNotifications--;
    }

    // Cerrar dropdown
    this.notificationsOpen = false;

    // Navegar si tiene acción
    if (notification.action) {
      // this.router.navigateByUrl(notification.action);
      console.log('Navegando a:', notification.action);
    }
  }

  viewAllNotifications() {
    this.notificationsOpen = false;
    // Navegar a página de notificaciones
    // this.router.navigate(['/admin/notificaciones']);
    console.log('Viendo todas las notificaciones');
  }

  // Método para cerrar dropdowns al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    // Cerrar notificaciones si se hace clic fuera
    if (!target.closest('.relative')) {
      this.notificationsOpen = false;
      this.profileOpen = false;
    }
  }

  // Detectar tamaño de pantalla
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.isMobile = window.innerWidth < 768;

    // En móvil, cerrar dropdowns al cambiar tamaño
    if (this.isMobile) {
      this.notificationsOpen = false;
      this.profileOpen = false;
    }
  }
  ngOnInit() {
    this.loadThemePreference();

    this.isMobile = window.innerWidth < 768;
  }

  toggleThemeSubmenu() {
    this.themeSubmenuOpen = !this.themeSubmenuOpen;
  }


  /**
    * Verifica si el usuario actual tiene rol de administrador
    */
  isAdmin(): boolean {
    return this.authService.hasRole('administrador');
  }
  get role_user(): string {
    //  operador ternario de ver si es admin o operador isAdmin
    return this.isAdmin() ? 'Administrador' : 'Operador';
  }

  onNavLinkClick(): void {
    if (this.themeSubmenuOpen) {
      this.closeMenu();
    }
  }

  closeMenu(): void {
    // logica para cerrar el menu
    this.themeSubmenuOpen = false;
  }

  setTheme(theme: 'light' | 'dark' | 'system') {
    this.currentTheme = theme;
    // this.themeSubmenuOpen = false;

    switch (theme) {
      case 'light':
        document.documentElement.classList.remove('dark');
        break;
      case 'dark':
        document.documentElement.classList.add('dark');
        break;
      case 'system':
        // Detectar preferencia del sistema
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        break;
    }

    // Guardar preferencia
    localStorage.setItem('theme', theme);
  }

  private loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      this.currentTheme = savedTheme;
      this.setTheme(savedTheme);
    } else {
      // Tema por defecto: sistema
      this.currentTheme = 'system';
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }

  goToProfile() {
    // Navegar al perfil
    console.log('Ir al perfil');
  }

  logout() {
    // Lógica de cierre de sesión
    console.log('Cerrar sesión');
  }


}
