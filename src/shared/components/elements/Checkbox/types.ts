import type { InputHTMLAttributes, ReactNode } from "react";

export type CheckboxPropsType = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: ReactNode;
  /** Texto de apoyo bajo la etiqueta. */
  hint?: ReactNode;
};
