import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';



@Injectable({
    providedIn: 'root'
})
export class CsrfService {
    private csrfTokenUrl = `${environment.apiUrl}/csrf-token`;
    public csrfToken: string = '';

    constructor(private http: HttpClient) { }

    // Obtener el token CSRF
    getCsrfToken(): Observable<string> {
        return this.http.get<{ csrfToken: string }>(this.csrfTokenUrl, { withCredentials: true })
            .pipe(
                tap(response => {
                    this.csrfToken = response.csrfToken;
                }),
                map(response => response.csrfToken)
            );
    }

    // Método para hacer una solicitud POST protegida por CSRF
    postWithCsrf(url: string, body: any, csrfToken: string): Observable<any> {
        const headers = new HttpHeaders().set('x-csrf-token', csrfToken); // Incluir el token CSRF en el encabezado
        return this.http.post(url, body, { headers });
    }
}
