import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';
import { ViewerTab } from '../../../../../../../core/helpers/tabs-permissions.helper';

@Component({
  selector: 'app-tabs-navigation',
  standalone: false,
  templateUrl: './tabs-navigation.component.html',
  styleUrls: ['./tabs-navigation.component.css']
})
export class TabsNavigationComponent {
  // input para showControlPanel


  @Input() showMainHeader: boolean = true;

  @Output() showMainHeaderChange = new EventEmitter<boolean>();

  @Input() showControlPanel: boolean = false;

  @Input() selectedNode!: AutorizacionTreeNode | null;
  @Input() activeTab!: ViewerTab;
  @Input() allowedTabs: ViewerTab[] = [];
  @Output() tabChange = new EventEmitter<ViewerTab>();

  tabs = [
    { id: 'preview', label: 'Vista Previa', icon: 'eye', showFor: ['autorizacion'] },
    { id: 'metadata', label: 'Metadatos', icon: 'info', showFor: ['autorizacion'] },
    { id: 'security', label: 'Seguridad', icon: 'shield', showFor: ['autorizacion'] },
    { id: 'notes', label: 'Notas', icon: 'chat', showFor: ['autorizacion'] },
    { id: 'history', label: 'Historial', icon: 'clock', showFor: ['autorizacion'] }
  ];
  shouldShowTab(tabId: ViewerTab): boolean {
    if (!this.selectedNode) return false;
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return false;
    if (!tab.showFor.includes(this.selectedNode.type)) return false;
    return this.allowedTabs.includes(tabId);
  }

  onTabClick(tabId: ViewerTab): void {
    if (this.shouldShowTab(tabId)) {
      this.tabChange.emit(tabId);
    }
  }
  // Método para alternar visibilidad del panel de control

  toggleMainHeader(): void {
    this.showMainHeader = !this.showMainHeader;
    this.showMainHeaderChange.emit(this.showMainHeader);
    console.log('showMainHeader aqui :', this.showMainHeader);
  }


  getTabIcon(tabId: string): string {
    switch (tabId) {
      case 'preview':
        return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>`;

      case 'security':
        return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>`;

      case 'notes':
        return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>`;

      case 'history':
        return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;

      default:
        return '';
    }
  }
  toggleControlPanel(): void {
    this.showControlPanel = !this.showControlPanel;
  }
}