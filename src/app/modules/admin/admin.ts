import { Component, OnInit, inject } from '@angular/core';
import { UserService } from '../../core/services/user.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  private userService = inject(UserService);

  ngOnInit(): void {
    this.logUserPermissions();
  }

  private logUserPermissions(): void {
    console.log('%c--- Iniciando sesión administrativa ---', 'color: #691831; font-weight: bold; font-size: 12px;');

    this.userService.getMyTerritories().pipe(
      catchError(err => {
        console.error('Error al recuperar configuración territorial:', err);
        return of(null);
      })
    ).subscribe(response => {
      if (response && response.success) {
        const territories = response.data;
        
        console.log(`%cTerritorios asignados: ${territories.length}`, 'color: #BC955B; font-weight: bold;');
        
        // Formateamos la data para que el log sea legible en tabla
        const summary = territories.map(t => ({
          Municipio: `#${t.num} ${t.nombre}`,
          Permisos: t.permisos.join(' | ')
        }));

        if (summary.length > 0) {
          console.table(summary);
        } else {
          console.warn('El usuario no tiene territorios asignados en la matriz.');
        }
      }
    });
  }
}