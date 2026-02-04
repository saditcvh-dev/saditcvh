import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private _currentUser = signal<User | null>(null);
  public currentUser = this._currentUser.asReadonly();
  public isAuthenticated = computed(() => !!this._currentUser());

  constructor() { }

  // obtener el token CSRF inicial (si lo usas desde backend)
  getCsrfToken(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/csrf-token`, { withCredentials: true });
  }

  // ahora esperamos username en lugar de email
  login(credentials: { username: string; password: string }): Observable<User> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials, { withCredentials: true })
      .pipe(
        map(res => res.user), // extraer solo el user del body
        tap((user) => this._currentUser.set(user)),
        catchError(err => throwError(() => err))
      );
  }

  logout(): Observable<boolean> {
    return this.http.post(`${this.API_URL}/logout`, {}, { withCredentials: true }).pipe(
      map(() => true),
      catchError(() => of(true)),
      tap(() => {
        this._currentUser.set(null);
        this.router.navigate(['/auth/login']);
      })
    );
  }

  refreshToken(): Observable<User> {
    return this.http.post<AuthResponse>(`${this.API_URL}/refresh-token`, {}, { withCredentials: true })
      .pipe(
        map(res => res.user),
        tap((user) => this._currentUser.set(user)),
        catchError(err => {
          this._currentUser.set(null);
          return throwError(() => err);
        })
      );
  }

  checkStatus(): Promise<boolean> {
    return this.http.post<{ authenticated: boolean; user?: User }>(
      `${this.API_URL}/check-status`,
      { withCredentials: true }
    ).toPromise().then(response => {
      if (response?.authenticated && response.user) {
        this._currentUser.set(response.user);
        return true;
      } else {
        this._currentUser.set(null);
        return false;
      }
    }).catch(() => {
      this._currentUser.set(null);
      return false;
    });
  }

  hasRole(expectedRole: string): boolean {
    const user = this._currentUser();
    if (!user || !user.roles) return false;
    return user.roles.includes(expectedRole);
  }


  
  // ID del usuario
  get userId(): string | null {
    const id = this._currentUser()?.id;
    return id !== undefined && id !== null ? String(id) : null;
  }

  // Username
  get username(): string | null {
    return this._currentUser()?.username ?? null;
  }

  // Email (si existe)
  get email(): string | null {
    return this._currentUser()?.email ?? null;
  }

  // Roles
  get roles(): string[] {
    return this._currentUser()?.roles ?? [];
  }

}
