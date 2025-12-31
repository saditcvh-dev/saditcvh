import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuditLog } from '../../../../core/models/audit.model';

@Component({
  selector: 'app-log-detail-modal',
  standalone: false,
  templateUrl: './log-detail-modal.html'
})
export class LogDetailModalComponent {
  @Input() log: AuditLog | null = null;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }

  isUpdatePerms(): boolean {
    return this.log?.action === 'UPDATE_PERMS' || this.log?.details?.type === 'BATCH_UPDATE';
  }

  isUserEvent(): boolean {
    const actions = ['CREATE', 'UPDATE', 'DELETE'];
    return actions.includes(this.log?.action || '') && this.log?.module === 'USER';
  }

  // NUEVA: Verifica si el valor de un cambio es un array (como los roles)
  isFieldValueArray(value: any): boolean {
    return Array.isArray(value);
  }

  getInitials(): string {
    if (!this.log?.user) return 'S';
    const u = this.log.user;
    if (u.first_name && u.last_name) {
      return (u.first_name[0] + u.last_name[0]).toUpperCase();
    }
    return (u.username?.substring(0, 2) || 'S').toUpperCase();
  }

  getChangesKeys(changes: any): string[] {
    if (!changes || Array.isArray(changes)) return [];
    // Filtrar 'type' si es que se coló en el objeto de cambios
    return Object.keys(changes).filter(key => key !== 'type');
  }

  getDataKeys(data: any): string[] {
    if (!data) return [];
    const blacklist = ['password', 'createdAt', 'updatedAt', 'deletedAt', 'created_by', 'updated_by', 'id', 'active'];
    return Object.keys(data).filter(key => !blacklist.includes(key));
  }
}