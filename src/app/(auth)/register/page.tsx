import { redirect } from "next/navigation";

// There is no public sign-up: accounts are created by an administrator.
export default function Page() {
  redirect("/login");
}
