"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2 } from "lucide-react"
import { handleSaveGmailConfig, handleValidateGmail, handleDeleteConfig } from "./actions"

type GmailConfig = {
  id: string
  gmail_client_id: string
  gmail_client_secret: string
  gmail_refresh_token: string
  gmail_from_email: string
  is_active: boolean
  validation_error: string | null
}

export function GmailForm({ config }: { config?: GmailConfig }) {
  return (
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
        <form action={handleSaveGmailConfig} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gmail-client-id">OAuth Client ID</Label>
            <Input
              id="gmail-client-id"
              name="clientId"
              placeholder="xxxxx.apps.googleusercontent.com"
              defaultValue={config?.gmail_client_id || ""}
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
              defaultValue={config?.gmail_client_secret || ""}
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
              defaultValue={config?.gmail_refresh_token || ""}
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
              defaultValue={config?.gmail_from_email || ""}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="gmail-active" name="isActive" defaultChecked={config?.is_active || false} />
            <Label htmlFor="gmail-active">Enable Gmail</Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Save Configuration</Button>
            {config && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await handleValidateGmail(config.id)
                  }}
                >
                  Validate & Test
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={async () => {
                    await handleDeleteConfig(config.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {config?.validation_error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{config.validation_error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
