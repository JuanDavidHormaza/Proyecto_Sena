import {
  DictionaryWord,
  DictionaryGroup,
  CreateDictionaryWord,
  UpdateDictionaryWord,
} from "../../types/dictionary";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type DictionaryApiItem = Partial<DictionaryWord> & {
  id: string | number;
  name?: string;
  wordId?: string;
  subjectId?: string | null;
  subjectName?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  program?: string;
  ficha?: string;
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeDictionaryWord(item: DictionaryApiItem): DictionaryWord {
  const subject = item.subject ?? item.subjectId ?? "";

  return {
    id: item.id,
    word_id: item.word_id ?? item.wordId ?? item.name ?? "",
    subject,
    subject_name: item.subject_name ?? item.subjectName ?? subject,
    definition: item.definition ?? "",
    synonyms: item.synonyms ?? "",
    image: item.image ?? item.imageUrl ?? "",
    audio: item.audio ?? item.audioUrl ?? "",
    video: item.video ?? item.videoUrl ?? "",
  };
}

/*=========================================================
=            Obtener todas las palabras                  =
=========================================================*/

export async function getDictionaryWords(): Promise<DictionaryWord[]> {
  const response = await fetch(`${API_URL}/dictionary/`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("No fue posible obtener el diccionario.");
  }

  const data = await response.json();

  return data.map((item: DictionaryApiItem) =>
    normalizeDictionaryWord(item)
  );
}

/*=========================================================
=      Obtener palabras de una asignatura               =
=========================================================*/

export async function getDictionaryWordsBySubject(
  subject: string
): Promise<DictionaryWord[]> {

  const response = await fetch(
    `${API_URL}/dictionary/?subject=${subject}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("No fue posible obtener las palabras.");
  }

  const data = await response.json();

  return data.map((item: DictionaryApiItem) =>
    normalizeDictionaryWord(item)
  );
}

/*=========================================================
=      Agrupar diccionarios automáticamente             =
=========================================================*/

export async function getDictionaryGroups(): Promise<DictionaryGroup[]> {

  const words = await getDictionaryWords();

  const groups: Record<string, DictionaryGroup> = {};

  words.forEach((word) => {

    if (!groups[word.subject]) {

      groups[word.subject] = {

        subject: word.subject,

        subject_name: word.subject_name || word.subject,

        totalWords: 0,

        totalImages: 0,

        totalAudios: 0,

        totalVideos: 0,

        previewImage: "",

        description: "",

      };

    }

    groups[word.subject].totalWords++;

    if (word.image) {

      groups[word.subject].totalImages++;

      if (!groups[word.subject].previewImage) {

        groups[word.subject].previewImage = word.image;

      }

    }

    if (word.audio) {

      groups[word.subject].totalAudios++;

    }

    if (word.video) {

      groups[word.subject].totalVideos++;

    }

    if (word.definition && !groups[word.subject].description) {

      groups[word.subject].description = word.definition;

    }

  });

  return Object.values(groups);

}

/*=========================================================
=                Crear palabra                           =
=========================================================*/

export async function createDictionaryWord(
  data: CreateDictionaryWord
): Promise<DictionaryWord> {

  const response = await fetch(`${API_URL}/dictionary/`, {

    method: "POST",

    headers: {

      "Content-Type": "application/json",
      ...getAuthHeaders(),

    },

    body: JSON.stringify(data),

  });

  if (!response.ok) {

    throw new Error("No fue posible crear la palabra.");

  }

  return normalizeDictionaryWord(await response.json());

}

/*=========================================================
=              Actualizar palabra                        =
=========================================================*/

export async function updateDictionaryWord(
  id: string | number,
  data: UpdateDictionaryWord
): Promise<DictionaryWord> {

  const response = await fetch(`${API_URL}/dictionary/${id}/`, {

    method: "PUT",

    headers: {

      "Content-Type": "application/json",
      ...getAuthHeaders(),

    },

    body: JSON.stringify(data),

  });

  if (!response.ok) {

    throw new Error("No fue posible actualizar.");

  }

  return normalizeDictionaryWord(await response.json());

}

/*=========================================================
=               Eliminar palabra                         =
=========================================================*/

export async function deleteDictionaryWord(
  id: string | number
): Promise<void> {

  const response = await fetch(`${API_URL}/dictionary/${id}/`, {

    method: "DELETE",
    headers: getAuthHeaders(),

  });

  if (!response.ok) {

    throw new Error("No fue posible eliminar.");

  }

}

/*=========================================================
=          Obtener estadísticas generales               =
=========================================================*/

export async function getDictionaryStats() {

  const groups = await getDictionaryGroups();

  return {

    dictionaries: groups.length,

    words: groups.reduce(
      (sum, item) => sum + item.totalWords,
      0
    ),

    images: groups.reduce(
      (sum, item) => sum + item.totalImages,
      0
    ),

    audios: groups.reduce(
      (sum, item) => sum + item.totalAudios,
      0
    ),

    videos: groups.reduce(
      (sum, item) => sum + item.totalVideos,
      0
    ),

  };

}
