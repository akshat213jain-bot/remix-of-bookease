import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const professionalEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>BookEase Notification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your appointment has been confirmed - View details inside
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 12px; margin-bottom: 16px;">
                      <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">📅 BookEase</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <span style="font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 2px;">Appointment Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status badge -->
          <tr>
            <td align="center" style="padding: 0;">
              <div style="display: inline-block; background-color: #10B981; color: #ffffff; padding: 10px 28px; border-radius: 0 0 12px 12px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ✓ Confirmed
              </div>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #1e293b; font-weight: 500;">
                Hi <span style="color: #3B82F6;">John</span>,
              </p>
              
              <!-- Title -->
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                Your Appointment is Confirmed
              </h1>
              
              <!-- Message -->
              <p style="margin: 0 0 32px 0; font-size: 16px; color: #475569; line-height: 1.7;">
                Great news! Your appointment with Dr. Sarah Johnson has been confirmed. Please arrive 10 minutes early and bring any relevant documents.
              </p>
              
              <!-- Appointment details card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Appointment Details</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 16px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" style="vertical-align: top; padding-right: 12px;">
                                <div style="width: 40px; height: 40px; background-color: #EFF6FF; border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">📅</div>
                              </td>
                              <td style="vertical-align: top;">
                                <p style="margin: 0; font-size: 14px; color: #64748b;">Date & Time</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; color: #1e293b; font-weight: 600;">January 25, 2025 at 10:00 AM</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 16px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" style="vertical-align: top; padding-right: 12px;">
                                <div style="width: 40px; height: 40px; background-color: #F0FDF4; border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">👨‍⚕️</div>
                              </td>
                              <td style="vertical-align: top;">
                                <p style="margin: 0; font-size: 14px; color: #64748b;">Provider</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; color: #1e293b; font-weight: 600;">Dr. Sarah Johnson</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 16px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" style="vertical-align: top; padding-right: 12px;">
                                <div style="width: 40px; height: 40px; background-color: #FEF3C7; border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">📍</div>
                              </td>
                              <td style="vertical-align: top;">
                                <p style="margin: 0; font-size: 14px; color: #64748b;">Location</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; color: #1e293b; font-weight: 600;">123 Medical Center, Suite 456</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                      View Appointment Details
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Secondary action -->
              <p style="margin: 24px 0 0 0; text-align: center; font-size: 14px; color: #64748b;">
                Need to reschedule? <a href="#" style="color: #3B82F6; text-decoration: underline;">Contact us here</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <span style="font-size: 20px; font-weight: 600; color: #1e293b;">📅 BookEase</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                      This is an automated message from BookEase.<br>
                      Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                      © 2025 BookEase. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`;

const passwordResetTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #EF4444 0%, #F97316 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 12px;">
                <span style="font-size: 24px; font-weight: 700; color: #ffffff;">🔐 Password Reset</span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #1e293b;">
                Hi <span style="font-weight: 600; color: #EF4444;">John</span>,
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; color: #475569; line-height: 1.7;">
                We received a request to reset your password. Use the verification code below to continue:
              </p>
              
              <!-- OTP Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #cbd5e1; padding: 24px 48px; border-radius: 16px;">
                      <span style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #0f172a; font-family: 'Courier New', monospace;">847291</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Timer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; background-color: #FEF3C7; padding: 12px 24px; border-radius: 8px;">
                      <span style="font-size: 14px; color: #92400E;">⏱️ This code expires in <strong>15 minutes</strong></span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Security notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF2F2; border-radius: 12px; border-left: 4px solid #EF4444;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #991B1B; line-height: 1.6;">
                      <strong>🛡️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; text-align: center; font-size: 13px; color: #64748b;">
                © 2025 BookEase. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const EmailTemplatePreview = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Email Templates Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="notification" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notification">Appointment Notification</TabsTrigger>
            <TabsTrigger value="password">Password Reset</TabsTrigger>
          </TabsList>
          
          <TabsContent value="notification" className="mt-4">
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <iframe
                srcDoc={professionalEmailTemplate}
                className="w-full h-[700px] border-0"
                title="Notification Email Preview"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="password" className="mt-4">
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <iframe
                srcDoc={passwordResetTemplate}
                className="w-full h-[600px] border-0"
                title="Password Reset Email Preview"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
