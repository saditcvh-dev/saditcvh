import { Injectable } from '@angular/core';

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export interface LocalSearchResult {
  page: number;
  position: number;
  context: string;
  line?: number;
  score?: number;
}

export interface LocalSearchResponse {
  term: string;
  total_matches: number;
  results: LocalSearchResult[];
  execution_time: number;
  source: 'local' | 'backend';
}

@Injectable({
  providedIn: 'root'
})
export class PdfLocalSearchService {
  private pdfCache: Map<string, { text: string; pages: Map<number, string> }> = new Map();

  async loadPdfToCache(pdfId: string, file: File): Promise<void> {
    if (this.pdfCache.has(pdfId)) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const pages = new Map<number, string>();
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pages.set(pageNum, pageText);
        fullText += pageText + '\n\n';
      }

      this.pdfCache.set(pdfId, {
        text: fullText,
        pages
      });

      console.log(`PDF ${pdfId} cargado en caché. Páginas: ${pdf.numPages}`);
    } catch (error) {
      console.error('Error cargando PDF localmente:', error);
      throw error;
    }
  }

  searchLocal(pdfId: string, term: string, caseSensitive: boolean = false): LocalSearchResponse {
    const startTime = performance.now();
    
    if (!this.pdfCache.has(pdfId)) {
      throw new Error('PDF no cargado en caché local');
    }

    const pdfData = this.pdfCache.get(pdfId)!;
    const results: LocalSearchResult[] = [];
    
    // Buscar en cada página
    for (const [pageNum, pageText] of pdfData.pages) {
      const pageResults = this.searchInPage(pageText, term, pageNum, caseSensitive);
      results.push(...pageResults);
    }

    const executionTime = performance.now() - startTime;

    return {
      term,
      total_matches: results.length,
      results: results.slice(0, 100), // Limitar a 100 resultados
      execution_time: executionTime / 1000, // Convertir a segundos
      source: 'local'
    };
  }

  private searchInPage(
    pageText: string, 
    term: string, 
    pageNum: number, 
    caseSensitive: boolean
  ): LocalSearchResult[] {
    const results: LocalSearchResult[] = [];
    const flags = caseSensitive ? 'g' : 'gi';
    
    // Escapar caracteres especiales para RegExp
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTerm, flags);
    
    let match;
    while ((match = regex.exec(pageText)) !== null) {
      const position = match.index;
      const start = Math.max(0, position - 100);
      const end = Math.min(pageText.length, position + term.length + 100);
      const context = pageText.substring(start, end);

      results.push({
        page: pageNum,
        position,
        context: `...${context}...`,
        line: this.getLineNumber(pageText, position)
      });
    }

    return results;
  }

  private getLineNumber(text: string, position: number): number {
    const textBefore = text.substring(0, position);
    const lines = textBefore.split('\n');
    return lines.length;
  }

  clearCache(pdfId?: string): void {
    if (pdfId) {
      this.pdfCache.delete(pdfId);
    } else {
      this.pdfCache.clear();
    }
  }

  hasCachedPdf(pdfId: string): boolean {
    return this.pdfCache.has(pdfId);
  }
}