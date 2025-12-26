import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { CsrfService } from '../services/csrf.service';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
    const csrfService = inject(CsrfService);

    // Solo interceptamos métodos que necesitan CSRF
    // csrf.interceptor.ts
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ) {
        return csrfService.getCsrfToken().pipe(
            switchMap(csrfToken => next(req.clone({
                setHeaders: { 'x-csrf-token': csrfToken },
                withCredentials: true
            })))
        );
    }
    return next(req);

};
