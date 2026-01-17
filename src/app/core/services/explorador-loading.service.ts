import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private isLoading = signal(false);
  private loaderElement?: HTMLElement;

  constructor() {effect(() => {this.isLoading() ? this.showLoader() : this.hideLoader();});}
  show() {this.isLoading.set(true);}
  hide() {this.isLoading.set(false);}
  
  private showLoader() {
    if (this.loaderElement || !document.body) return;

    try {
      const div = document.createElement('div');
      div.id = 'global-loader';
      div.innerHTML = this.loaderTemplate();
      document.body.appendChild(div);
      this.loaderElement = div;
    } catch (error) {
      console.error('Error al crear loader:', error);
    }
  }

  private hideLoader() {
    if (!this.loaderElement) return;
    this.loaderElement.remove();
    this.loaderElement = undefined;
  }

  private loaderTemplate(): string {
    return `
      <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="flex flex-col items-center gap-4">
          <div class="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span class="text-white text-sm tracking-wide">Procesando...</span>
        </div>
      </div>
    `;
  }
}
