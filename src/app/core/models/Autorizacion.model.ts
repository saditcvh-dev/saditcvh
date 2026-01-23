
export interface Autorizacion {
  id: number;
  numeroAutorizacion: string;
  municipioId: number;
  modalidadId: number;
  tipoId: number;
  consecutivo1: number;
  consecutivo2: number;
  nombreCarpeta: string;
  fechaCreacion: string;
  activo: boolean;
  solicitante: string;
  fechaSolicitud: string;
  rutaFisicaBase: string | null;
  rutaDigitalBase: string | null;
  municipio_id: number;
  modalidad_id: number;
  tipo_id: number;
  municipio: {
    id: number;
    num: number;
    nombre: string;
  };
  modalidad: {
    id: number;
    num: number;
    nombre: string;
  };
  tipoAutorizacion: {
    id: number;
    nombre: string;
    abreviatura: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface BusquedaAutorizacion {
    search?: string; 
  numeroAutorizacion?: string;
  solicitante?: string;
  municipioId?: number;
  modalidadId?: number;
  tipoId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}
export interface CrearAutorizacionDto {
  municipio_id: number;
  modalidad_id: number;
  tipo_id: number;

  numero_autorizacion: string;
  consecutivo1: string;
  consecutivo2: string;

  solicitante: string;
  fecha_solicitud?: string;
}



export interface ActualizarAutorizacionDto extends Partial<CrearAutorizacionDto> {
  activo?: boolean;
}

export interface CambiarEstadoDto {
  activo: boolean;
}
