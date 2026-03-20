import type { AttachedFile } from "./FileUploadZone";

export interface HistoryEntry {
  id: string;
  action: string;
  user: string;
  date: Date;
}

export interface Demanda {
  id: number;
  col: string;
  title: string;
  description?: string;
  city: string;
  priority: string;
  responsible: string;
  attachments: AttachedFile[];
  history: HistoryEntry[];
}
