import { ApplicationConfig, APP_INITIALIZER ,provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';

function initializeApp(authService: AuthService) {
  return () => authService.checkStatus(); // Retorna una promesa
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      // withFetch(),
      withXsrfConfiguration({
        cookieName: 'x-csrf-token',
        headerName: 'x-csrf-token',
      }),
      withInterceptors([csrfInterceptor, authInterceptor, errorInterceptor]),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
      deps: [AuthService],
    }
  ]
};
