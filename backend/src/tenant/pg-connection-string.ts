// Small helper for building a sibling connection string (same host/port/credentials, different
// database name) — needed for provisioning (T-024, creates a new physical database) and the
// admin/maintenance connection that has to target `postgres`, not skeleton itself.
export function withDatabaseName(connectionString: string, databaseName: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function getDatabaseName(connectionString: string): string {
  return new URL(connectionString).pathname.replace(/^\//, '');
}
