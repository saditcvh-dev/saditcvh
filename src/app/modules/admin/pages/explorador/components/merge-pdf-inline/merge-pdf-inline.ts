import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

type MergePosition = 'start' | 'end';

@Component({
  selector: 'app-merge-pdf-inline',
    standalone: false,
  templateUrl: './merge-pdf-inline.html',
  styleUrl: './merge-pdf-inline.css',
})
export class MergePdfInline {

  @Input() documentVersions: any[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() merge = new EventEmitter<{
    version: any;
    file: File;
    position: MergePosition;
  }>();
  getFileNameFromPath(path?: string): string {
    if (!path) return 'Documento';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  // Estado
  selectedVersion = signal<any | null>(null);
  selectedFile = signal<File | null>(null);

  mergePosition = signal<MergePosition>('end'); // por default: unir al final

  onSelectVersion(version: any): void {
    this.selectedVersion.set(version);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) return;

    // Validación básica (opcional pero recomendable)
    if (file.type !== 'application/pdf') {
      console.warn('El archivo no es un PDF');
      return;
    }

    this.selectedFile.set(file);
  }

  onMerge(): void {
    if (!this.selectedVersion() || !this.selectedFile()) return;

    this.merge.emit({
      version: this.selectedVersion(),
      file: this.selectedFile()!,
      position: this.mergePosition(),
    });
  }
}
