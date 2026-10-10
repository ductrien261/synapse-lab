import { LiveSpaceStudio } from '@/components/spaces/LiveSpaceStudio';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function SpaceLiveRoomPage({ params }: Props) {
  const { code } = await params;
  return <LiveSpaceStudio roomCode={code} />;
}
