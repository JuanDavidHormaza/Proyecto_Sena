/*=========================================================
=                Palabra del diccionario                  =
=========================================================*/

export interface DictionaryWord {
  id: string | number;

  word_id: string;

  subject: string;

  subject_name?: string;

  definition: string;

  synonyms: string;

  image: string;

  audio: string;

  video: string;
}

/*=========================================================
=             Crear palabra del diccionario              =
=========================================================*/

export interface CreateDictionaryWord {
  word_id: string;

  subject: string;

  definition: string;

  synonyms: string;

  image?: string;

  audio?: string;

  video?: string;
}

/*=========================================================
=              Actualizar palabra                        =
=========================================================*/

export interface UpdateDictionaryWord {
  word_id?: string;

  subject?: string;

  definition?: string;

  synonyms?: string;

  image?: string;

  audio?: string;

  video?: string;
}

/*=========================================================
=             Carpeta del diccionario                    =
=========================================================*/

export interface DictionaryGroup {

  subject: string;

  subject_name: string;

  totalWords: number;

  totalImages: number;

  totalAudios: number;

  totalVideos: number;

  previewImage?: string;

  description?: string;

}
