import { redirect } from 'next/navigation'

// Login form is rendered on the home page ("/").
// This route exists to prevent 404s from navigation links.
export default function LoginPage() {
  redirect("/")
}
