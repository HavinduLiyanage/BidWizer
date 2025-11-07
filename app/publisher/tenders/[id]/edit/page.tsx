"use client";

import TenderEditor from "../../_components/tender-editor";

interface EditTenderPageProps {
  params: {
    id: string;
  };
}

export default function EditTenderPage({ params }: EditTenderPageProps) {
  return <TenderEditor mode="edit" tenderId={params.id} />;
}
