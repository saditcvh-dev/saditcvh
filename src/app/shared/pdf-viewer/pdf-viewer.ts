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
  imports: [],
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
  private scale = 1.2;
  private loadingTask: any;
  private renderTask: any;

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
        console.log('Progreso PDF:', percent + '%');
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

        let mostVisiblePage = this.currentPage;
        let maxRatio = 0;

        entries.forEach(entry => {
          const pageNumber = Number(
            (entry.target as HTMLElement).dataset['page']
          );

          if (entry.isIntersecting) {

            // Para determinar la página actual REAL
            if (entry.intersectionRatio > maxRatio) {
              maxRatio = entry.intersectionRatio;
              mostVisiblePage = pageNumber;
            }

            this.renderPageIfNeeded(pageNumber);
          }
        });

        if (mostVisiblePage !== this.currentPage) {
          this.currentPage = mostVisiblePage;
          this.pageChanged.emit(mostVisiblePage);
        }
      },
      {
        root: container,
        rootMargin: '300px',
        threshold: [0.1, 0.5, 0.75, 1]
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

  async ngOnDestroy() {
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