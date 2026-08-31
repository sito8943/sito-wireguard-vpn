import { CheckboxPropsType } from "./types";

import "@/styles/components/Checkbox.css";

/** @sito/ui 0.3.3 no trae casilla: esta es la primitiva de la app (§14.1). */
export function Checkbox({
  label,
  hint,
  className,
  ...props
}: CheckboxPropsType) {
  return (
    <label className={`Checkbox ${className ?? ""}`}>
      <input type="checkbox" {...props} />
      <span className="text">
        <span className="label">{label}</span>
        {hint ? <span className="hint">{hint}</span> : null}
      </span>
    </label>
  );
}
