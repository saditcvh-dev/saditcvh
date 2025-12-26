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
}