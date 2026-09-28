import { LiveSpaceStudio } from '@/components/spaces/LiveSpaceStudio';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}

export default async function SpaceRoomPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { name } = await searchParams;
  return <LiveSpaceStudio roomCode={code} roomName={name} />;
}
