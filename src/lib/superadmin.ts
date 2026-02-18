const defaultSuperAdminEmail = "afiliadosprobusiness@gmail.com";

export function getSuperAdminEmail(configuredEmail: string | undefined = import.meta.env.VITE_SUPERADMIN_EMAIL): string {
  return configuredEmail?.trim().toLowerCase() || defaultSuperAdminEmail;
}

export function isSuperAdminEmail(
  email?: string | null,
  configuredEmail: string | undefined = import.meta.env.VITE_SUPERADMIN_EMAIL,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getSuperAdminEmail(configuredEmail);
}

export function getPostAuthRoute(
  email?: string | null,
  configuredEmail: string | undefined = import.meta.env.VITE_SUPERADMIN_EMAIL,
): "/superadmin" | "/dashboard" {
  return isSuperAdminEmail(email, configuredEmail) ? "/superadmin" : "/dashboard";
}
