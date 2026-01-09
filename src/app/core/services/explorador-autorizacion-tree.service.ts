
import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { AutorizacionService } from './explorador-autorizacion.service';
import { Municipio, UserTerritory } from '../models/user.model';
import { MunicipioService } from './explorador-municipio.service';
import { TipoAutorizacion, TiposAutorizacionService } from './explorador-tipos-autorizacion.service';
import { AutorizacionTreeNode } from '../models/autorizacion-tree.model';

@Injectable({
  providedIn: 'root'
})
export class AutorizacionTreeService {
  private autorizacionService = inject(AutorizacionService);
  private municipioService = inject(MunicipioService);
  private tipoService = inject(TiposAutorizacionService);
  private openState = new Map<string, boolean>();
  private lastTree: AutorizacionTreeNode[] | null = null;

  constructor() {
    this.municipioService.loadMyTerritories().subscribe();
    this.tipoService.getAll();
    this.autorizacionService.autorizacionesPaginadas();

  }
  tree$ = combineLatest([
    this.municipioService.municipios$,
    this.tipoService.tipos$,
    this.autorizacionService.autorizaciones$
  ]).pipe(
    map(([municipios, tipos, autorizaciones]) => {
      if (this.lastTree) {
        this.saveOpenState(this.lastTree);
      }
      const newTree = this.buildCompleteTree(municipios, tipos, autorizaciones);


      this.restoreOpenState(newTree);

      this.lastTree = newTree;

      return newTree;
    })
  );


  private buildCompleteTree(
    municipios: UserTerritory[],
    tipos: TipoAutorizacion[],
    autorizaciones: any[]
  ): AutorizacionTreeNode[] {
    const tree: AutorizacionTreeNode[] = [];

    const sortedMunicipios = [...municipios].sort((a, b) => a.id - b.id);

    sortedMunicipios.forEach(municipio => {
      const municipioNode: AutorizacionTreeNode = {
        id: `municipio-${municipio.id}`,
        nombre: `${municipio.id.toString().padStart(2, '0')}_${municipio.nombre}`,
        type: 'municipio',
        children: [],
        _open: false,
        data: { ...municipio, tieneRegistros: false }
      };
      const autorizacionesMunicipio = autorizaciones.filter(
        auth => auth.municipioId === municipio.id
      );

      // Si hay autorizaciones, actualizar flag
      if (autorizacionesMunicipio.length > 0) {
        municipioNode.data.tieneRegistros = true;
      }

      // Crear nodos para cada tipo (siempre mostrar C y P)
      tipos.forEach(tipo => {
        const tipoNode: AutorizacionTreeNode = {
          id: `tipo-${municipio.id}-${tipo.id}`,
          nombre: tipo.nombre,
          type: 'tipo',
          children: [],
          _open: false,
          data: { ...tipo }
        };


        const autorizacionesTipo = autorizacionesMunicipio.filter(
          auth => auth.tipoId === tipo.id
        );
        if (autorizacionesTipo.length === 0) return;
        if (autorizacionesTipo.length === 0) {
          tipoNode.children = [
            {
              id: `empty-${municipio.id}-${tipo.id}`,
              nombre: 'Sin registros',
              type: 'autorizacion',
              icon: '/assets/icons/folder-empty.svg',
              // disabled: true,
              data: { isEmpty: true }
            }
          ];
        } else {
          // Agregar autorizaciones
          autorizacionesTipo.forEach(autorizacion => {
            const autorizacionNode: AutorizacionTreeNode = {
              id: `autorizacion-${autorizacion.id}`,
              nombre: this.generateFolderName(autorizacion),
              type: 'autorizacion',
              icon: '/assets/icons/file.svg',
              data: autorizacion
            };

            tipoNode.children!.push(autorizacionNode);
          });
        }

        municipioNode.children!.push(tipoNode);
      });

      tree.push(municipioNode);
    });

    return tree;
  }

  private generateFolderName(autorizacion: any): string {
    const municipioNum = autorizacion.municipio.num.toString().padStart(2, '0');
    const modalidadNum = autorizacion.modalidad.num.toString().padStart(2, '0');

    return `${autorizacion.numeroAutorizacion} ${municipioNum}-${modalidadNum}-${autorizacion.consecutivo1.toString().padStart(4, '0')}-${autorizacion.consecutivo2.toString().padStart(4, '0')} ${autorizacion.tipoAutorizacion.abreviatura}`;
  }



  // estados del arbol
  private restoreOpenState(nodes: AutorizacionTreeNode[]) {
    nodes.forEach(node => {
      if (this.openState.has(node.id)) {
        node._open = this.openState.get(node.id)!;
      }
      if (node.children) {
        this.restoreOpenState(node.children);
      }
    });
  }
  private saveOpenState(nodes: AutorizacionTreeNode[]) {
    nodes.forEach(node => {
      if (node._open !== undefined) {
        this.openState.set(node.id, node._open);
      }
      if (node.children) {
        this.saveOpenState(node.children);
      }
    });
  }


}