import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  OnDestroy
} from '@angular/core';

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.protocol}//${window.location.host}/assets/pdfjs-dist/pdf.worker.min.js`;
@Component({
  selector: 'app-pdf-viewer-document',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
})
export class PdfViewerDocument implements OnDestroy {

  private _src!: string;

  @Input()
  set src(value: string) {
    if (!value) return;

    this._src = value;
    console.log('loadPdf llamado con src:', value);
    this.loadPdf();
  }

  get src(): string {
    return this._src;
  }
  @Output() pageChanged = new EventEmitter<number>();
  @Output() documentLoaded = new EventEmitter<number>();
  @Output() loadingProgress = new EventEmitter<number>();
  @ViewChild('container', { static: true })
  containerRef!: ElementRef<HTMLDivElement>;
  private observer!: IntersectionObserver;
  private renderedPages = new Map<number, HTMLCanvasElement>();
  private pdfDoc!: PDFDocumentProxy;
  currentPage = 1;
  totalPages = 0;
  scale = 1.2;
  private loadingTask: any;
  private renderTask: any;
  private scrollTimeout: any;
  async loadPdf() {
    if (this.observer) {
      this.observer.disconnect();
      const container = this.containerRef?.nativeElement;
      if (container) {
        container.innerHTML = '';
      }
    }
    this.renderedPages.clear();
    this.renderingPages.clear();
    if (this.loadingTask) {
      await this.loadingTask.destroy();
    }
    const currentSrc = this.src;

    this.loadingTask = pdfjsLib.getDocument({
      url: this.src,
      withCredentials: true,
      rangeChunkSize: 65536,
      disableStream: false,
      disableAutoFetch: false,
      disableRange: false
    });
    this.loadingTask.onProgress = (progress: any) => {
      if (progress && progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        this.loadingProgress.emit(percent);
      }
    };
    this.pdfDoc = await this.loadingTask.promise;
    this.loadingProgress.emit(100);
    if (this.src !== currentSrc) {
      return; // usuario cambió documento mientras cargaba
    }
    this.totalPages = this.pdfDoc.numPages;
    this.documentLoaded.emit(this.totalPages);

    this.setupLazyRendering();
  }
  private setupLazyRendering() {
    const container = this.containerRef.nativeElement;
    container.innerHTML = '';
    this.observer = new IntersectionObserver(
      (entries) => {

        entries.forEach(entry => {
          const pageNumber = Number(
            (entry.target as HTMLElement).dataset['page']
          );

          if (entry.isIntersecting) {
            this.renderPageIfNeeded(pageNumber);
          }
        });

        this.updateCurrentPageByCenterDebounced();

      },
      {
        root: container,
        rootMargin: '300px',
        threshold: 0
      }
    );

    for (let i = 1; i <= this.totalPages; i++) {
      const placeholder = document.createElement('div');
      placeholder.dataset['page'] = i.toString();
      placeholder.classList.add(
        'min-h-[800px]',
        'flex',
        'justify-center',
        'items-center',
        'bg-white',
        'shadow'
      );

      placeholder.innerHTML = `<span class="text-gray-400 text-sm">Cargando página ${i}...</span>`;

      container.appendChild(placeholder);
      this.observer.observe(placeholder);
    }
  }
  private updateCurrentPageByCenter() {
    const container = this.containerRef.nativeElement;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestPage = this.currentPage;
    let minDistance = Infinity;

    const placeholders = container.querySelectorAll('[data-page]');

    placeholders.forEach((el: Element) => {
      const rect = el.getBoundingClientRect();
      const pageCenter = rect.top + rect.height / 2;
      const distance = Math.abs(containerCenter - pageCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestPage = Number((el as HTMLElement).dataset['page']);
      }
    });

    if (closestPage !== this.currentPage) {
      this.currentPage = closestPage;
      this.pageChanged.emit(closestPage);
    }
  }

  private updateCurrentPageByCenterDebounced() {
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.updateCurrentPageByCenter();
    }, 50); // 50ms es perfecto
  }
  private renderingPages = new Set<number>();

  private async renderPageIfNeeded(pageNumber: number) {
    if (this.renderedPages.has(pageNumber)) return;
    if (this.renderingPages.has(pageNumber)) return;

    this.renderingPages.add(pageNumber);

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: this.scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.classList.add('shadow-lg', 'mx-auto', 'bg-white');

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    const container = this.containerRef.nativeElement;
    const placeholder = container.querySelector(
      `[data-page="${pageNumber}"]`
    );

    if (placeholder) {
      placeholder.innerHTML = '';
      placeholder.appendChild(canvas);
    }

    this.renderedPages.set(pageNumber, canvas);
    this.renderingPages.delete(pageNumber);
  }
  async renderAllPages() {
    const container = this.containerRef.nativeElement;
    container.innerHTML = '';

    for (let pageNumber = 1; pageNumber <= this.totalPages; pageNumber++) {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.classList.add('shadow-lg', 'bg-white', 'mx-auto');

      container.appendChild(canvas);

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
    }
  }
  goToPage(page: number) {
    if (!this.pdfDoc) return;

    if (page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;

    const container = this.containerRef.nativeElement;
    const target = container.querySelector(`[data-page="${page}"]`);

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      this.currentPage = page;
      this.pageChanged.emit(page);
    }
  }

  onPageInputChange(event: any) {
    const value = Number(event.target.value);
    if (!isNaN(value)) {
      this.goToPage(value);
    }
  }
  zoomIn() {
  this.scale = Math.min(this.scale + 0.2, 3);
  this.reRenderVisiblePages();
}

zoomOut() {
  this.scale = Math.max(this.scale - 0.2, 0.5);
  this.reRenderVisiblePages();
}
private async reRenderVisiblePages() {
  const visiblePages = Array.from(this.renderedPages.keys());

  for (const pageNumber of visiblePages) {
    const canvas = this.renderedPages.get(pageNumber);
    if (canvas) {
      canvas.remove();
    }

    this.renderedPages.delete(pageNumber);
    this.renderingPages.delete(pageNumber);

    await this.renderPageIfNeeded(pageNumber);
  }
}
  async ngOnDestroy() {
    clearTimeout(this.scrollTimeout);

    if (this.pdfDoc) {
      await this.pdfDoc.destroy();
    }

    if (this.loadingTask) {
      await this.loadingTask.destroy();
    }

    if (this.observer) {
      this.observer.disconnect();
    }
  }
}