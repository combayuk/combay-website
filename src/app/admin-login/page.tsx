import type { Metadata } from "next";
import LoginScreen from "@/components/auth/LoginScreen";

export const metadata: Metadata = { title: "Admin Login — Combay" };

export default function AdminLoginPage() {
  return <LoginScreen mode="admin" showPreviewAccounts={process.env.MOCK_AUTH_ENABLED === "true"} />;
}
