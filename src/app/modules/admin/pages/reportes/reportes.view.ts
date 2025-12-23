import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { KpiCardConfig } from '../../components/reportes/kpi-card/kpi-card';

interface ReporteDetallado {
  title: string;
  description: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  frequency?: string;
  lastGenerated?: string;
  isCustom?: boolean;
}

@Component({
  standalone: false,
  templateUrl: './reportes.view.html',
})
export class ReportesView implements OnInit {
  
  expedientesKpi: KpiCardConfig = {
    title: 'Expedientes procesados',
    value: '20,400',
    icon: 'fas fa-archive',
    iconBgColor: 'bg-blue-100',
    iconTextColor: 'text-blue-600',
    trend: 12.5,
    trendUp: true,
    trendLabel: 'vs período anterior',
    showTrend: true
  };

  paginasKpi: KpiCardConfig = {
    title: 'Páginas digitalizadas',
    value: '9.65M',
    icon: 'fas fa-file-pdf',
    iconBgColor: 'bg-green-100',
    iconTextColor: 'text-green-600',
    trend: 8.3,
    trendUp: true,
    trendLabel: 'vs período anterior',
    showTrend: true
  };

  ocrKpi: KpiCardConfig = {
    title: 'Precisión OCR promedio',
    value: '94.2%',
    icon: 'fas fa-font',
    iconBgColor: 'bg-purple-100',
    iconTextColor: 'text-purple-600',
    trend: 1.8,
    trendUp: true,
    trendLabel: 'vs período anterior',
    showTrend: true
  };

  velocidadKpi: KpiCardConfig = {
    title: 'Velocidad promedio',
    value: '1,245',
    icon: 'fas fa-tachometer-alt',
    iconBgColor: 'bg-orange-100',
    iconTextColor: 'text-orange-600',
    trend: 2.1,
    trendUp: false,
    trendLabel: 'páginas/hora',
    showTrend: true
  };

  reportesDetallados: ReporteDetallado[] = [
    {
      title: 'Productividad del equipo',
      description: 'Métricas de rendimiento y eficiencia del personal',
      icon: 'fas fa-chart-line',
      color: 'blue',
      frequency: 'Mensual',
      lastGenerated: '15/12/2025'
    },
    {
      title: 'Control de calidad',
      description: 'Estadísticas de precisión OCR y errores detectados',
      icon: 'fas fa-check-circle',
      color: 'green',
      frequency: 'Semanal',
      lastGenerated: '14/12/2025'
    },
    {
      title: 'Inventario digital',
      description: 'Estado de archivos, almacenamiento y organización',
      icon: 'fas fa-boxes',
      color: 'purple',
      frequency: 'Trimestral',
      lastGenerated: '10/12/2025'
    },
    {
      title: 'Uso del sistema',
      description: 'Actividad de usuarios, búsquedas y accesos',
      icon: 'fas fa-users',
      color: 'orange',
      frequency: 'Diario',
      lastGenerated: 'Hoy'
    },
    {
      title: 'Rendimiento técnico',
      description: 'Métricas de servidores, almacenamiento y velocidad',
      icon: 'fas fa-server',
      color: 'red',
      frequency: 'Mensual',
      lastGenerated: '01/12/2025'
    },
    {
      title: 'Reporte personalizado',
      description: 'Configura tus propios parámetros y métricas',
      icon: 'fas fa-sliders-h',
      color: 'blue',
      isCustom: true
    },
  ];

