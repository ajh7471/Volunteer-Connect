"use server"

import {
  saveSendGridConfig,
  saveGmailConfig,
  deleteEmailServiceConfig,
  validateSendGridConfig,
  validateGmailConfig,
} from "@/app/admin/email-service-actions"
import { revalidatePath } from "next/cache"

export async function handleSaveSendGridConfig(formData: FormData) {
  const result = await saveSendGridConfig({
    apiKey: formData.get("apiKey") as string,
    fromEmail: formData.get("fromEmail") as string,
    fromName: formData.get("fromName") as string,
    isActive: formData.get("isActive") === "on",
    priority: 1,
  })

  revalidatePath("/admin/settings/email-service")
  return result
}

export async function handleSaveGmailConfig(formData: FormData) {
  const result = await saveGmailConfig({
    clientId: formData.get("clientId") as string,
    clientSecret: formData.get("clientSecret") as string,
    refreshToken: formData.get("refreshToken") as string,
    fromEmail: formData.get("fromEmail") as string,
    isActive: formData.get("isActive") === "on",
    priority: 2,
  })

  revalidatePath("/admin/settings/email-service")
  return result
}

export async function handleValidateSendGrid(configId: string) {
  const result = await validateSendGridConfig(configId)
  revalidatePath("/admin/settings/email-service")
  return result
}

export async function handleValidateGmail(configId: string) {
  const result = await validateGmailConfig(configId)
  revalidatePath("/admin/settings/email-service")
  return result
}

export async function handleDeleteConfig(configId: string) {
  const result = await deleteEmailServiceConfig(configId)
  revalidatePath("/admin/settings/email-service")
  return result
}
