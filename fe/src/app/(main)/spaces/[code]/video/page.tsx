import { LocalVideoRoom } from '@/components/spaces/LocalVideoRoom';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function SpaceVideoPage({ params }: Props) {
  const { code } = await params;
  return <LocalVideoRoom roomCode={code.toUpperCase()} />;
}
