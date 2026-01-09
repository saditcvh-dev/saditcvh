import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ArchivoDigital } from '../../../../../core/models/archivo-digital.model';
import { environment } from '../../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ArchivoUrlService {

    private sanitizer = inject(DomSanitizer);

    private readonly STORAGE_BASE_URL = `${environment.apiUrlstorage}/storage`;
    buildPdfUrl(archivo?: ArchivoDigital | null): SafeResourceUrl {
        if (!archivo?.ruta_almacenamiento) {
            return this.empty();
        }

        const rutaNormalizada = archivo.ruta_almacenamiento
            .replace(/\\/g, '/')
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');

        const url = `${this.STORAGE_BASE_URL}/${rutaNormalizada}`;

        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    empty(): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
}
