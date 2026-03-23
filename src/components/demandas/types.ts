import type { AttachedFile } from "./FileUploadZone";

export interface HistoryEntry {
  id: string;
  action: string;
  user: string;
  date: Date;
}

export interface DemandaComment {
  id: string;
  demanda_id: string;
  author: string;
  text: string;
  source: string;
  created_at: string;
}

export interface Demanda {
  id: string;
  col: string;
  title: string;
  description?: string;
  city: string;
  priority: string;
  responsible: string;
  origin: string;
  creator_chat_id?: number | null;
  creator_name?: string | null;
  order_index: number;
  attachments_count: number;
  attachments: AttachedFile[];
  history: HistoryEntry[];
  created_at?: string;
}
