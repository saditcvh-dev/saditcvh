import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // 401 Unauthorized
      if (error.status === 401) {
        if (req.url.includes('/login') || req.url.includes('/refresh-token')) {
          return throwError(() => error);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((user) => {
              isRefreshing = false;
              refreshTokenSubject.next(user);
              return next(req); // Reintentar petición original
            }),
            catchError((err) => {
              isRefreshing = false;
              authService.logout(); // Si falla el refresh, logout forzoso
              return throwError(() => err);
            })
          );
        } else {
          // Esperar a que el refresh termine
          return refreshTokenSubject.pipe(
            filter(user => user != null),
            take(1),
            switchMap(() => next(req))
          );
        }
      }

      return throwError(() => error);
    })
  );
};
