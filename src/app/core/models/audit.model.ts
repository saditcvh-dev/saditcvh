// src/app/core/models/audit.model.ts
import { User } from './user.model';

// 1. Interfaz base con campos comunes
interface AuditLogBase {
  id: number;
  user_id: number | null;
  action: string;
  module: string;
  entity_id: string | null;
  ip_address: string;
  created_at: string;
}

// 2. Interfaz para la tabla (Ligera)
export interface AuditLogSummary extends AuditLogBase {
  user?: {
    username: string;
  };
}

// 3. Interfaz completa para el detalle (Modal)
export interface AuditLog extends AuditLogBase {
  user_agent: string;
  details: AuditDetails;
  user?: Partial<User> & { roles?: any[] };
}

export interface AuditDetails {
  device_detected?: string;
  display_name?: string;     // <-- Nombre del usuario afectado
  target_user?: string;      // <-- Para cambios de permisos
  municipality?: string;
  total_changes?: number;
  type?: string;
  changes?: {
    added?: string[];
    removed?: string[];
    [key: string]: any;
  };
  data?: any;                // <-- Para creación de usuarios
  [key: string]: any;
}

export interface AuditParams {
  page?: number;
  limit?: number;
  cursor?: number | null;
  module?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  roleId?: string | number;
  sort?: 'ASC' | 'DESC';
}
