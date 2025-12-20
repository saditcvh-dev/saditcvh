import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtenemos el rol esperado desde la ruta (data: { role: 'administrador' })
  const expectedRole = route.data['role'] as string;

  if (authService.isAuthenticated() && authService.hasRole(expectedRole)) {
    return true;
  }

  // Redirigir si no tiene permisos
  router.navigate(['/admin']);
  return false;
};
