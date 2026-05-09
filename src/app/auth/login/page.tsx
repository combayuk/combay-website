import LoginScreen from "@/components/auth/LoginScreen";

export default function LoginPage() {
  return <LoginScreen mode="generic" showPreviewAccounts={process.env.MOCK_AUTH_ENABLED === "true"} />;
}
