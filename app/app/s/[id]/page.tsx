import { SodDetailView } from "./SodDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SodDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SodDetailView id={id} />;
}
