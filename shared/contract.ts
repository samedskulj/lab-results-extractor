// Types shared by server and browser. Keep this file free of Node imports.

export interface Health {
  /** True when the server has credentials for the AI service. */
  live: boolean;
}

export interface ApiErrorBody {
  error: string;
  /** "ai_unavailable" means the AI service failed or is out of capacity; trying again later may work. */
  code?: "ai_unavailable" | "signed_out";
}
