"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/services/action-state";
import { idleActionState } from "@/lib/services/action-state";

const control =
  "mt-1 w-full min-h-11 border border-line bg-paper px-3 text-base text-ink dark:border-line-dark dark:bg-ink dark:text-paper";

export function TextField({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: "text" | "tel" | "date" | "number" | "email" | "password";
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted dark:text-faint">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        minLength={minLength}
        className={control}
      />
    </label>
  );
}

export function AreaField({
  label,
  name,
  defaultValue = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted dark:text-faint">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className={`${control} py-2`}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted dark:text-faint">{label}</span>
      <select name={name} defaultValue={defaultValue} className={control}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-danger dark:text-danger-soft">{message}</p>;
}

export function SubmitButton({
  pending,
  children,
  tone = "primary",
  pendingLabel = "Salvando.",
}: {
  pending: boolean;
  children: string;
  tone?: "primary" | "plain";
  pendingLabel?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-accent text-ink-soft hover:bg-accent-dark"
      : "border border-ink text-ink dark:border-paper dark:text-paper";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 items-center px-4 text-base transition-colors duration-300 disabled:opacity-60 ${toneClass}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function useFormAction(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
) {
  return useActionState(action, idleActionState);
}

export function useStatefulFormAction<T>(
  action: (prev: T, formData: FormData) => Promise<T>,
  initial: T,
) {
  return useActionState<T, FormData>(
    action as (state: T, payload: FormData) => Promise<T>,
    initial as Awaited<T>,
  );
}
