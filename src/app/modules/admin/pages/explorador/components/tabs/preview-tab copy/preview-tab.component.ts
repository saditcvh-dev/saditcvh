import { Component, computed, Input, signal, SimpleChanges } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { AutorizacionTreeNode } from '../../../../../../../core/models/autorizacion-tree.model';

@Component({
  selector: 'app-preview-tab',
  standalone: false,
  templateUrl: './preview-tab.component.html',
  styleUrls: ['./preview-tab.component.css']
})
export class PreviewTabComponent {

  @Input() selectedNode: AutorizacionTreeNode | null = null;
  @Input() pdfUrl: SafeResourceUrl | null = null;
 
  isLoading = signal(true);
  hasError = signal(false);
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pdfUrl']) {
      this.isLoading.set(!!this.pdfUrl);
      this.hasError.set(false);
    }
  }
  get isAutorizacion(): boolean {
    return this.selectedNode?.type === 'autorizacion';
  }
  constructor() {
    computed(() => {
      const url = this.pdfUrl;
      console.log("url")
      console.log(url)
      this.isLoading.set(true);
      this.hasError.set(false);
    });
  }


  onPdfLoaded(): void {
    this.isLoading.set(false);
  }

  onPdfError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
  }


  get hasPreview(): boolean {
    return this.isAutorizacion && !!this.pdfUrl;
  }

  getFileType(): 'pdf' | 'image' | 'document' | 'unknown' {
    if (!this.selectedNode?.nombre) return 'unknown';

    const name = this.selectedNode.nombre.toLowerCase();

    if (name.endsWith('.pdf')) return 'pdf';
    if (/\.(jpg|jpeg|png|tif|tiff)$/.test(name)) return 'image';
    if (/\.(doc|docx)$/.test(name)) return 'document';

    return 'unknown';
  }
  getNodeIcon(node: AutorizacionTreeNode | null): string {
    if (!node) return '';

    switch (node.type) {
      case 'municipio':
        return `
        <svg class="w-full h-full text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>`;
      case 'autorizacion':
        return `
        <svg class="w-full h-full text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M12 2l5 5v15a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2h3z" />
        </svg>`;
      default:
        return '';
    }
  }
}
