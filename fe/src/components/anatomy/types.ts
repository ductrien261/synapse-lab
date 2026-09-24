import type { StructureInfo } from '@/lib/anatomy-catalog';

export interface PartItem {
  index: number;
  /** Tên trên Sketchfab (thường tiếng Anh) */
  label: string;
  /** Mô tả gốc tác giả mô hình ghi trên Sketchfab */
  rawContent: string;
  structure: StructureInfo | null;
}

export function partName(p: PartItem): string {
  return p.structure?.name_vi || p.label;
}
