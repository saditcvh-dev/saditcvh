import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { User, Role, Cargo, RoleCount } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { RoleService } from '../../../../core/services/role.service';
import { CargoService } from '../../../../core/services/cargo.service';
import { combineLatest, of, Subject, switchMap, debounceTime, tap, startWith } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { Pagination, PaginatedResponse } from '../../../../core/models/paginated-response.model';
import { Router } from "@angular/router";

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

  // Modal de eliminación
  public isConfirmDeleteModalOpen = signal<boolean>(false);
  public userToDelete = signal<User | null>(null);

  public totalUsers = computed(() => this.pagination().total);
  public roleCounts = computed<RoleCount[]>(() => this.realRoleCounts());

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
            this.error.set('Error al cargar la lista de usuarios.');
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
          console.error('Error cargando catálogos:', err);
          this.error.set('Error al cargar catálogos y conteos.');
          return of(null);
        })
      )
      .subscribe();
  }

  private buildSearchParams(): any {
    const roleId = this.filterRole() === 'all' ? undefined : parseInt(this.filterRole());
    const cargoId = this.filterCargo() === 'all' ? undefined : parseInt(this.filterCargo());
    const active = this.filterStatus() === 'all' ? undefined : this.filterStatus() === 'true';

    return {
      page: this.pagination().page,
      limit: this.pagination().limit,
      search: this.search() || undefined,
      role_id: roleId,
      cargo_id: cargoId,
      active: active,
      sortBy: this.sortColumn(),
      order: this.sortDirection(),
    };
  }

  handleSearchOnEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.applyFilters();
  }

  setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        document.getElementById('search-user-input')?.focus();
      }
    });
  }

  applyFilters(): void {
    this.filterTrigger.next();
  }

  handleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.pagination.update(pag => ({ ...pag, page: 1 }));
    this.applyFilters();
  }

  goToPage(page: number): void {
    const totalPages = this.pagination().totalPages || 1;
    if (page >= 1 && page <= totalPages) {
      this.pagination.update(pag => ({ ...pag, page }));
      this.applyFilters();
    }
  }

  nextPage(): void { this.goToPage((this.pagination().page || 1) + 1); }
  prevPage(): void { this.goToPage((this.pagination().page || 1) - 1); }

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

  /**
   * LÓGICA DE GUARDADO CON REDIRECCIÓN INTELIGENTE
   */
  handleUserSaved(event: { success: boolean; message: string; data?: User }): void {
    const wasCreating = this.selectedUser() === null;
    this.closeModal();

    if (event.success && event.data) {
      const user = event.data;
      //console.log('Usuario procesado:', event.message);

      // 1. Caso: Usuario nuevo que NO es Administrador (Fase 5)
      const isNewNonAdmin = wasCreating && !user.roles?.some(r => r.id === 1);

      // 2. Caso: Edición donde el usuario dejó de ser Admin (Flag del Backend)
      const needsDowngradeRedirect = !wasCreating && user.requires_permission_check;

      if (isNewNonAdmin || needsDowngradeRedirect) {
        if (needsDowngradeRedirect) {
          console.warn('El usuario ha dejado de ser Administrador. Redirigiendo a matriz territorial.');
        }
        this.redirectToMatrix(user.id);
      } else {
        // Para Admins nuevos o ediciones normales, solo refrescamos
        this.refreshTable();
      }
    } else if (!event.success) {
      console.error('Error al guardar usuario:', event.message);
    }
  }

  private refreshTable(): void {
    this.pagination.update(pag => ({ ...pag, page: 1 }));
    this.applyFilters();
  }

  private redirectToMatrix(userId: number): void {
    setTimeout(() => {
      this.router.navigate(['/admin/permisos'], { queryParams: { userId } });
    }, 150);
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
    if (!user) return;

    this.userService.deleteUser(user.id).pipe(
      tap(() => {
        this.applyFilters();
        this.loadCatalogs(); // Recargar conteos por rol
      }),
      catchError(err => {
        console.error('Error al eliminar usuario:', err);
        this.error.set(`Error al eliminar a ${user.first_name}.`);
        return of(null);
      })
    ).subscribe();
  }

  managePermissions(user: User): void {
    this.router.navigate(['/admin/permisos'], { queryParams: { userId: user.id } });
  }
}
