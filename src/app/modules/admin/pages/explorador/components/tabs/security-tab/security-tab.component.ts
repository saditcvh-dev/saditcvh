import { Component, Input } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
// import { AutorizacionTreeNode } from '../../../../core/models/autorizacion-tree.model';

@Component({
  selector: 'app-security-tab',
  standalone: false,
  templateUrl: './security-tab.component.html',
  styleUrls: ['./security-tab.component.css']
})
export class SecurityTabComponent {
  @Input() fullScreenMode: boolean = false;

  @Input() selectedNode!: AutorizacionTreeNode | null;

  permissions = [
    { id: 'view', label: 'Ver', description: 'Permite ver el documento', granted: true },
    { id: 'edit', label: 'Editar', description: 'Permite editar el documento', granted: false },
    { id: 'download', label: 'Descargar', description: 'Permite descargar el documento', granted: true },
    { id: 'share', label: 'Compartir', description: 'Permite compartir el documento', granted: false },
    { id: 'delete', label: 'Eliminar', description: 'Permite eliminar el documento', granted: false }
  ];

  users = [
    { id: 1, name: 'Admin', email: 'admin@sistema.com', role: 'Administrador' },
    { id: 2, name: 'Usuario 1', email: 'user1@sistema.com', role: 'Editor' },
    { id: 3, name: 'Usuario 2', email: 'user2@sistema.com', role: 'Lector' }
  ];

  togglePermission(permissionId: string): void {
    const permission = this.permissions.find(p => p.id === permissionId);
    if (permission) {
      permission.granted = !permission.granted;
    }
  }

  removeUser(userId: number): void {
    this.users = this.users.filter(user => user.id !== userId);
  }

  addUser(): void {
    // Lógica para añadir usuario
    console.log('Añadir usuario');
  }
}