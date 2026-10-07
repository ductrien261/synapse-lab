'use client';

import { useParams } from 'next/navigation';
import { AlgorithmEditor } from '@/components/admin/algorithms/AlgorithmEditor';

export default function AdminAlgorithmEditorPage() {
  const { category, algo } = useParams<{ category: string; algo: string }>();
  return <AlgorithmEditor key={`${category}/${algo}`} category={category} algorithm={algo} />;
}
