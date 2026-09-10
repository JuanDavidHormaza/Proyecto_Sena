import {
  BookOpen,
  Image,
  Music,
  Video,
  Eye,
  Download,
  Plus,
  Trash2,
  Pencil,
  FileText,
} from "lucide-react";

import { DictionaryGroup } from "../../types/dictionary";
import { IconBadge } from "./ui/icon-badge";

interface Props {
  dictionary: DictionaryGroup;

  onOpen: (subject: string) => void;

  onDownload?: (subject: string) => void;

  onDelete?: (subject: string) => void;

  onEdit?: (subject: string) => void;

  onAddContent?: (subject: string) => void;

  /**
   * Modo solo lectura (estudiante): muestra únicamente el botón de
   * "Visualización" y oculta descargar/agregar/editar/eliminar.
   */
  readOnly?: boolean;

  /** Texto del botón principal (por defecto "Abrir"). */
  openLabel?: string;
}

export default function DictionaryFolderCard({
  dictionary,
  onOpen,
  onDownload,
  onDelete,
  onEdit,
  onAddContent,
  readOnly = false,
  openLabel = "Abrir",
}: Props) {
  const hasPreview = Boolean(dictionary.previewImage);

  return (
    <div
      className="surface-card overflow-hidden"
    >
      {hasPreview && (
        <div className="h-40 bg-muted overflow-hidden relative">
          <img
            src={dictionary.previewImage}
            alt={dictionary.subject_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-white font-semibold text-sm truncate">
              {dictionary.description || dictionary.subject_name}
            </p>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <IconBadge tone="green" size="md" className="flex-shrink-0">
            <BookOpen />
          </IconBadge>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {dictionary.subject_name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {dictionary.subject}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="bg-muted/60 rounded-2xl p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Palabras</p>
            <p className="text-lg font-bold text-foreground leading-none">
              {dictionary.totalWords}
            </p>
          </div>
          <div className="bg-muted/60 rounded-2xl p-2 text-center">
            <Image className="w-3.5 h-3.5 text-sena-blue mx-auto mb-0.5" />
            <p className="text-lg font-bold text-foreground leading-none">
              {dictionary.totalImages}
            </p>
          </div>
          <div className="bg-muted/60 rounded-2xl p-2 text-center">
            <Music className="w-3.5 h-3.5 text-sena-green mx-auto mb-0.5" />
            <p className="text-lg font-bold text-foreground leading-none">
              {dictionary.totalAudios}
            </p>
          </div>
          <div className="bg-muted/60 rounded-2xl p-2 text-center">
            <Video className="w-3.5 h-3.5 text-sena-blue-light mx-auto mb-0.5" />
            <p className="text-lg font-bold text-foreground leading-none">
              {dictionary.totalVideos}
            </p>
          </div>
        </div>

        {readOnly ? (
          <button
            onClick={() => onOpen(dictionary.subject)}
            className="w-full flex items-center justify-center gap-1.5 bg-sena-green text-white rounded-full py-2.5 text-sm font-medium hover:bg-sena-green-dark transition-colors"
          >
            <Eye className="w-4 h-4" />
            {openLabel}
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOpen(dictionary.subject)}
                className="flex items-center justify-center gap-1.5 bg-sena-green text-white rounded-full py-2.5 text-sm font-medium hover:bg-sena-green-dark transition-colors"
              >
                <Eye className="w-4 h-4" />
                {openLabel}
              </button>
              <button
                onClick={() => onDownload?.(dictionary.subject)}
                className="flex items-center justify-center gap-1.5 bg-sena-blue text-white rounded-full py-2.5 text-sm font-medium hover:bg-sena-blue-light transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={() => onAddContent?.(dictionary.subject)}
                className="flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-full py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
              <button
                onClick={() => onEdit?.(dictionary.subject)}
                className="flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-full py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors border border-border"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </button>
            </div>

            <button
              onClick={() => onDelete?.(dictionary.subject)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-destructive rounded-full py-2.5 text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