  isLoading: boolean = false;
  loadingReportTitle: string = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.setupClickableCards();
  }

  // Método principal para generar reportes
  onGenerateReport(reporte: ReporteDetallado): void {
    console.log('Generando reporte:', reporte.title);
    
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.loadingReportTitle = `Generando ${reporte.title}...`;
    
    if (reporte.isCustom) {
      this.openCustomReportModal();
      this.isLoading = false;
      this.loadingReportTitle = '';
    } else {
      this.generarReporteDetallado(reporte);
    }
  }

  // Método simplificado para generar el reporte detallado
  private generarReporteDetallado(reporte: ReporteDetallado): void {
    console.log(`Generando reporte detallado: ${reporte.title}`);
    
    // Datos para el backend
    const datos = {
      reportType: reporte.title,
      descripcion: reporte.description,
      frecuencia: reporte.frequency || 'Mensual',
      timestamp: new Date().toISOString()
    };
    
    // URL única del backend - la única que existe
    const urlBackend = 'http://localhost:4000/api/reports/generar-reporte';
    
    console.log('Enviando solicitud a:', urlBackend);
    
    // Solicitud POST simple
    this.http.post(urlBackend, datos, { 
      responseType: 'blob'
    }).subscribe({
      next: (pdfBlob: Blob) => {
        console.log('✅ PDF recibido, tamaño:', pdfBlob.size, 'bytes');
        
        if (pdfBlob.size === 0) {
          this.mostrarError('El PDF recibido está vacío.');
          return;
        }
        
        this.descargarPDF(pdfBlob, reporte.title);
        this.actualizarFechaGeneracion(reporte.title);
        this.isLoading = false;
        this.loadingReportTitle = '';
      },
      error: (error) => {
        console.error('❌ Error al generar:', error);
        
        let mensajeError = 'No se pudo generar el reporte. ';
        
        if (error.status === 0 || error.status === 403) {
          mensajeError += 'Error de conexión. Verifica que el backend esté corriendo en http://localhost:4000';
        } else if (error.status === 404) {
          mensajeError += 'La ruta no existe. Verifica la URL del backend.';
        } else if (error.status === 500) {
          mensajeError += 'Error interno del servidor.';
        } else {
          mensajeError += `Error ${error.status}: ${error.message}`;
        }
        
        this.mostrarError(mensajeError);
      }
    });
  }

  // Método para descargar PDF
  private descargarPDF(blob: Blob, titulo: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Nombre del archivo
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Reporte_${titulo.replace(/[^a-z0-9]/gi, '_')}_${fecha}.pdf`;
      
      a.href = url;
      a.download = nombreArchivo;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log(`📥 PDF descargado: ${nombreArchivo}`);
      }, 100);
      
    } catch (error) {
      console.error('Error al descargar:', error);
      this.mostrarError('Error al descargar el archivo.');
    }
  }

  // Mostrar error simple
  private mostrarError(mensaje: string): void {
    this.isLoading = false;
    this.loadingReportTitle = '';
    alert(mensaje);
  }

  // Actualizar fecha de generación
  private actualizarFechaGeneracion(titulo: string): void {
    const hoy = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const reporte = this.reportesDetallados.find(r => r.title === titulo);
    if (reporte && !reporte.isCustom) {
      reporte.lastGenerated = hoy;
    }
  }

  // Modal de reporte personalizado
  openCustomReportModal(): void {
    console.log('Abriendo modal personalizado');
    
    const configuracion = prompt(
      'CONFIGURAR REPORTE PERSONALIZADO\n\n' +
      'Selecciona métricas (separadas por coma):\n\n' +
      '1. Usuarios activos\n' +
      '2. Sesiones totales\n' +
      '3. Tiempo promedio\n' +
      '4. Búsquedas realizadas\n' +
      '5. Errores del sistema\n' +
      '6. Crecimiento mensual\n\n' +
      'Ejemplo: 1,2,3,6',
      '1,2,3,6'
    );
    
    if (configuracion) {
      this.isLoading = true;
      this.loadingReportTitle = 'Configurando...';
      
      setTimeout(() => {
        this.isLoading = false;
        this.loadingReportTitle = '';
        alert('Reporte personalizado configurado (simulación)');
      }, 1500);
    }
  }

  // Configurar tarjetas KPI
  setupClickableCards(): void {
    this.expedientesKpi.onClick = () => this.onKpiClick('Expedientes procesados');
    this.paginasKpi.onClick = () => this.onKpiClick('Páginas digitalizadas');
    this.ocrKpi.onClick = () => this.onKpiClick('Precisión OCR promedio');
    this.velocidadKpi.onClick = () => this.onKpiClick('Velocidad promedio');
  }

  // Click en KPI
  onKpiClick(cardTitle: string): void {
    console.log(`Clicked: ${cardTitle}`);
  }

  // Exportar dashboard
  onExportPDF(): void {
    console.log('Exportando dashboard...');
    
    this.isLoading = true;
    this.loadingReportTitle = 'Exportando dashboard...';
    
    setTimeout(() => {
      this.isLoading = false;
      this.loadingReportTitle = '';
      alert('Dashboard exportado (simulación)');
    }, 2000);
  }

  // Seleccionar rango de tiempo
  onSelectTimeRange(range: string): void {
    console.log('Rango seleccionado:', range);
    
    this.isLoading = true;
    this.loadingReportTitle = `Actualizando: ${range}`;
    
    setTimeout(() => {
      this.isLoading = false;
      this.loadingReportTitle = '';
    }, 1500);
  }

  // Probar backend (opcional)
  probarBackendPDF(): void {
    console.log('Probando backend...');
    
    this.http.get('http://localhost:4000/api/reports/test').subscribe({
      next: (response) => {
        console.log('✅ Backend responde:', response);
        alert('Backend funcionando correctamente');
      },
      error: (error) => {
        console.error('❌ Backend no responde:', error);
        alert('Backend no disponible. Verifica que esté corriendo en puerto 4000.');
      }
    });
  }
}