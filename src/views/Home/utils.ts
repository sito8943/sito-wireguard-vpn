export function fileStem(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.conf$/, "");
}
