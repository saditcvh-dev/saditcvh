
import { Municipio, UserTerritory } from "./user.model";

export interface MunicipioResponse {
  success: boolean;
  data: UserTerritory | UserTerritory[];
  message?: string;
}

export interface MunicipioFilters {
  nombre?: string;
  page?: number;
  limit?: number;
}