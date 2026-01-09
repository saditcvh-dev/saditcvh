export interface ArchivoDigital {
  id: number;

  documentoId: number;

  nombreArchivo: string;

  rutaAcceso?: string;
  ruta_almacenamiento?: string;
  rutaPreservacion?: string;
  rutaTexto?: string;

  formato?: string;
  mimeType?: string;

  tamanoBytes: number;

  totalPaginas?: number;
  paginaNumero?: number;

  checksumMd5?: string;
  checksumSha256?: string;

  calidadEscaneo?: 'alta' | 'media' | 'baja';

  estadoOcr: 'pendiente' | 'procesando' | 'completado' | 'error';
  textoOcr?: string;

  metadatosTecnicos?: any;

  fechaDigitalizacion?: Date;
  digitalizadoPor?: string;
  revisadoPor?: string;
  fechaRevision?: Date;

  documentos?: {
    id: number;
    titulo: string;
    numeroDocumento: string;
  };
}
