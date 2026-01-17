import { Component, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { AuditService } from '../../../../core/services/audit.service';
import { RoleService } from '../../../../core/services/role.service'; // Inyectamos RoleService
import { AuditLog, AuditLogSummary, AuditParams } from '../../../../core/models/audit.model';
import { Role } from '../../../../core/models/user.model';
import { Pagination } from '../../../../core/models/paginated-response.model';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  templateUrl: './auditoria.view.html',
})
export class AuditoriaView implements OnInit {
  private auditService = inject(AuditService);
  private roleService = inject(RoleService);
  private cdr = inject(ChangeDetectorRef);

  public logs: AuditLogSummary[] = [];
  public roles = signal<Role[]>([]); // Señal para roles
  public pagination: Pagination = { total: 0, page: 1, limit: 15, totalPages: 0 };
  public isLoading = false;
  
  public filters: AuditParams = {
    page: 1,
    limit: 15,
    module: 'ALL',
    search: '',
    startDate: '',
    endDate: '',
    roleId: 'ALL',
    sort: 'DESC'
  };

  public selectedLog: AuditLog | null = null;
  public isModalOpen = false;

  ngOnInit(): void {
    this.loadRoles();
    this.loadLogs();
  }

  private loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: (err) => console.error('Error cargando roles', err)
    });
  }

  public loadLogs(): void {
    this.isLoading = true;
    this.auditService.getLogs(this.filters)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.logs = response.data;
          this.pagination = response.pagination;
        },
        error: (err) => console.error('Error cargando bitácora', err)
      });
  }

  public onSearch(): void {
    this.filters.page = 1;
    this.loadLogs();
  }

  public changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.pagination.totalPages) {
      this.filters.page = newPage;
      this.loadLogs();
    }
  }

  // Nueva lógica de iniciales solicitada
  public getInitials(user: any): string {
    if (!user) return 'AN';
    const first = user.first_name?.charAt(0) || user.username?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  public openDetail(logSummary: AuditLogSummary): void {
    this.isLoading = true;
    this.auditService.getLogById(logSummary.id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (fullLog) => {
          this.selectedLog = fullLog;
          console.log(fullLog);
          this.isModalOpen = true;
        }
      });
  }

  public closeDetail(): void {
    this.isModalOpen = false;
    this.selectedLog = null;
  }
}