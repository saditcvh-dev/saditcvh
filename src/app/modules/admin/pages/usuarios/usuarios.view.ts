import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { User, Role, Cargo, RoleCount } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { RoleService } from '../../../../core/services/role.service';
import { CargoService } from '../../../../core/services/cargo.service';
import { combineLatest, of, Subject, switchMap, debounceTime, tap, startWith } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { Pagination, PaginatedResponse } from '../../../../core/models/paginated-response.model';
import { Router } from "@angular/router"; // Router ya estaba importado

type SortColumn = 'name' | 'creator' | 'editor';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-usuarios-view',
  standalone: false,
  templateUrl: './usuarios.view.html'
})
export class UsuariosView implements OnInit {

  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private cargoService = inject(CargoService);
  private router = inject(Router);

  private filterTrigger = new Subject<void>();

  public users = signal<User[]>([]);
  public roles = signal<Role[]>([]);
  public cargos = signal<Cargo[]>([]);

  public realRoleCounts = signal<RoleCount[]>([]);

  public isLoading = signal<boolean>(true);
  public error = signal<string | null>(null);

  // Paginación
  public pagination = signal<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Filtros/Búsqueda
  public search = signal<string>('');
  public filterRole = signal<string>('all');
  public filterCargo = signal<string>('all');
  public filterStatus = signal<string>('all');

  // Ordenamiento
  public sortColumn = signal<SortColumn>('name');
  public sortDirection = signal<SortDirection>('asc');

  // Modal CRUD (Crear/Editar)
  public isModalOpen = signal<boolean>(false);
  public selectedUser = signal<User | null>(null);

  // --- NUEVAS SEÑALES PARA MODAL DE ELIMINACIÓN/CONFIRMACIÓN ---
  public isConfirmDeleteModalOpen = signal<boolean>(false);
  public userToDelete = signal<User | null>(null);
  // -------------------------------------------------------------

  public totalUsers = computed(() => this.pagination().total);

  public roleCounts = computed<RoleCount[]>(() => {;
    return this.realRoleCounts();
  });


  ngOnInit(): void {
    this.loadCatalogs();

    this.filterTrigger.pipe(
      startWith(null),
      debounceTime(300),
      switchMap(() => {
        this.isLoading.set(true);
        this.error.set(null);

        const params = this.buildSearchParams();

        return this.userService.getUsers(params).pipe(
          tap((response: PaginatedResponse<User>) => {
            this.users.set(response.data);
            this.pagination.set(response.pagination);
            this.isLoading.set(false);
          }),
          catchError(err => {
            console.error('Error cargando usuarios:', err);
            this.error.set('Error al cargar la lista de usuarios. Intente recargar la página.');
            this.users.set([]);
            this.isLoading.set(false);
            return of({} as PaginatedResponse<User>);
          })
        );
      })
    ).subscribe();

    this.setupKeyboardShortcut();
  }

  loadCatalogs(): void {
    combineLatest([
      this.cargoService.getCargos(),
      this.roleService.getRoles(),
      this.roleService.getRoleCounts(),
    ])
      .pipe(
        tap(([cargos, roles, roleCounts]) => {
          this.cargos.set(cargos);
          this.roles.set(roles);
          this.realRoleCounts.set(roleCounts);
        }),
        catchError(err => {
          console.error('Error cargando catálogos/conteos:', err);
          this.error.set('Error al cargar los catálogos (Roles/Cargos) y conteos.');
          return of(null);
        })
      )
      .subscribe();
  }

  private buildSearchParams(): any {
    const roleId = this.filterRole() === 'all' ? undefined : parseInt(this.filterRole());
    const cargoId = this.filterCargo() === 'all' ? undefined : parseInt(this.filterCargo());
    const active = this.filterStatus() === 'all' ? undefined : this.filterStatus() === 'true';
    const search = this.search() === '' ? undefined : this.search();

    return {
      page: this.pagination().page,
      limit: this.pagination().limit,
      search: search,
      role_id: roleId,
      cargo_id: cargoId,
      active: active,
      sortBy: this.sortColumn(),
      order: this.sortDirection(),
    };
  }

  handleSearchOnEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.applyFilters();
    }
  }

  setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        const searchInput = document.getElementById('search-user-input');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }
    });
  }

  applyFilters(): void {
    this.filterTrigger.next();
  }

  handleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      const newDirection = this.sortDirection() === 'asc' ? 'desc' : 'asc';
      this.sortDirection.set(newDirection);
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.pagination.update(pag => ({ ...pag, page: 1 }));
    this.applyFilters();
  }

  goToPage(page: number): void {
    const totalPages = this.pagination().totalPages;
    if (page >= 1 && page <= totalPages) {
      this.pagination.update(pag => ({ ...pag, page }));
      this.applyFilters();
    }
  }

  nextPage(): void {
    this.goToPage(this.pagination().page + 1);
  }

  prevPage(): void {
    this.goToPage(this.pagination().page - 1);
  }

  getAuditUserName(userId: number | null): User | undefined {
    return this.users().find(u => u.id === userId);
  }

  openCreateModal(): void {
    this.selectedUser.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(user: User): void {
    this.selectedUser.set(user);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedUser.set(null);
  }

  // MODIFICACIÓN CLAVE PARA REDIRECCIÓN
  handleUserSaved(event: { success: boolean; message: string; data?: User }): void {
    // 1. Verificar si era creación (no había usuario seleccionado al abrir el modal)
    const wasCreating = this.selectedUser() === null;

    this.closeModal();

    if (event.success) {
      console.log('Usuario guardado:', event.message);

      // 2. Si fue creación y tenemos el objeto data (con el ID), redirigimos
      if (wasCreating && event.data && event.data.id) {
          console.log('Redirigiendo a permisos del usuario:', event.data.id);
          // Timeout pequeño para dar tiempo visual
          setTimeout(() => {
              this.router.navigate(['/admin/permisos'], {
                  queryParams: { userId: event.data!.id }
              });
          }, 150);
      } else {
          // Si fue edición, comportamiento normal (refrescar tabla)
          this.pagination.update(pag => ({ ...pag, page: 1 }));
          this.applyFilters();
      }
    } else {
      console.error('Error al guardar usuario:', event.message);
    }
  }

  deleteUser(user: User): void {
    this.userToDelete.set(user);
    this.isConfirmDeleteModalOpen.set(true);
  }

  closeDeleteConfirmation(): void {
    this.isConfirmDeleteModalOpen.set(false);
    this.userToDelete.set(null);
  }

  performDeleteAction(): void {
    const user = this.userToDelete();
    this.closeDeleteConfirmation();

    if (!user) {
      console.error("No hay usuario seleccionado para eliminar.");
      return;
    }

    this.userService
      .deleteUser(user.id)
      .pipe(
        tap((response: ApiResponse<void>) => {
          console.log('Usuario eliminado:', response.message);
          this.applyFilters();
        }),
        catchError(err => {
          console.error('Error al eliminar usuario:', err);
          this.error.set(`Error al eliminar ${user.first_name}.`);
          return of(null);
        })
      )
      .subscribe();
  }


  viewUserDetails(user: User): void {
    console.log('Ver detalles de usuario:', user);
  }

  managePermissions(user: User): void {
    // Navega a la ruta de permisos enviando el ID como parámetro
    this.router.navigate(['/admin/permisos'], { queryParams: { userId: user.id } });
  }
}
