
export const handleFileValidation = (
  file: File, 
  maxSize: number, 
  allowedTypes: string[]
): { valid: boolean; error?: string } => {
  if (file.size > maxSize) {
    return { valid: false, error: `El archivo es demasiado grande. Tamaño máximo: ${maxSize / (1024*1024)}MB` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido' };
  }
  
  return { valid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0 || !bytes) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// export const createAutorizacionPayload = (data: any) => ({
//   municipio_id: data.municipioId,
//   modalidad_id: Number(data.modalidadId),
//   tipo_id: Number(data.tipoId),
//   solicitante: data.solicitante,
// });

export const createDocumentoPayload = (data: any) => ({
  titulo: data.titulo,
  descripcion: data.descripcion || '',
  tipoDocumento: data.tipoDocumento || 'documento',
  fechaDocumento: new Date().toISOString().split('T')[0],
  autorizacionId: data.autorizacionId,
  metadata: data.metadata || {}
});