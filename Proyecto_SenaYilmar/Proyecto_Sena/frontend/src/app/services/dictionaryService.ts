import { uploadMediaFile } from "./api";
import {
  DictionaryWord,
  CreateDictionaryWord,
} from "../types/dictionary";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/*=========================================
=            Obtener palabras             =
=========================================*/

export async function getDictionaryWords(): Promise<DictionaryWord[]> {
  const response = await fetch(`${API_BASE}/dictionary/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Error obteniendo el diccionario");
  }

  return await response.json();
}

/*=========================================
=          Crear una palabra              =
=========================================*/

export async function createDictionaryWord(
  data: CreateDictionaryWord,
  imageFile?: File,
  audioFile?: File,
  videoFile?: File
) {
  let image = "";
  let audio = "";
  let video = "";

  // Subida a MinIO 100% interna a través del proxy de Django
  if (imageFile) {
    const res = await uploadMediaFile(imageFile, "dictionary-images");
    image = res.url || res.proxy_url;
  }

  if (audioFile) {
    const res = await uploadMediaFile(audioFile, "dictionary-audios");
    audio = res.url || res.proxy_url;
  }

  if (videoFile) {
    const res = await uploadMediaFile(videoFile, "dictionary-videos");
    video = res.url || res.proxy_url;
  }

  const response = await fetch(`${API_BASE}/dictionary/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...data,
      word_id: data.word_id || (data as any).word,
      image,
      audio,
      video,
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear la palabra en el diccionario.");
  }

  return await response.json();
}

/*=========================================
=          Actualizar palabra             =
=========================================*/

export async function updateDictionaryWord(
  id: number | string,
  data: Partial<CreateDictionaryWord>
) {
  const response = await fetch(`${API_BASE}/dictionary/${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar la palabra.");
  }

  return await response.json();
}

/*=========================================
=          Eliminar palabra               =
=========================================*/

export async function deleteDictionaryWord(id: number | string) {
  const response = await fetch(`${API_BASE}/dictionary/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("No se pudo eliminar la palabra.");
  }

  return true;
}