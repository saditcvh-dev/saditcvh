
import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { AutorizacionService } from './explorador-autorizacion.service';
import { Municipio, UserTerritory } from '../models/user.model';
import { MunicipioService } from './explorador-municipio.service';
import { TipoAutorizacion, TiposAutorizacionService } from './explorador-tipos-autorizacion.service';
import { AutorizacionTreeNode } from '../models/autorizacion-tree.model';
import { ExploradorStateService } from '../../modules/admin/pages/explorador/services/explorador-state.service';

@Injectable({
  providedIn: 'root'
})
export class AutorizacionTreeService {
  private autorizacionService = inject(AutorizacionService);
  private municipioService = inject(MunicipioService);
  private tipoService = inject(TiposAutorizacionService);
  // private state = inject(ExploradorStateService);
  private openState = new Map<string, boolean>();
  private lastTree: AutorizacionTreeNode[] | null = null;


  init(): void {
    this.municipioService.loadMyTerritories().subscribe();
    this.tipoService.getAll();
    this.autorizacionService.refresh();
    // this.autorizacionService.autorizacionesPaginadas();
  }
  tree$ = combineLatest([
    this.municipioService.municipios$,
    this.tipoService.tipos$,
    this.autorizacionService.autorizaciones$
  ]).pipe(
    map(([municipios, tipos, autorizaciones]) => {
      const hasFiltro = this.autorizacionService.filtros() !== null;
      if (!hasFiltro && this.lastTree) {
        this.saveOpenState(this.lastTree);
      }

      // const hasFiltro = this.autorizacionService.filtros() !== null;

      const newTree = this.buildCompleteTree(
        municipios,
        tipos,
        autorizaciones,
        hasFiltro
      );

      if (hasFiltro) {
        this.restoreOpenState(newTree, true);
      } else {
        this.restoreOpenState(newTree);
      }
      this.lastTree = newTree;
      // this.state.reselectNodeFromTree(newTree);
      return newTree;
    })
  );



  reset(): void {
    this.municipioService.reset();
    this.autorizacionService.reset();
    this.tipoService.reset();
    this.openState.clear();
    this.lastTree = null;
  }


  private buildCompleteTree(
    municipios: UserTerritory[],
    tipos: TipoAutorizacion[],
    autorizaciones: any[],
    hasFiltro: boolean
  ): AutorizacionTreeNode[] {


    const tree: AutorizacionTreeNode[] = [];

    const sortedMunicipios = [...municipios].sort((a, b) => a.id - b.id);

    const municipiosFinales = hasFiltro
      ? sortedMunicipios.filter(m =>
        autorizaciones.some(a => a.municipioId === m.id)
      )
      : sortedMunicipios;



    municipiosFinales.forEach(municipio => {
      const municipioNode: AutorizacionTreeNode = {
        id: `municipio-${municipio.id}`,
        nombre: `${municipio.id.toString().padStart(2, '0')}_${municipio.nombre}`,
        type: 'municipio',
        children: [],
        _open: hasFiltro,
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
          _open: hasFiltro,
          data: { ...tipo }
        };


        const autorizacionesTipo = autorizacionesMunicipio.filter(
          auth => auth.tipoId === tipo.id
        );
        if (autorizacionesTipo.length === 0) {
          return;
        }

        // if (autorizacionesTipo.length === 0) return;
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
    const numero = autorizacion.numeroAutorizacion;
    const municipio = autorizacion.municipio.num.toString().padStart(2, '0');
    const modalidad = autorizacion.modalidad.num.toString().padStart(2, '0');
    const consecutivo1 = autorizacion.consecutivo1.toString().padStart(2, '0');
    const consecutivo2 = autorizacion.consecutivo2.toString().padStart(3, '0');
    const tipo = autorizacion.tipoAutorizacion.abreviatura;

    return `${numero} ${municipio}-${modalidad}-${consecutivo1}-${consecutivo2} ${tipo}`;
  }



  // estados del arbol
  private restoreOpenState(nodes: AutorizacionTreeNode[], forceOpen = false) {
    nodes.forEach(node => {

      if (forceOpen) {
        node._open = true;
      } else if (this.openState.has(node.id)) {
        node._open = this.openState.get(node.id)!;
      }

      if (node.children) {
        this.restoreOpenState(node.children, forceOpen);
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