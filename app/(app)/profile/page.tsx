import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Account
            <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"}>
              {user?.role === "ADMIN" ? "Admin" : "Student"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Member since {user?.createdAt.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultName={user?.name ?? ""}
            email={user?.email ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
