"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/auth/login?callbackUrl=/admin");
      return;
    }
    if ((session.user as any)?.role !== "ADMIN") {
      router.replace("/portal");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 bg-navy-900 rounded mx-auto mb-3 flex items-center justify-center">
            <span className="text-accent font-display font-900 text-sm">C</span>
          </div>
          <p className="text-gray-400 text-sm font-display font-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== "ADMIN") return null;

  return <>{children}</>;
}
