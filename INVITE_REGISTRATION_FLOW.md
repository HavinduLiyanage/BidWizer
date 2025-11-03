# Invite Registration Flow Documentation

## Overview
This document describes the complete invite registration flow for BidWizer, where team members are invited to join a workspace after the main user completes the bidder registration process.

## Flow Steps

### 1. Main User Registration (Steps 1-3)
- **Step 1**: Main user (admin/manager) creates their account with company details
- **Step 2**: Company profile completion
- **Step 3**: Team member invitation
  - Main user adds team members with name, email, and position
  - System sends invitation emails to each team member
  - Team members are marked as "invited" status

### 2. Team Member Invitation Process
When a team member is added in Step 3:
1. **Email Sent**: Invitation email is sent to the team member's email address
2. **Email Content**: Includes:
   - Inviter's name and company
   - Position/role they're being invited for
   - Direct link to registration page with token
   - Information about BidWizer features
   - 7-day expiration notice

### 3. Team Member Registration
When team member clicks the invitation link:
1. **Invite Registration Page** (`/invite-register?token=xxx&email=xxx`)
   - Pre-filled email (disabled field)
   - Pre-filled name and position from invitation
   - Password creation
   - Password confirmation
   - Company and inviter information displayed

2. **Form Submission**:
   - Validates password strength (8+ characters)
   - Validates password confirmation match
   - Creates user account
   - Sends email verification

### 4. Email Verification
After registration:
1. **Verification Page** (`/verify-email?email=xxx&invite=true`)
   - Shows email verification instructions
   - Provides resend functionality with cooldown
   - Special messaging for invited users
   - Option to continue to login after verification

2. **Email Verification Process**:
   - User clicks verification link in email
   - Account is activated
   - User is redirected to login page

### 5. Login and Access
After email verification:
1. **Login Page** (`/login`)
   - User enters email and password
   - System authenticates and redirects to dashboard
   - User gains access to company workspace

## File Structure

### New Pages Created
- `app/(auth)/invite-register/page.tsx` - Team member registration page
- `app/(auth)/verify-email/page.tsx` - Email verification page
- `app/(marketing)/demo/invitation-email/page.tsx` - Demo of invitation email

### Modified Pages
- `app/(auth)/register/bidder/step3/page.tsx` - Updated to send invitations

### Components Created
- `components/InvitationEmailTemplate.tsx` - Email template component

## URL Structure

### Invitation Flow URLs
- `/invite-register?token=xxx&email=xxx` - Team member registration
- `/verify-email?email=xxx&invite=true` - Email verification (invited users)
- `/login?registered=true` - Login after successful registration

### Demo URLs
- `/demo/invitation-email` - Preview of invitation email template

## Key Features

### Security
- Invitation tokens for secure registration
- Email verification required
- Password strength validation
- 7-day invitation expiration

### User Experience
- Pre-filled information from invitation
- Clear step-by-step process
- Helpful error messages
- Resend functionality for emails
- Responsive design

### Admin Features
- Resend invitations from Step 3
- View invitation status
- Remove team members
- Plan-based seat limits

## Implementation Notes

### Backend Integration Points
The following would need backend API integration:
1. **Send Invitation Email**: POST `/api/invitations/send`
2. **Validate Invitation Token**: GET `/api/invitations/validate/:token`
3. **Register Invited User**: POST `/api/auth/register-invited`
4. **Resend Verification Email**: POST `/api/auth/resend-verification`
5. **Check Email Verification**: GET `/api/auth/verify-status/:email`

### Email Service Integration
- Email templates for invitations
- Email verification system
- Resend functionality with rate limiting

### Database Schema Considerations
- Invitation tokens table
- User invitation relationships
- Email verification tracking
- Team member status tracking

## Testing the Flow

### Manual Testing Steps
1. Complete bidder registration steps 1-2
2. In step 3, add a team member
3. Check console for invitation sending simulation
4. Visit `/invite-register?token=test&email=test@example.com`
5. Complete registration form
6. Visit `/verify-email?email=test@example.com&invite=true`
7. Test resend functionality
8. Complete flow by going to login page

### Demo Email Template
Visit `/demo/invitation-email` to see what the invitation email looks like.

## Future Enhancements

### Potential Improvements
1. **Real Email Integration**: Connect to email service (SendGrid, AWS SES, etc.)
2. **Backend API**: Implement actual backend endpoints
3. **Database Integration**: Store invitations and user data
4. **Advanced Security**: JWT tokens, rate limiting, CSRF protection
5. **Email Templates**: Rich HTML email templates
6. **Analytics**: Track invitation acceptance rates
7. **Bulk Invitations**: CSV upload for multiple team members
8. **Custom Roles**: Define specific permissions per team member

### Additional Features
- Invitation expiration notifications
- Team member onboarding flow
- Workspace access permissions
- Activity tracking for invited users
- Integration with existing user management
