import { cn } from "@/lib/utils";
import React from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

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

export function Input({ label, error, hint, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <input className={cn("input", className)} {...props} />
    </FormField>
  );
}

export function Textarea({ label, error, hint, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <textarea className={cn("input", className)} {...props} />
    </FormField>
  );
}

export function Select({ label, error, hint, options, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <select className={cn("input", className)} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}