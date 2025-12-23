import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-report-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-card.html',
})
export class ReportCardComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = 'fas fa-chart-line';
  @Input() color: 'blue' | 'green' | 'purple' | 'orange' | 'red' = 'blue';
  @Input() frequency: string = 'Mensual';
  @Input() lastGenerated: string = '15/12/2025';
  @Input() isCustom: boolean = false;
  
  @Output() generate = new EventEmitter<void>();
  @Output() configure = new EventEmitter<void>();

  // En report-card.ts, actualiza el método getColorClasses:
  getColorClasses() {
    const colorMap = {
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-700', // Cambiado de text-blue-600
        border: 'border-blue-400', // Cambiado de border-blue-300
        bgLight: 'bg-blue-50',
        textDark: 'text-blue-900' // Cambiado de text-blue-800
      },
      green: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-400',
        bgLight: 'bg-green-50',
        textDark: 'text-green-900'
      },
      purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-400',
        bgLight: 'bg-purple-50',
        textDark: 'text-purple-900'
      },
      orange: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-400',
        bgLight: 'bg-orange-50',
        textDark: 'text-orange-900'
      },
      red: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-400',
        bgLight: 'bg-red-50',
        textDark: 'text-red-900'
      }
    };

    return colorMap[this.color];
  }

  onGenerateClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.isCustom) {
      this.configure.emit();
    } else {
      this.generate.emit();
    }
  }

  onCardClick() {
    if (this.isCustom) {
      this.configure.emit();
    } else {
      this.generate.emit();
    }
  }
}