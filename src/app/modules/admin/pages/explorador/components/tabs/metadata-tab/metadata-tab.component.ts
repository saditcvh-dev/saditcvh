import { Component, Input } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
// import { AutorizacionTreeNode } from '../../../../core/models/autorizacion-tree.model';

@Component({
  selector: 'app-metadata-tab',
  standalone: false,
  templateUrl: './metadata-tab.component.html',
  styleUrls: ['./metadata-tab.component.css']
})
export class MetadataTabComponent {
  @Input() selectedNode!: AutorizacionTreeNode | null;

  get metadata(): any[] {
    if (!this.selectedNode) return [];
    const baseMetadata = [
      { label: 'Nombre', value: this.selectedNode.nombre || 'Sin nombre', icon: 'tag' },
      { label: 'ID', value: this.selectedNode.id || 'Sin ID', icon: 'hash' },
      { label: 'Tipo', value: this.getTypeLabel(this.selectedNode.type), icon: 'type' },
      {
        label: 'Fecha de creación',
        value: this.formatDate(this.selectedNode.data?.fechaCreacion),
        icon: 'calendar'
      }
    ];

    if (this.selectedNode.type === 'autorizacion') {
      return [
        ...baseMetadata,
        { label: 'Solicitante', value: this.selectedNode.data?.solicitante, icon: 'user' },
        { label: 'Modalidad', value: this.selectedNode.data?.modalidad?.nombre, icon: 'folder' },
        { label: 'Municipio', value: this.selectedNode.data?.municipio?.nombre, icon: 'map' },
        {
          label: 'Estado',
          value: this.selectedNode.data?.activo ? 'ACTIVO' : 'INACTIVO',
          icon: 'circle'
        }
      ];
    }

    return baseMetadata;
  }


  private getTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'municipio': 'Municipio',
      'tipo': 'Tipo de Autorización',
      'autorizacion': 'Autorización'
    };
    return typeMap[type] || type;
  }

   formatDate(dateString?: string): string {
    if (!dateString) return 'No disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  getIcon(iconName: string): string {
    const icons: { [key: string]: string } = {
      'tag': 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      'hash': 'M7 20l4-16h2l4 16h2l2-8h-4l2-8h-2L9 12H5l2 8h2z',
      'type': 'M4 7V4h16v3M9 20h6M12 4v16',
      'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      'user': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      'circle': 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z',
      'map': 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
    };

    return icons[iconName] || '';
  }
}