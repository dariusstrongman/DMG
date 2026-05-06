import { redirect } from "next/navigation";

// No marketing landing — DMG is private. Send everyone straight to the
// dashboard; middleware will bounce unauthenticated visitors to /login.
export default function RootPage() {
  redirect("/dashboard");
}
