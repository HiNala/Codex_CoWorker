import { redirect } from "next/navigation";

/** Home nav target is /dashboard — keep /home as redirect. */
export default function HomeRedirectPage() {
  redirect("/dashboard");
}
