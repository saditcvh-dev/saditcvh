import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';

@Component({
  selector: 'app-history-tab',
  standalone: false,
  templateUrl: './history-tab.component.html',
  styleUrls: ['./history-tab.component.css']
})
export class HistoryTabComponent {
  @Input() fullScreenMode: boolean = false;
  @Input() selectedNode!: AutorizacionTreeNode | null;
  @Input() documentVersions: any[] = [];

  @Output() openUploadModal = new EventEmitter<void>();
  @Output() downloadVersion = new EventEmitter<any>();
  @Output() restoreVersion = new EventEmitter<any>();

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  getFileNameFromPath(path?: string): string {
    if (!path) return 'Documento';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  onDownloadVersion(version: any): void {
    this.downloadVersion.emit(version);
  }

  onRestoreVersion(version: any): void {
    this.restoreVersion.emit(version);
  }

  onOpenUploadModal(): void {
    this.openUploadModal.emit();
  }
}