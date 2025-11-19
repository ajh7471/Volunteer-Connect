"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2 } from 'lucide-react'
import { handleSaveSendGridConfig, handleValidateSendGrid, handleDeleteConfig } from "./actions"
import { useTransition } from "react"
import { useRouter } from 'next/navigation'

type SendGridConfig = {
  id: string
  sendgrid_api_key: string
  sendgrid_from_email: string
  sendgrid_from_name: string
  is_active: boolean
  validation_error: string | null
}

export function SendGridForm({ config }: { config?: SendGridConfig }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(() => {
      handleSaveSendGridConfig(formData).then(() => {
        router.refresh()
      })
    })
  }

  return (
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sendgrid-api-key">API Key</Label>
            <Input
              id="sendgrid-api-key"
              name="apiKey"
              type="password"
              placeholder="SG.xxxxxxxxxxxxxxxxxxxxx"
              defaultValue={config?.sendgrid_api_key || ""}
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
              defaultValue={config?.sendgrid_from_email || ""}
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
              defaultValue={config?.sendgrid_from_name || ""}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="sendgrid-active" name="isActive" defaultChecked={config?.is_active || false} />
            <Label htmlFor="sendgrid-active">Enable SendGrid</Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Configuration"}
            </Button>
            {config && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await handleValidateSendGrid(config.id)
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

export default SendGridForm
