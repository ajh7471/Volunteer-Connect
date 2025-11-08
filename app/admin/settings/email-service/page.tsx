"use client"

import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  saveSendGridConfig,
  saveGmailConfig,
  validateSendGridConfig,
  validateGmailConfig,
  getEmailServiceConfigs,
  deleteEmailServiceConfig,
} from "@/app/admin/email-service-actions"
import { AlertCircle, CheckCircle2, Mail, Settings, Trash2 } from "lucide-react"

async function EmailServiceConfigurations() {
  const configs = await getEmailServiceConfigs()
  const sendgridConfig = configs.find((c) => c.service_name === "sendgrid")
  const gmailConfig = configs.find((c) => c.service_name === "gmail")

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

      {/* Configuration Forms */}
      <Tabs defaultValue="sendgrid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
          <TabsTrigger value="gmail">Gmail OAuth</TabsTrigger>
        </TabsList>

        {/* SendGrid Configuration */}
        <TabsContent value="sendgrid">
          <Card>
            <CardHeader>
              <CardTitle>SendGrid Configuration</CardTitle>
              <CardDescription>
                Configure SendGrid API for sending emails. Get your API key from{" "}
                <a
                  href="https://app.sendgrid.com/settings/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  SendGrid Dashboard
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData: FormData) => {
                  "use server"
                  const result = await saveSendGridConfig({
                    apiKey: formData.get("apiKey") as string,
                    fromEmail: formData.get("fromEmail") as string,
                    fromName: formData.get("fromName") as string,
                    isActive: formData.get("isActive") === "on",
                    priority: 1,
                  })
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="sendgrid-api-key">API Key</Label>
                  <Input
                    id="sendgrid-api-key"
                    name="apiKey"
                    type="password"
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxxx"
                    defaultValue={sendgridConfig?.sendgrid_api_key || ""}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sendgrid-from-email">From Email</Label>
                  <Input
                    id="sendgrid-from-email"
                    name="fromEmail"
                    type="email"
                    placeholder="volunteer@vanderpumpdogs.org"
                    defaultValue={sendgridConfig?.sendgrid_from_email || ""}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sendgrid-from-name">From Name</Label>
                  <Input
                    id="sendgrid-from-name"
                    name="fromName"
                    type="text"
                    placeholder="Vanderpump Dogs Foundation"
                    defaultValue={sendgridConfig?.sendgrid_from_name || ""}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="sendgrid-active" name="isActive" defaultChecked={sendgridConfig?.is_active || false} />
                  <Label htmlFor="sendgrid-active">Enable SendGrid</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Save Configuration</Button>
                  {sendgridConfig && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          await validateSendGridConfig(sendgridConfig.id)
                        }}
                      >
                        Validate & Test
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={async () => {
                          await deleteEmailServiceConfig(sendgridConfig.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {sendgridConfig?.validation_error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{sendgridConfig.validation_error}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gmail OAuth Configuration */}
        <TabsContent value="gmail">
          <Card>
            <CardHeader>
              <CardTitle>Gmail OAuth Configuration</CardTitle>
              <CardDescription>
                Configure Gmail for sending emails using OAuth 2.0. Follow the{" "}
                <a
                  href="https://developers.google.com/gmail/api/guides/sending"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Gmail API setup guide
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData: FormData) => {
                  "use server"
                  await saveGmailConfig({
                    clientId: formData.get("clientId") as string,
                    clientSecret: formData.get("clientSecret") as string,
                    refreshToken: formData.get("refreshToken") as string,
                    fromEmail: formData.get("fromEmail") as string,
                    isActive: formData.get("isActive") === "on",
                    priority: 2,
                  })
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="gmail-client-id">OAuth Client ID</Label>
                  <Input
                    id="gmail-client-id"
                    name="clientId"
                    placeholder="xxxxx.apps.googleusercontent.com"
                    defaultValue={gmailConfig?.gmail_client_id || ""}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gmail-client-secret">OAuth Client Secret</Label>
                  <Input
                    id="gmail-client-secret"
                    name="clientSecret"
                    type="password"
                    placeholder="GOCSPX-xxxxxxxxxxxxx"
                    defaultValue={gmailConfig?.gmail_client_secret || ""}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gmail-refresh-token">Refresh Token</Label>
                  <Input
                    id="gmail-refresh-token"
                    name="refreshToken"
                    type="password"
                    placeholder="1//xxxxxxxxxxxxx"
                    defaultValue={gmailConfig?.gmail_refresh_token || ""}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gmail-from-email">From Email (Gmail Address)</Label>
                  <Input
                    id="gmail-from-email"
                    name="fromEmail"
                    type="email"
                    placeholder="volunteer@vanderpumpdogs.org"
                    defaultValue={gmailConfig?.gmail_from_email || ""}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="gmail-active" name="isActive" defaultChecked={gmailConfig?.is_active || false} />
                  <Label htmlFor="gmail-active">Enable Gmail</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Save Configuration</Button>
                  {gmailConfig && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          await validateGmailConfig(gmailConfig.id)
                        }}
                      >
                        Validate & Test
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={async () => {
                          await deleteEmailServiceConfig(gmailConfig.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {gmailConfig?.validation_error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{gmailConfig.validation_error}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
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
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Service Configuration</h1>
        <p className="text-muted-foreground">
          Configure and manage email service providers for sending volunteer communications
        </p>
      </div>

      <Suspense fallback={<div>Loading configurations...</div>}>
        <EmailServiceConfigurations />
      </Suspense>
    </div>
  )
}
