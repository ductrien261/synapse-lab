import { LessonPlanningStudio } from '@/components/spaces/LessonPlanningStudio';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}

export default async function SpaceRoomPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { name } = await searchParams;
  return <LessonPlanningStudio roomCode={code} roomName={name} />;
}
