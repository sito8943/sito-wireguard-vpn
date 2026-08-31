export interface SaveTunnelInput {
  name: string;
  content: string;
  /** Nombre anterior al editar; distinto de `name` = renombrado. */
  previousName?: string;
  manageDns: boolean;
  dns: string[];
}
