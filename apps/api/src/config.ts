// Config tipada desde env (SPEC §8.4). Sin librería: proceso single-user.

export interface AppConfig {
  mongoUri: string;
  apiKey: string;
  port: number;
  rucLastDigit: number;
}

export function loadConfig(): AppConfig {
  const mongoUri = process.env.MONGODB_URI ?? '';
  const apiKey = process.env.API_KEY ?? '';
  if (!mongoUri) throw new Error('MONGODB_URI es requerido');
  if (!apiKey) throw new Error('API_KEY es requerido');
  return {
    mongoUri,
    apiKey,
    port: Number(process.env.PORT ?? 3001),
    rucLastDigit: Number(process.env.RUC_LAST_DIGIT ?? 0),
  };
}
