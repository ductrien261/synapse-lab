import type { AlgorithmLessonBlock } from '@/lib/algorithm-api';

export function lessonImageUrl(block: AlgorithmLessonBlock): string {
  const imageUrl = block.image_url || block.image;
  return imageUrl.startsWith('https://') || imageUrl.startsWith('/lesson-assets/') ? imageUrl : '';
}
