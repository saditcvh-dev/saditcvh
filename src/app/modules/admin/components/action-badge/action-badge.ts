import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-action-badge',
  standalone: false,
  template: `
    <span [ngClass]="getBadgeClass()" class="px-2.5 py-0.5 rounded-full text-xs font-bold border">
      {{ getLabel() }}
    </span>
  `
})
export class ActionBadgeComponent {
  @Input() action!: string;

  getLabel(): string {
    const labels: { [key: string]: string } = {
      'UPDATE_PERMS': 'Cambio Permisos',
      'DOWNLOAD': 'Descarga',
      'DELETE': 'Eliminación',
      'LOGIN': 'Acceso',
      'LOGOUT': 'Salida',
      'VIEW': 'Consulta',
      'CREATE': 'Registro',
      'UPDATE': 'Edición Datos'
    };
    return labels[this.action] || this.action;
  }

  getBadgeClass(): string {
    const styles: { [key: string]: string } = {
      'UPDATE_PERMS': 'bg-amber-100 text-amber-700 border-amber-200',
      'DOWNLOAD': 'bg-blue-100 text-blue-700 border-blue-200',
      'DELETE': 'bg-red-100 text-red-700 border-red-200',
      'LOGIN': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'LOGOUT': 'bg-slate-100 text-slate-700 border-slate-200',
      'VIEW': 'bg-slate-100 text-slate-700 border-slate-200',
      'CREATE': 'bg-teal-100 text-teal-700 border-teal-200',
      'UPDATE': 'bg-indigo-100 text-indigo-700 border-indigo-200'
    };
    return styles[this.action] || 'bg-gray-100 text-gray-700 border-gray-200';
  }
}