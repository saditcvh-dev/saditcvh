import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../../core/services/user.service';
import { ActivatedRoute } from '@angular/router'; // <--- IMPORTANTE
import { User, Permission, Municipio, Role } from '../../../../core/models/user.model';

@Component({
  selector: 'app-permission-matrix',
  standalone: false,
  templateUrl: './permission-matrix.html',
  styles: [`
    .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
  `]
})
export class PermissionMatrixComponent implements OnInit {

  selectedUserId: number | null = null;
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  // Datos Usuarios
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  searchUserTerm = '';

  // Filtro Rol
  rolesList: Role[] = [];
  selectedRoleId: number | null = null;

  // Datos Generales
  permissionsColumns: Permission[] = [];
  municipiosMap = new Map<number, Municipio>();
  catalogMunicipios: Municipio[] = [];

  // Tabla
  allMunicipiosRows: any[] = [];
  displayedRows: any[] = [];

  // Estado
  accessMatrix: { [key: number]: { [key: number]: boolean } } = {};
  originalMatrix: { [key: number]: { [key: number]: boolean } } = {};

  isRefreshing = false;
  saving = false;
  loadingUsers = false;
  hasChanges = false;

  pagination = { page: 1, limit: 10, total: 0 };
  searchTerm = '';
  isAssignModalOpen = false;
  loadingCatalog = false;
  filteredCatalog: Municipio[] = [];
  displayedCatalog: Municipio[] = [];
  selectedMunicipiosIds: Set<number> = new Set();
  modalSearchTerm = '';
  renderLimit = 50;

  ngOnInit(): void {
    this.loadCatalogues();
    this.loadRoles();
    this.loadUsersList();
    this.preloadMunicipiosCatalog();
  }

  loadCatalogues() {
    this.userService.getAllPermissions().subscribe(res => {
      if (res.success) this.permissionsColumns = res.data || [];
    });
  }

