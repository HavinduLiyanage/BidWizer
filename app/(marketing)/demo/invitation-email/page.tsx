import { InvitationEmailTemplate } from "@/components/InvitationEmailTemplate";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function InvitationEmailDemoPage() {
  const mockInviteData = {
    inviterName: "Jane Smith",
    companyName: "ABC Construction Ltd",
    position: "Bid Specialist",
    inviteLink: "https://bidwizer.com/invite-register?token=abc123&email=john.doe@example.com"
  };

  return (
    <>
      <SiteHeader variant="page" />
      
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Invitation Email Preview
              </h1>
              <p className="text-gray-600">
                This is what team members receive when they're invited to join a workspace
              </p>
            </div>
            
            <InvitationEmailTemplate {...mockInviteData} />
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                This is a demo of the invitation email template. In production, this would be sent via email.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <SiteFooter />
    </>
  );
}
