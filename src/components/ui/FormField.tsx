import { cn } from "@/lib/utils";
interface FormFieldProps { label: string; error?: string; children: React.ReactNode; hint?: string; }
export function FormField({ label, error, children, hint }: FormFieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
