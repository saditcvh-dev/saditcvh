import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastState } from '../../pages/explorador/models/explorador-state.model';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
  standalone: false,
  // imports: [CommonModule]
})
export class ToastComponent implements OnDestroy {
  @Input() toast!: ToastState;
  @Output() close = new EventEmitter<void>();

  private timeoutId: any;

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  get toastClasses(): string {
    const baseClasses = 'fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-[100]';
    
    switch (this.toast.type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800`;
      // case 'warning':
      //   return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`;
      // case 'info':
      //   return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-200 text-gray-800`;
    }
  }

  get iconSvg(): string {
    switch (this.toast.type) {
      case 'success':
        return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>`;
      case 'error':
        return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
      // case 'warning':
      //   return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      //     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      //   </svg>`;
      // case 'info':
      //   return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      //     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      //   </svg>`;
      default:
        return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
    }
  }

  get progressBarColor(): string {
    switch (this.toast.type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      // case 'warning': return 'bg-yellow-500';
      // case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  onClose(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.close.emit();
  }

  onMouseEnter(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  onMouseLeave(): void {
    if (this.toast.visible) {
      this.startAutoClose();
    }
  }

  startAutoClose(): void {
    this.timeoutId = setTimeout(() => {
      this.close.emit();
    }, 3000);
  }
}