type Props = { params: { id: string } };
export default function SessionWorkspace({ params }: Props) {
  return <div className="p-6">Session Workspace — {params.id}</div>;
}
