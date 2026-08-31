import { TextAreaPropsType } from "./types";

import "@/styles/components/TextArea.css";

/** @sito/ui 0.3.3 no trae primitiva de texto: esta es la de la app (§14.1). */
export function TextArea({ className, ...props }: TextAreaPropsType) {
  return <textarea className={`TextArea ${className ?? ""}`} {...props} />;
}
