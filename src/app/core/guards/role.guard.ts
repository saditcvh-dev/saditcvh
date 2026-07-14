import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtenemos el rol esperado desde la ruta
  const expectedRole = route.data['role'] as string;
  const deniedRole = route.data['deniedRole'] as string;

  if (authService.isAuthenticated()) {
    let hasAccess = true;
    
    if (expectedRole && !authService.hasRole(expectedRole)) {
      hasAccess = false;
    }
    
    if (deniedRole && authService.hasRole(deniedRole)) {
      hasAccess = false;
    }

    if (hasAccess) {
      return true;
    }
  }

  // Redirigir si no tiene permisos
  router.navigate(['/admin']);
  return false;
};