  loadRoles() {
    this.userService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success) this.rolesList = res.data || [];
      }
    });
  }

  loadUsersList() {
    this.loadingUsers = true;
    this.userService.getAllUsers({ limit: 2000, active: 'true', sortBy: 'name', order: 'asc' }).subscribe({
      next: (res: any) => {
        this.allUsers = res.rows || res.data || [];
        this.filteredUsers = this.allUsers;
        this.loadingUsers = false;
        this.cdr.detectChanges();
      },
      error: () => this.loadingUsers = false
    });
  }

  preloadMunicipiosCatalog() {
    this.userService.getAllMunicipios().subscribe(res => {
        if(res.success) {
            this.catalogMunicipios = res.data;
            // Llenar el mapa para acceso rápido
            this.municipiosMap.clear();
            this.catalogMunicipios.forEach(m => this.municipiosMap.set(m.id, m));
            this.checkUrlParams();
        }
    });
  }

  checkUrlParams() {
    this.route.queryParams.subscribe(params => {
        const urlUserId = params['userId'];
        if (urlUserId) {
            const id = Number(urlUserId);
            // Solo cargamos si es diferente o si es la primera carga
            if (this.selectedUserId !== id) {
                this.selectedUserId = id;
                this.onUserChange(); // Ahora sí, el mapa existe y funcionará
            }
        }
    });
  }


  filterUsers() {
    const term = this.searchUserTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(u => {
      const matchesText = u.first_name.toLowerCase().includes(term) ||
                          u.last_name.toLowerCase().includes(term) ||
                          u.username.toLowerCase().includes(term);
      const matchesRole = this.selectedRoleId ? u.roles?.some(r => r.id == this.selectedRoleId) : true;
      return matchesText && matchesRole;
    });
  }

  selectUser(userId: number) {
    if (this.selectedUserId === userId) return;
    if (this.hasChanges) {
       if (!confirm('Tiene cambios sin guardar. ¿Desea descartarlos?')) return;
    }
    this.selectedUserId = userId;
    this.onUserChange();
  }

  getInitials(user: User): string {
    return (user.first_name.charAt(0) + (user.last_name ? user.last_name.charAt(0) : '')).toUpperCase();
  }

  onUserChange() {
    if (!this.selectedUserId) { this.resetTable(); return; }

    // Asegurarse de que el mapa exista antes de procesar
    if (this.municipiosMap.size === 0) {
        // Si por alguna razón el mapa no está listo, esperamos o recargamos catálogo
        return;
    }

    this.isRefreshing = true;
    this.hasChanges = false;
    this.pagination.page = 1;
    this.searchTerm = '';

    this.userService.getUserPermissionsRaw(this.selectedUserId).subscribe({
      next: (res) => {
        if (res.success) this.processDataRaw(res.data);
        this.isRefreshing = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isRefreshing = false; this.cdr.detectChanges(); }
    });
  }

  resetTable() {
    this.allMunicipiosRows = [];
    this.displayedRows = [];
    this.accessMatrix = {};
    this.originalMatrix = {};
    this.hasChanges = false;
    this.pagination.total = 0;
  }

  processDataRaw(permissions: any[]) {
    this.accessMatrix = {};
    const municipiosEncontrados = new Set<number>();
    const userMunicipios: any[] = [];

    for (const p of permissions) {
        const mId = p.municipio_id;
        const pId = p.permission_id;

        if (!this.accessMatrix[mId]) {
            this.accessMatrix[mId] = {};
            // Usamos el MAPA que ya garantizamos que está cargado
            const muniData = this.municipiosMap.get(mId);
            if (muniData) {
                userMunicipios.push(muniData);
                municipiosEncontrados.add(mId);
            }
        }
        this.accessMatrix[mId][pId] = true;
    }

    this.allMunicipiosRows = userMunicipios.sort((a, b) => (a.num || 0) - (b.num || 0));
    this.originalMatrix = JSON.parse(JSON.stringify(this.accessMatrix));
    this.selectedMunicipiosIds = municipiosEncontrados;
    this.updateTable();
  }

  openAssignModal() {
    this.isAssignModalOpen = true;
    this.modalSearchTerm = '';
    this.renderLimit = 50;
    this.filterLocalModal();
  }

  filterLocalModal() {
    let results = this.catalogMunicipios;
    if (this.modalSearchTerm.trim()) {
      const term = this.modalSearchTerm.toLowerCase();
      results = results.filter(m => m.nombre.toLowerCase().includes(term) || m.num.toString().includes(term));
    }
    this.filteredCatalog = results;
    this.updateDisplayedCatalog();
  }

  updateDisplayedCatalog() {
    this.displayedCatalog = this.filteredCatalog.slice(0, this.renderLimit);
  }

  onModalScroll(event: any) {
    const el = event.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
        if (this.renderLimit < this.filteredCatalog.length) {
            this.renderLimit += 50;
            this.updateDisplayedCatalog();
        }
    }
  }

  closeAssignModal() {
    this.isAssignModalOpen = false;
    const currentIds = this.allMunicipiosRows.map(m => m.id);
    this.selectedMunicipiosIds = new Set(currentIds);
  }

  toggleSelection(muniId: number) {
    if (this.selectedMunicipiosIds.has(muniId)) this.selectedMunicipiosIds.delete(muniId);
    else this.selectedMunicipiosIds.add(muniId);
  }

  saveAssignments() {
    this.isAssignModalOpen = false;
    const verPermiso = this.permissionsColumns.find(p => p.name.toLowerCase() === 'ver') || this.permissionsColumns[0];
    Object.keys(this.accessMatrix).forEach(mIdStr => {
        const mId = parseInt(mIdStr);
        if (!this.selectedMunicipiosIds.has(mId)) delete this.accessMatrix[mId];
    });
    const newUserMunicipios: any[] = [];
    this.selectedMunicipiosIds.forEach(mId => {
        const muniData = this.municipiosMap.get(mId);
        if (muniData) newUserMunicipios.push(muniData);
        if (!this.accessMatrix[mId]) {
            this.accessMatrix[mId] = {};
            if (verPermiso) this.accessMatrix[mId][verPermiso.id] = true;
        }
    });
    this.allMunicipiosRows = newUserMunicipios.sort((a, b) => a.num - b.num);
    this.updateTable();
    this.checkChanges();
  }

  saveChanges() {
    if (!this.selectedUserId) return;

    const changes = [];
    for (const muniId of this.allMunicipiosRows.map(m => m.id)) {
        for (const perm of this.permissionsColumns) {
            const oldVal = this.originalMatrix[muniId] ? !!this.originalMatrix[muniId][perm.id] : false;
            const newVal = this.accessMatrix[muniId] ? !!this.accessMatrix[muniId][perm.id] : false;
            if (oldVal !== newVal) {
                changes.push({ municipioId: muniId, permissionId: perm.id, value: newVal });
            }
        }
    }
    const currentMuniIds = new Set(this.allMunicipiosRows.map(m => m.id));
    Object.keys(this.originalMatrix).forEach(mStr => {
        const mId = parseInt(mStr);
        if (!currentMuniIds.has(mId)) {
            for (const perm of this.permissionsColumns) {
                if (this.originalMatrix[mId][perm.id]) {
                    changes.push({ municipioId: mId, permissionId: perm.id, value: false });
                }
            }
        }
    });

    if (changes.length === 0) { this.hasChanges = false; return; }

    // Activar Overlay
    this.saving = true;

    this.userService.updatePermissionsBatch(this.selectedUserId, changes).subscribe({
        next: () => {
            this.originalMatrix = JSON.parse(JSON.stringify(this.accessMatrix));
            this.hasChanges = false;
            this.saving = false; // Quitar Overlay
            this.cdr.detectChanges();
        },
        error: (err) => {
            console.error(err);
            this.saving = false;
            this.cdr.detectChanges();
            alert('Error de sincronización.');
        }
    });
  }

  updateTable() {
    let filtered = this.allMunicipiosRows;
    if (this.searchTerm.trim()) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(m => m.nombre.toLowerCase().includes(term));
    }
    this.pagination.total = filtered.length;
    const start = (this.pagination.page - 1) * this.pagination.limit;
    this.displayedRows = filtered.slice(start, start + this.pagination.limit);
    if(this.displayedRows.length === 0 && this.pagination.page > 1) {
        this.pagination.page = 1;
        this.updateTable();
    }
  }

  hasPermission(mId: number, pId: number): boolean {
    return this.accessMatrix[mId] ? !!this.accessMatrix[mId][pId] : false;
  }

  toggle(mId: number, pId: number, event: any) {
    const checked = event.target.checked;
    if (!this.accessMatrix[mId]) this.accessMatrix[mId] = {};
    this.accessMatrix[mId][pId] = checked;
    this.checkChanges();
  }

  checkChanges() {
    let changed = false;
    for (const mId of this.allMunicipiosRows.map(m => m.id)) {
        for (const perm of this.permissionsColumns) {
            const oldVal = this.originalMatrix[mId] ? !!this.originalMatrix[mId][perm.id] : false;
            const newVal = this.accessMatrix[mId] ? !!this.accessMatrix[mId][perm.id] : false;
            if (oldVal !== newVal) { changed = true; break; }
        }
        if (changed) break;
    }
    if (!changed) {
        const oldLen = Object.keys(this.originalMatrix).length;
        const newLen = Object.keys(this.accessMatrix).length;
        if (oldLen !== newLen) changed = true;
    }
    this.hasChanges = changed;
  }

  cancelChanges() {
    if (confirm('¿Descartar cambios?')) {
        this.accessMatrix = JSON.parse(JSON.stringify(this.originalMatrix));
        const restoredMunicipios: any[] = [];
        Object.keys(this.originalMatrix).forEach(key => {
            const mId = Number(key);
            const muni = this.municipiosMap.get(mId);
            if(muni) restoredMunicipios.push(muni);
        });
        this.allMunicipiosRows = restoredMunicipios.sort((a,b)=>a.num-b.num);
        this.selectedMunicipiosIds = new Set(Object.keys(this.originalMatrix).map(Number));
        this.updateTable();
        this.hasChanges = false;
    }
  }

  onSearchChange() { this.pagination.page = 1; this.updateTable(); }
  changePage(p: number) { this.pagination.page = p; this.updateTable(); }
  get totalPages() { return this.pagination.limit ? Math.ceil(this.pagination.total / this.pagination.limit) : 0; }
  trackByMuni(index: number, item: any) { return item.id; }
}
