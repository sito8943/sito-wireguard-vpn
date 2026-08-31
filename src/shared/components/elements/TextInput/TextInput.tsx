import { TextInputPropsType } from "./types";

import "@/styles/components/TextInput.css";

/** @sito/ui 0.3.3 no trae primitiva de texto: esta es la de la app (§14.1). */
export function TextInput({ className, ...props }: TextInputPropsType) {
  return <input className={`TextInput ${className ?? ""}`} {...props} />;
}
