// =======================================================================
// mediaService.ts
// Gestiona los archivos multimedia (imagen/audio/video) almacenados en
// MinIO a través de la API del backend (/api/media/).
//
// Jerarquía de navegación (dos formas, mismo dato):
//   - Normal:  Programa -> Ficha -> Tipo de medio
//   - Inversa: Tipo de medio -> Programa -> Ficha
//
// Reemplaza por completo al antiguo cliente de Supabase Storage.
// =======================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export type MediaType = "image" | "audio" | "video";

export interface MediaAsset {
  id: number;
  media_type: MediaType;
  program: string;
  ficha: string;
  word_id: string;
  definition: string;
  synonyms: string;
  subject: string | null;
  subject_name: string | null;
  bucket: string;
  object_key: string;
  url: string;
  original_filename: string;
  size_bytes: number;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface FichaNode {
  ficha: string;
  images: number;
  audios: number;
  videos: number;
  total: number;
}

export interface ProgramNode {
  program: string;
  fichas: FichaNode[];
}

export interface InverseFichaNode {
  ficha: string;
  count: number;
}

export interface InverseProgramNode {
  program: string;
  fichas: InverseFichaNode[];
}

export type InverseTree = Record<MediaType, InverseProgramNode[]>;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Lista archivos, opcionalmente filtrados por programa/ficha/tipo. */
export async function listMedia(filters: {
  program?: string;
  ficha?: string;
  media_type?: MediaType;
} = {}): Promise<MediaAsset[]> {
  const params = new URLSearchParams();
  if (filters.program) params.set("program", filters.program);
  if (filters.ficha) params.set("ficha", filters.ficha);
  if (filters.media_type) params.set("media_type", filters.media_type);

  const qs = params.toString();
  const response = await fetch(`${API_URL}/media/${qs ? `?${qs}` : ""}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("No fue posible obtener los archivos multimedia.");
  }
  return response.json();
}

/** Árbol NORMAL: Programa -> Ficha -> Tipo de medio (con conteos). */
export async function getMediaTree(): Promise<ProgramNode[]> {
  const response = await fetch(`${API_URL}/media/tree/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("No fue posible obtener el árbol de multimedia.");
  }
  return response.json();
}

/** Árbol INVERSO: Tipo de medio -> Programa -> Ficha (con conteos). */
export async function getMediaTreeByType(): Promise<InverseTree> {
  const response = await fetch(`${API_URL}/media/tree-by-type/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("No fue posible obtener el árbol inverso de multimedia.");
  }
  return response.json();
}

/** Sube un archivo a MinIO, organizado por programa/ficha/tipo. */
export async function uploadMedia(params: {
  file: File;
  mediaType: MediaType;
  program: string;
  ficha?: string;
  wordId?: string;
  definition?: string;
  synonyms?: string;
  subjectId?: string;
}): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("media_type", params.mediaType);
  formData.append("program", params.program);
  if (params.ficha) formData.append("ficha", params.ficha);
  if (params.wordId) formData.append("word_id", params.wordId);
  if (params.definition) formData.append("definition", params.definition);
  if (params.synonyms) formData.append("synonyms", params.synonyms);
  if (params.subjectId) formData.append("subject", params.subjectId);

  const response = await fetch(`${API_URL}/media/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "No fue posible subir el archivo.");
  }
  return response.json();
}

/** Elimina un archivo (registro en BD + objeto en MinIO). */
export async function deleteMedia(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/media/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("No fue posible eliminar el archivo.");
  }
}
