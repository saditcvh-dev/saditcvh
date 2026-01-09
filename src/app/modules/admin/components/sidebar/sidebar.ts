import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
})
export class Sidebar {
  // Inyectar el servicio de autenticación
  private authService = inject(AuthService);

  /**
   * Maneja la lógica de cierre de sesión.
   * Llama al método logout del AuthService.
   */
  onLogout(): void {
    // El servicio maneja la petición al backend, limpia el estado local
    // y redirige al usuario a la página de login.
    this.authService.logout().subscribe({
      next: (success) => {
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
}