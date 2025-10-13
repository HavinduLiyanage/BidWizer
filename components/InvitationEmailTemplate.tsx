import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InvitationEmailTemplateProps {
  inviterName: string;
  companyName: string;
  position: string;
  inviteLink: string;
}

export function InvitationEmailTemplate({ 
  inviterName, 
  companyName, 
  position, 
  inviteLink 
}: InvitationEmailTemplateProps) {
  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Email Header */}
      <div className="bg-blue-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">BidWizer</h1>
            <p className="text-blue-100">Tender Management Platform</p>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          You're Invited to Join {companyName}
        </h2>
        
        <p className="text-gray-600 mb-6">
          Hi there,
        </p>
        
        <p className="text-gray-600 mb-6">
          <strong>{inviterName}</strong> has invited you to join <strong>{companyName}</strong> on BidWizer as a <strong>{position}</strong>.
        </p>
        
        <p className="text-gray-600 mb-6">
          BidWizer is a powerful tender management platform that helps teams collaborate on bidding opportunities. 
          You'll be able to work together on tender submissions, track progress, and access AI-powered tools to improve your success rate.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">What you'll get access to:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Collaborate on tender submissions with your team</li>
            <li>• Access AI-powered bid writing assistance</li>
            <li>• Track tender deadlines and requirements</li>
            <li>• Share documents and communicate with team members</li>
            <li>• Monitor bidding success rates and analytics</li>
          </ul>
        </div>

        <div className="text-center mb-6">
          <Button 
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
          >
            <a href={inviteLink}>
              Accept Invitation & Create Account
            </a>
          </Button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          This invitation will expire in 7 days. If you don't want to join this workspace, you can safely ignore this email.
        </p>

        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500">
            If you're having trouble with the button above, copy and paste this URL into your web browser:
          </p>
          <p className="text-sm text-blue-600 break-all mt-1">
            {inviteLink}
          </p>
        </div>
      </div>

      {/* Email Footer */}
      <div className="bg-gray-50 p-6 rounded-b-lg border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            This email was sent by BidWizer
          </p>
          <p className="text-xs text-gray-500">
            If you have any questions, contact our support team at{" "}
            <a href="mailto:support@bidwizer.com" className="text-blue-600 hover:underline">
              support@bidwizer.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
