import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getEmailServiceConfigs } from "@/app/admin/email-service-actions"
import { AlertCircle, CheckCircle2, Mail, Settings } from 'lucide-react'
import { SendGridForm } from "./sendgrid-form"
import { GmailForm } from "./gmail-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EmailServiceConfig {
  id: string
  service_name: "sendgrid" | "gmail"
  is_active: boolean
  is_validated?: boolean
  priority: number
  sendgrid_api_key?: string
  sendgrid_from_email?: string
  sendgrid_from_name?: string
  gmail_client_id?: string
  gmail_client_secret?: string
  gmail_refresh_token?: string
  gmail_from_email?: string
  validation_error?: string | null
  created_at?: string
  updated_at?: string
}

type SendGridConfig = {
  id: string
  sendgrid_api_key: string
  sendgrid_from_email: string
  sendgrid_from_name: string
  is_active: boolean
  validation_error: string | null
}

type GmailConfig = {
  id: string
  gmail_client_id: string
  gmail_client_secret: string
  gmail_refresh_token: string
  gmail_from_email: string
  is_active: boolean
  validation_error: string | null
}

function EmailServiceConfigurations({ configs }: { configs: EmailServiceConfig[] }) {
  const sendgridConfig = configs.find((c) => c.service_name === "sendgrid" && c.sendgrid_api_key) as SendGridConfig | undefined
  const gmailConfig = configs.find((c) => c.service_name === "gmail" && c.gmail_client_id) as GmailConfig | undefined

  return (
    <div className="space-y-6">
      {/* Current Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Email Service Status</CardTitle>
          <CardDescription>Active email services and their validation status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SendGrid Status */}
          {sendgridConfig && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" />
                <div>
                  <p className="font-medium">SendGrid</p>
                  <p className="text-sm text-muted-foreground">{sendgridConfig.sendgrid_from_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sendgridConfig.is_validated ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Validated
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not Validated
                  </Badge>
                )}
                {sendgridConfig.is_active && <Badge variant="outline">Active</Badge>}
                <Badge variant="secondary">Priority: {sendgridConfig.priority}</Badge>
                {sendgridConfig.validation_error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{sendgridConfig.validation_error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Gmail Status */}
          {gmailConfig && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" />
                <div>
                  <p className="font-medium">Gmail</p>
                  <p className="text-sm text-muted-foreground">{gmailConfig.gmail_from_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {gmailConfig.is_validated ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Validated
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not Validated
                  </Badge>
                )}
                {gmailConfig.is_active && <Badge variant="outline">Active</Badge>}
                <Badge variant="secondary">Priority: {gmailConfig.priority}</Badge>
                {gmailConfig.validation_error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{gmailConfig.validation_error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {!sendgridConfig && !gmailConfig && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No email services configured. Configure at least one service below to enable email sending.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="sendgrid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
          <TabsTrigger value="gmail">Gmail OAuth</TabsTrigger>
        </TabsList>

        <TabsContent value="sendgrid">
          <SendGridForm config={sendgridConfig} />
        </TabsContent>

        <TabsContent value="gmail">
          <GmailForm config={gmailConfig} />
        </TabsContent>
      </Tabs>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">SendGrid Setup</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create a SendGrid account at sendgrid.com</li>
              <li>Verify your sender email address</li>
              <li>Generate an API key with "Mail Send" permissions</li>
              <li>Enter the API key and sender details above</li>
              <li>Click "Validate & Test" to verify configuration</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">Gmail OAuth Setup</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to Google Cloud Console and create a project</li>
              <li>Enable the Gmail API</li>
              <li>Create OAuth 2.0 credentials (Desktop app)</li>
              <li>Use OAuth Playground to get a refresh token</li>
              <li>Enter the credentials above and validate</li>
            </ol>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Priority & Fallback:</strong> If multiple services are active, the system will use the service
              with the lowest priority number first. If that service fails, it will automatically fall back to the next
              available service.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function EmailServicePage() {
  const configs = await getEmailServiceConfigs()

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Service Configuration</h1>
        <p className="text-muted-foreground">
          Configure and manage email service providers for sending volunteer communications
        </p>
      </div>

      <EmailServiceConfigurations configs={configs} />
    </div>
  )
}
