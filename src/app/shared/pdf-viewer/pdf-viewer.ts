import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy
} from '@angular/core';

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs-dist/pdf.worker.min.js';

@Component({
  selector: 'app-pdf-viewer-document',
  standalone: true,
  imports: [],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.css',
})
export class PdfViewerDocument implements OnChanges, OnDestroy {

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

  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private pdfDoc!: PDFDocumentProxy;
  currentPage = 1;
  totalPages = 0;
  private scale = 1.2;
  private loadingTask: any;
  private renderTask: any;

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['src'] && this.src) {
      await this.loadPdf();
    }
  }

  async loadPdf() {
    console.log('loadPdf llamado con src:', this.src);
    if (this.loadingTask) {
      await this.loadingTask.destroy();
    }

    this.loadingTask = pdfjsLib.getDocument({
      url: this.src,
      withCredentials: true,
      rangeChunkSize: 65536,   // 64 KB más confiable
      disableStream: false,
      disableAutoFetch: false,
      disableRange: false      // 👈 fuerza uso de Range
    });

    this.pdfDoc = await this.loadingTask.promise;

    this.totalPages = this.pdfDoc.numPages;
    this.documentLoaded.emit(this.totalPages);

    this.currentPage = 1;
    this.renderPage(this.currentPage);
  }

  async renderPage(pageNumber: number) {

    if (this.renderTask) {
      this.renderTask.cancel();
    }

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: this.scale });

    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d')!;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    this.renderTask = page.render({
      canvasContext: context,
      viewport: viewport
    });

    await this.renderTask.promise;

    this.currentPage = pageNumber;
    this.pageChanged.emit(this.currentPage);
  }

  nextPage() {
    if (this.currentPage >= this.totalPages) return;
    this.renderPage(this.currentPage + 1);
  }

  prevPage() {
    if (this.currentPage <= 1) return;
    this.renderPage(this.currentPage - 1);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.renderPage(page);
  }
  async ngOnDestroy() {
    if (this.pdfDoc) {
      await this.pdfDoc.destroy();
    }

    if (this.loadingTask) {
      await this.loadingTask.destroy();
    }
  }
}