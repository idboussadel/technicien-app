// Common interfaces for the application

export interface Ferme {
  id: number;
  nom: string;
  nbr_meuble: number;
}

export interface Personnel {
  id: number;
  nom: string;
  telephone: string | null;
}

// Bande interfaces for the new structure
export interface Bande {
  id: number | null;
  date_entree: string;
  ferme_id: number;
  notes: string | null;
}

export interface CreateBande {
  date_entree: string;
  ferme_id: number;
  notes: string | null;
}

export interface UpdateBande {
  id: number;
  date_entree: string;
  ferme_id: number;
  notes: string | null;
}

// Batiment interfaces
export interface Batiment {
  id: number | null;
  bande_id: number;
  numero_batiment: string;
  type_poussin: string;
  personnel_id: number;
  quantite: number;
}

export interface CreateBatiment {
  bande_id: number;
  numero_batiment: string;
  type_poussin: string;
  personnel_id: number;
  quantite: number;
}

export interface UpdateBatiment {
  id: number;
  bande_id: number;
  numero_batiment: string;
  type_poussin: string;
  personnel_id: number;
  quantite: number;
}

export interface BatimentWithDetails {
  id: number | null;
  bande_id: number;
  numero_batiment: string;
  type_poussin: string;
  personnel_id: number;
  personnel_nom: string;
  quantite: number;
}

export interface BandeWithDetails {
  id: number | null;
  date_entree: string;
  ferme_id: number;
  ferme_nom: string;
  notes: string | null;
  batiments: BatimentWithDetails[];
}

// Legacy interfaces for backward compatibility (will be removed)
export interface OldCreateBande {
  date_entree: string;
  quantite: number;
  ferme_id: number;
  numero_batiment: string;
  type_poussin: string;
  personnel_id: number;
  notes: string | null;
}

// Ferme interfaces
export interface CreateFerme {
  nom: string;
  nbr_meuble: number;
}

export interface UpdateFerme {
  id: number;
  nom: string;
  nbr_meuble: number;
}
