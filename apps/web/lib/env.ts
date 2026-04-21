export function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalServerEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}
