export interface DictionaryWord {
  id?: number;

  word: string;

  definition: string;

  category: string;

  level: string;

  image?: string;

  audio?: string;

  video?: string;

  created_at?: string;

  updated_at?: string;
}

export interface CreateDictionaryWord {
  word: string;

  definition: string;

  category: string;

  level: string;

  image?: string;

  audio?: string;

  video?: string;
}

export interface UpdateDictionaryWord {
  word?: string;

  definition?: string;

  category?: string;

  level?: string;

  image?: string;

  audio?: string;

  video?: string;
}