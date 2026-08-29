import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <UserPlus className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sign-up is disabled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is an internal support system. Accounts are created by an
          administrator — please reach out to your admin to request access.
        </p>
      </div>
      <Link href="/login" className="block">
        <Button className="w-full">Go to login</Button>
      </Link>
    </div>
  );
}
