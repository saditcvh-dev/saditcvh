import { Role as AuthRole } from "./auth.model";

// NUEVA INTERFAZ PARA EL CONTEO DE USUARIOS POR ROL
export interface RoleCount {
    roleId: number;
    roleName: string;
    count: number;
}
// NUEVA INTERFAZ: Modelo simplificado para los campos de Auditoría (creator/editor)
export interface UserAuditMini {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

// Interfaz para Cargo
export interface Cargo {
  id: number;
  nombre: string;
}

// Interfaz para Role
export interface Role {
  id: number;
  name: string; // 'administrador', 'operador', etc.
}

// Interfaz para Permission
export interface Permission {
  id: number;
  name: string; // 'ver', 'editar', 'imprimir', etc.
  description?: string;
}

// Interfaz para Municipio
export interface Municipio {
  id: number;
  num: number;
  nombre: string;
}

// Representa la relación que viene en "municipality_access"
export interface MunicipalityAccess {
  id: number;
  user_id: number;
  municipio_id: number;
  permission_id: number;
  is_exception: boolean;
  permission?: Permission;
  municipio?: Municipio;
}

// Interfaz extendida para Usuario
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  second_last_name: string | null;
  email: string;
  phone: string | null;
  active: boolean;

  // Relaciones
  cargo_id: number | null; // ID del cargo
  cargo?: Cargo;          // Objeto Cargo
  roles: Role[];          // Array de objetos Role


  municipality_access?: MunicipalityAccess[];

  // Auditoría (Actualizado basado en el log)
  created_by: number | null; // El ID sigue viniendo, lo mantenemos por seguridad.
  updated_by: number | null; // El ID sigue viniendo, lo mantenemos por seguridad.
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Objetos de Auditoría (CONFIRMADO POR LOG)
  creator: UserAuditMini | null; // <-- OBJETO COMPLETO
  editor: UserAuditMini | null; // <-- OBJETO COMPLETO


  // Propiedades opcionales para el formulario de Creación/Edición
  password?: string;
  roleIds?: number[];
  municipios?: number[];
}

// Interfaz para la data de Creación/Actualización (Payload al Backend)
export interface UserPayload {
  username?: string;
  first_name: string;
  last_name: string;
  second_last_name?: string | null;
  email: string;
  password?: string;
  phone?: string | null;
  active?: boolean;
  cargo_id?: number | null;
  roles?: number[]; // IDs de los roles
  municipios?: number[]; // IDs de los municipios
}
