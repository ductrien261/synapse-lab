// ============================================================
// SYNAPSE-LAB — Shared Types
// ============================================================

// --- Auth ---
export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// --- Algorithm ---
export interface AlgorithmCategory {
  key: string;
  name: string;
  algorithms: AlgorithmItem[];
}

export interface AlgorithmItem {
  key: string;
  name: string;
  description?: string;
  files?: AlgorithmFile[];
}

export interface AlgorithmFile {
  name: string;
  content: string;
}

// --- Anatomy ---
export interface AnatomySystem {
  id: string;
  slug: string;
  name_vi: string;
  name_en: string;
  iframe_url: string;
  sketchfab_model_id: string;
  part_count?: number;
}

export interface AnatomyPart {
  id: string;
  annotation_index: number;
  name_vi: string;
  name_en: string;
  name_latin?: string;
  definition: string;
  physiology: string;
  clinical_note: string;
  document_links?: DocumentLink[];
}

// --- Knowledge Documents ---
export interface KnowledgeDocument {
  id: string;
  title: string;
  doc_type: 'textbook' | 'paper' | 'video' | 'curriculum';
  external_url?: string;
  file_url?: string;
  author?: string;
}

export interface DocumentLink {
  document: KnowledgeDocument;
  page_start?: number;
  page_end?: number;
  section?: string;
  is_primary: boolean;
}

// --- Content Card (for browse lists) ---
export interface ContentCard {
  id: string;
  slug: string;
  category: 'cs' | 'med';
  code: string;
  credits: number;
  title: string;
  description: string;
  level: string;
  tags: string[];
  progress: number;
  completedTopics: number;
  totalTopics: number;
  thumbnailType: string;
  categoryLabel: string;
  complexity?: string;
  badgeText: string;
  statusBadge: string;
  actionText: string;
  actionType: 'primary' | 'outlined';
  unitLabel: string;
}
