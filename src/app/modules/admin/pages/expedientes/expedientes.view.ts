import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface ModalState {
  visible: boolean;
  type: 'delete' | 'create_folder' | null;
  title: string;
  message?: string;
  inputValue?: string; // Para el nombre de la carpeta
}
@Component({
  standalone: false,
  templateUrl: './expedientes.view.html'
})



export class ExpedientesView implements OnInit {

  modal: ModalState = {
    visible: false,
    type: null,
    title: '',
    inputValue: ''
  };

  targetNode: any = null;
  tree: any[] = [];
  selectedNode: any = null;

  // UI States
  activeTab: 'preview' | 'metadata' | 'security' | 'notes' | 'history' = 'metadata';
  toast = { visible: false, message: '', type: 'success' as 'success' | 'error' };
  pdfUrl: SafeResourceUrl | null = null;

  // Context Menu State
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    node: null as any
  };

  showToast(message: string, type: 'success' | 'error' = 'success') {
  this.toast = { visible: true, message, type };
  // Ocultar automáticamente después de 3 segundos
  setTimeout(() => {
    this.toast.visible = false;
  }, 3000);
}

  // Mock de Permisos (Inspirado en OpenKM)
  securityData = [
    { actor: 'Admin', type: 'Rol', read: true, write: true, delete: true, security: true },
    { actor: 'Recursos Humanos', type: 'Rol', read: true, write: true, delete: false, security: false },
    { actor: 'Juan Pérez', type: 'Usuario', read: true, write: false, delete: false, security: false },
  ];

  // Mock de Notas
  notesData = [
    { user: 'Admin', date: '2024-02-10 10:00', text: 'Documento validado para auditoría.' },
    { user: 'Maria Garcia', date: '2024-02-11 14:30', text: 'Pendiente revisar la cláusula 3.' }
  ];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.http.get<any>('mock/tree.json').subscribe({
      next: (res) => {
        if (res && res.tree) {
          const root = [res.tree];
          root[0]._open = true;
          this.tree = root;
          this.cdr.detectChanges();
        }
      }
    });
  }

  // Cierra el menú contextual si haces click fuera
  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenu.visible = false;
  }

  onSelectNode(node: any) {
    this.selectedNode = node;
    this.contextMenu.visible = false; // Cerrar menú si seleccionas con click izquierdo

    if (node.type === 'documento' && node.filename) {
      const path = `/assets/docs/${node.filename}`;
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(path);
      this.activeTab = 'preview';
    } else {
      this.activeTab = 'metadata';
      this.pdfUrl = null;
    }
  }

  // Manejo del Click Derecho (Evento personalizado desde el componente hijo)
  onNodeRightClick(event: { mouseEvent: MouseEvent, node: any }) {
    event.mouseEvent.preventDefault(); // Evita el menú del navegador
    event.mouseEvent.stopPropagation();

    this.contextMenu = {
      visible: true,
      x: event.mouseEvent.clientX,
      y: event.mouseEvent.clientY,
      node: event.node
    };

    // Opcional: Seleccionar el nodo al hacer click derecho también
    this.selectedNode = event.node;
  }

  // Acciones del Menú
 handleContextAction(action: string) {
    const node = this.contextMenu.node;
    if (!node) return;

    this.targetNode = node; // Guardamos referencia por si se necesita en modales
    this.contextMenu.visible = false; // Importante: cerrar el menú primero

    switch (action) {
      case 'open':
        // 1. Seleccionamos el nodo
        this.onSelectNode(node);

        // 2. Si es carpeta, forzamos que se abra (expand)
        if (node.children) {
          node._open = true;
          this.showToast('Carpeta expandida');
        } else {
          // Si es archivo, ya se previsualiza con onSelectNode
          this.showToast('Documento cargado en visor');
        }
        break;

      case 'add_folder':
        if (node.type === 'documento') return;
        this.modal = {
          visible: true,
          type: 'create_folder',
          title: 'Nueva Carpeta',
          inputValue: 'Nueva Carpeta'
        };
        break;

      case 'lock':
        // Toggle del estado
        node.locked = !node.locked;

        // Mensaje dinámico según el nuevo estado
        if (node.locked) {
            this.showToast('Elemento bloqueado (Check-out)', 'error'); // Rojo para bloquear
        } else {
            this.showToast('Elemento desbloqueado (Check-in)', 'success'); // Verde para desbloquear
        }
        break;

      case 'security':
        // 1. Cambiamos a la pestaña seguridad
        this.activeTab = 'security';
        // 2. Seleccionamos el nodo para que la tabla de permisos se llene
        this.onSelectNode(node);
        this.showToast('Gestionando permisos de: ' + node.name);
        break;

      case 'delete':
        this.modal = {
          visible: true,
          type: 'delete',
          title: 'Eliminar Elemento',
          message: `¿Estás seguro de eliminar "${node.name}"?`
        };
        break;
    }
  }

  confirmModal() {
    if (!this.targetNode) return;

    // A) LOGICA ELIMINAR
    if (this.modal.type === 'delete') {
      this.deleteNodeRecursive(this.tree, this.targetNode);
      this.selectedNode = null;
      this.showToast('Elemento eliminado correctamente');
    }

    // B) LOGICA CREAR CARPETA
    if (this.modal.type === 'create_folder') {
      const name = this.modal.inputValue || 'Nueva Carpeta';
      const newFolder = {
        name: name,
        type: 'seccion', // Tipo genérico de carpeta
        children: [],
        _open: true
      };

      if (!this.targetNode.children) this.targetNode.children = [];
      this.targetNode.children.push(newFolder);
      this.targetNode._open = true; // Abrir padre
      this.showToast(`Carpeta "${name}" creada`);
    }

    // Cerrar modal y limpiar
    this.closeModal();
  }

  closeModal() {
    this.modal.visible = false;
    this.modal.inputValue = '';
  }

deleteNodeRecursive(nodes: any[], nodeToDelete: any): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] === nodeToDelete) {
      nodes.splice(i, 1); // Borrar
      return true;
    }
    if (nodes[i].children) {
      if (this.deleteNodeRecursive(nodes[i].children, nodeToDelete)) {
        return true;
      }
    }
  }
  return false;
}
}
