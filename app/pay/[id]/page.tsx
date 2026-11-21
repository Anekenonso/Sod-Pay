import { PayView } from "./PayView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayPage({ params }: PageProps) {
  const { id } = await params;
  return <PayView id={id} />;
}
