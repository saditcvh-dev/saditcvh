export interface ResultadoBusqueda {
  tipo: 'autorizacion' | 'documento' | 'archivo';
  id: number;
  ubicacion?: string;
  nombre_carpeta?: string;
  data: any;
}

export interface BusquedaResponse {
  success: boolean;
  mensaje: string;
  data: {
    total: number;
    paginaActual: number;
    totalPaginas: number;
    resultados: ResultadoBusqueda[];
  };
}

export interface DashboardData {
  total_pdfs: number;
  estados: {
    completados: number;
    procesando: number;
    en_cola: number;
    con_error: number;
  };
  pdfs: PdfItem[];
}

export interface PdfItem {
  numero: number;
  nombre_archivo: string;
  tamaño_mb: number;
  estado: string;
  progreso: string;
  paginas: number;
  fecha_subida: string;
  id_interno: string;
}