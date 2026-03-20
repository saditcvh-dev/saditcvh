import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExploradorStateService } from '../explorador/services/explorador-state.service';
import { PdfService, GlobalSearchResponse } from '../digitalizacion/services/pdf-ocr.service';

@Component({
  selector: 'app-busqueda-global',
  imports: [CommonModule, FormsModule],
  templateUrl: './busqueda-global.view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusquedaGlobalView {
  private pdfService = inject(PdfService);
  private stateService = inject(ExploradorStateService);
  private router = inject(Router);

  globalSearchTerm = signal('');
  globalCaseSensitive = signal(false);
  isGlobalSearching = signal(false);
  globalSearchResults = signal<GlobalSearchResponse | null>(null);

  updateSearchTerm(value: string) {
    this.globalSearchTerm.set(value);
  }

  updateCaseSensitive(value: boolean) {
    this.globalCaseSensitive.set(value);
  }

  performGlobalSearch(): void {
    const term = this.globalSearchTerm().trim();
    if (!term) {
      this.stateService.showToast('Escribe un término de búsqueda para la búsqueda global', 'error');
      return;
    }

    this.isGlobalSearching.set(true);

    this.pdfService.globalSearch(
      term,
      this.globalCaseSensitive(),
      100,
      100
    ).subscribe({
      next: (response) => {
        this.globalSearchResults.set(response);
        if (response.total_matches === 0) {
          this.stateService.showToast('No se encontraron coincidencias en la búsqueda global', 'error');
        }
        this.isGlobalSearching.set(false);
      },
      error: (error: any) => {
        this.stateService.showToast(error.error?.detail || 'Error en la búsqueda global', 'error');
        this.isGlobalSearching.set(false);
      }
    });
  }

  goToDocumentSearch(pdfId: string, filename: string = ''): void {
    const url = this.buildExploradorUrl(filename);

    if (url) {
      const qMatch = url.match(/\?q=(.*)$/);
      const q = qMatch ? qMatch[1] : null;

      if (q) {
        this.router.navigate(['/admin/explorador'], { queryParams: { q } });
      } else {
        this.router.navigateByUrl(url);
      }
    } else {
      this.stateService.showToast('No se pudo construir la URL del explorador para este archivo', 'error');
    }
  }

  private buildExploradorUrl(nombreArchivo: string): string | null {
    if (!nombreArchivo) return null;

    const base = nombreArchivo.replace(/\.pdf$/i, '');
    const regexUnderscore = /^(\d+)_([0-9]{2})_([0-9]{2})_([0-9]{2})_([0-9]{3})_([A-Z])(?:_.*)?$/i;
    const m1 = base.trim().match(regexUnderscore);
    if (m1) {
      const [, numeroAutorizacion, municipio, modalidad, consecutivo1, consecutivo2, tipo] = m1;
      const query = [
        numeroAutorizacion,
        municipio,
        modalidad,
        consecutivo1,
        consecutivo2,
        tipo.toUpperCase()
      ].join('_');
      return `/admin/explorador?q=${query}`;
    }

    const regexLegacy = /(\d+)\s+(\d+)-(\d+)-(\d+)-(\d+)\s+([A-Z])/i;
    const m2 = base.match(regexLegacy);
    if (m2) {
      const [, numeroAutorizacion, municipio, modalidad, consecutivo1, consecutivo2, tipo] = m2;
      const query = [
        numeroAutorizacion,
        municipio.padStart(2, '0'),
        modalidad.padStart(2, '0'),
        consecutivo1.padStart(2, '0'),
        consecutivo2.padStart(3, '0'),
        tipo.toUpperCase()
      ].join('_');
      return `/admin/explorador?q=${query}`;
    }

    return null;
  }
}
