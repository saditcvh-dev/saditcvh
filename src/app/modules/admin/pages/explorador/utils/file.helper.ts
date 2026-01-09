import { ALLOWED_FILE_EXTENSIONS_REGEX, ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "./constants";
export class FileHelper {
  static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE_MB}MB`
      };
    }

    if (
      !ALLOWED_FILE_TYPES.includes(file.type) &&
      !ALLOWED_FILE_EXTENSIONS_REGEX.test(file.name)
    ) {
      return { valid: false, error: 'Tipo de archivo no soportado' };
    }

    return { valid: true };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const iconMap: { [key: string]: string } = {
      pdf: '/assets/icons/pdf.svg',
      jpg: '/assets/icons/image.svg',
      jpeg: '/assets/icons/image.svg',
      png: '/assets/icons/image.svg',
      tiff: '/assets/icons/image.svg',
      tif: '/assets/icons/image.svg',
      doc: '/assets/icons/doc.svg',
      docx: '/assets/icons/doc.svg'
    };

    return iconMap[extension || ''] || '/assets/icons/file.svg';
  }
}