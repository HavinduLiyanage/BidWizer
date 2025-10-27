import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TenderWorkspaceSurface } from "@/components/tender-workspace/TenderWorkspaceSurface";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function TenderWorkspacePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const tenderId = params.id;

  const tender = await db.tender.findUnique({
    where: { id: tenderId },
    select: {
      id: true,
      title: true,
      status: true,
      reference: true,
      deadline: true,
      estimatedValue: true,
      organizationId: true,
      organization: {
        select: { name: true },
      },
    },
  });

  if (!tender) {
    notFound();
  }

  if (
    tender.organizationId &&
    session.user.organizationId &&
    tender.organizationId !== session.user.organizationId
  ) {
    redirect("/dashboard");
  }

  const canUpload = session.user.organizationType === "PUBLISHER";

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <div className="border-b border-gray-200 bg-white/90 px-6 py-3 backdrop-blur">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <main className="flex-1 overflow-hidden">
        <TenderWorkspaceSurface
          tenderId={tenderId}
          tenderTitle={tender.title}
          tenderStatus={tender.status}
          tenderReference={tender.reference}
          tenderDeadline={tender.deadline?.toISOString() ?? null}
          tenderEstimatedValue={tender.estimatedValue}
          organizationName={tender.organization?.name}
          canUpload={canUpload}
        />
      </main>
    </div>
  );
}
