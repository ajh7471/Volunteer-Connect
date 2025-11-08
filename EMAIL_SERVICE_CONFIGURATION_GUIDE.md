# Email Service Configuration Guide

## Overview
The Volunteer Connect application supports two email service providers:
1. **SendGrid** - Commercial email API service
2. **Gmail OAuth** - Send emails using Gmail with OAuth 2.0 authentication

## Features
- Secure credential storage in Supabase
- Service validation and testing
- Priority-based fallback system
- Admin-only configuration access
- Usage tracking and monitoring

## SendGrid Configuration

### Prerequisites
- SendGrid account (free tier available)
- Verified sender email address
- API key with "Mail Send" permissions

### Setup Steps

1. **Create SendGrid Account**
   - Visit https://sendgrid.com
   - Sign up for a free account
   - Complete email verification

2. **Verify Sender Email**
   - Go to Settings > Sender Authentication
   - Verify volunteer@vanderpumpdogs.org
   - Complete domain verification (recommended for production)

3. **Generate API Key**
   - Navigate to Settings > API Keys
   - Click "Create API Key"
   - Name: "Volunteer Connect Production"
   - Permissions: Select "Mail Send" (Full Access)
   - Copy the API key (shown only once)

4. **Configure in Application**
   - Login as admin
   - Navigate to Admin > Settings > Email Service
   - Select "SendGrid" tab
   - Enter:
     - API Key: (paste from step 3)
     - From Email: volunteer@vanderpumpdogs.org
     - From Name: Vanderpump Dogs Foundation
   - Toggle "Enable SendGrid" to ON
   - Click "Save Configuration"

5. **Validate Configuration**
   - Click "Validate & Test" button
   - System will send test email to verify
   - Check for validation success badge

### SendGrid Best Practices
- Use dedicated API key per environment (dev/staging/prod)
- Enable IP access management for production keys
- Monitor sending reputation in SendGrid dashboard
- Set up webhook for delivery tracking (advanced)

## Gmail OAuth Configuration

### Prerequisites
- Google account with Gmail
- Access to Google Cloud Console
- volunteer@vanderpumpdogs.org Gmail account

### Setup Steps

1. **Create Google Cloud Project**
   - Visit https://console.cloud.google.com
   - Create new project: "Volunteer Connect Email"
   - Note the Project ID

2. **Enable Gmail API**
   - In Cloud Console, go to "APIs & Services"
   - Click "Enable APIs and Services"
   - Search for "Gmail API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Desktop app"
   - Name: "Volunteer Connect Email Service"
   - Click "Create"
   - Copy Client ID and Client Secret

