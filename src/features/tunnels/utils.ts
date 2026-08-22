import { CONF_FILE_SUFFIX } from "./constants";

export function fileStem(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.endsWith(CONF_FILE_SUFFIX)
    ? base.slice(0, -CONF_FILE_SUFFIX.length)
    : base;
}