4. **Generate Refresh Token**
   
   **Using OAuth 2.0 Playground:**
   - Visit https://developers.google.com/oauthplayground
   - Click settings icon (top right)
   - Check "Use your own OAuth credentials"
   - Enter Client ID and Client Secret
   - Select scope: `https://www.googleapis.com/auth/gmail.send`
   - Click "Authorize APIs"
   - Login with volunteer@vanderpumpdogs.org
   - Click "Exchange authorization code for tokens"
   - Copy the Refresh Token

   **Alternative: Using CLI Script:**
   \`\`\`bash
   # Install Google Auth Library
   npm install googleapis
   
   # Run OAuth flow (script provided in repository)
   node scripts/get-gmail-token.js
   \`\`\`

5. **Configure in Application**
   - Login as admin
   - Navigate to Admin > Settings > Email Service
   - Select "Gmail OAuth" tab
   - Enter:
     - OAuth Client ID: (from step 3)
     - OAuth Client Secret: (from step 3)
     - Refresh Token: (from step 4)
     - From Email: volunteer@vanderpumpdogs.org
   - Toggle "Enable Gmail" to ON
   - Click "Save Configuration"

6. **Validate Configuration**
   - Click "Validate & Test" button
   - System will refresh access token
   - Check for validation success badge

### Gmail OAuth Best Practices
- Use service account for production (more secure)
- Refresh access token automatically (handled by system)
- Monitor token expiry and validation status
- Keep Client Secret secure (never commit to git)

## Service Priority & Fallback

### How It Works
1. System checks for active, validated services
2. Uses service with lowest priority number (1 = highest priority)
3. If sending fails, automatically tries next service
4. Logs all attempts and failures

### Recommended Configuration
- **Primary**: SendGrid (Priority 1)
  - More reliable for bulk emails
  - Better delivery tracking
  - Higher rate limits
  
- **Fallback**: Gmail (Priority 2)
  - Backup for SendGrid failures
  - Use for low-volume periods
  - Subject to Gmail sending limits (500/day)

### Adjusting Priorities
- Lower number = higher priority
- Set in configuration form
- Can have both active simultaneously
- System auto-fails-over without admin intervention

## Security Considerations

### Credential Storage
- All credentials stored encrypted in Supabase
- Row Level Security enforces admin-only access
- Environment variables not used (allows runtime config)
- Credentials never exposed to client-side code

### Access Control
- Only users with `role='admin'` can view/edit
- Server actions verify admin role on every request
- Configuration changes logged with user ID
- Validation errors don't expose credential details

### OAuth Token Management
- Access tokens refreshed automatically
- Refresh tokens stored securely
- Token expiry tracked in database
- Failed refreshes trigger re-validation

## Monitoring & Usage

### Email Tracking
- All sent emails logged to `email_logs` table
- Track success/failure rates per service
- Monitor delivery status (if webhooks configured)
- View sending history in Admin > Emails

### Service Health
- Validation status visible in dashboard
- Last validated timestamp shown
- Error messages for failed validations
- Usage counts tracked per service

### Alerts & Notifications
- Failed validations shown in UI
- High failure rates trigger warnings
- Automatic fallback reduces downtime
- Manual re-validation available anytime

## Troubleshooting

### SendGrid Issues

**Problem: Validation fails with "Unauthorized"**
- Solution: Regenerate API key with correct permissions
- Verify API key hasn't expired or been revoked

**Problem: Emails not delivered**
- Check SendGrid activity feed for bounce/block reasons
- Verify sender email is authenticated
- Check spam folder (sender reputation issue)

**Problem: Rate limit exceeded**
- Upgrade SendGrid plan for higher limits
- Implement sending queue (future feature)
- Use Gmail as fallback

### Gmail OAuth Issues

**Problem: Invalid grant error**
- Solution: Refresh token may have expired
- Re-run OAuth flow to get new refresh token
- Check if user revoked app access

**Problem: Access denied**
- Ensure Gmail API is enabled in Cloud Console
- Verify OAuth scope includes `gmail.send`
- Check if 2FA is blocking app access

**Problem: 500 email/day limit reached**
- Use SendGrid as primary service
- Consider Google Workspace (higher limits)
- Implement rate limiting in application

### General Issues

**Problem: Neither service working**
- Check internet connectivity
- Verify Supabase connection
- Review server logs for detailed errors
- Manually test credentials outside app

**Problem: Fallback not working**
- Ensure both services have different priorities
- Verify both services are marked as active
- Check that at least one service is validated

## Production Deployment Checklist

- [ ] SendGrid account created and verified
- [ ] Sender domain authenticated (SPF/DKIM)
- [ ] Production API key generated
- [ ] Gmail OAuth credentials created
- [ ] Refresh token obtained and validated
- [ ] Both services configured in application
- [ ] Priority set correctly (SendGrid=1, Gmail=2)
- [ ] Test emails sent successfully
- [ ] Validation badges show green
- [ ] Email templates reviewed and tested
- [ ] Admin team trained on configuration
- [ ] Monitoring dashboard reviewed
- [ ] Backup credentials stored securely (password manager)

## Support Resources

- **SendGrid Documentation**: https://docs.sendgrid.com
- **Gmail API Guide**: https://developers.google.com/gmail/api
- **OAuth 2.0 Playground**: https://developers.google.com/oauthplayground
- **Application Support**: Contact development team

## Next Steps

After configuration:
1. Test individual email sending
2. Test mass email campaigns
3. Verify email templates work correctly
4. Monitor delivery rates for first week
5. Adjust priorities based on performance
6. Set up advanced monitoring (if needed)
