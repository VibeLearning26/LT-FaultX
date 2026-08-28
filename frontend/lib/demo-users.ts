/**
 * DEV-ONLY demo accounts.
 *
 * ⚠️ Temporary mock. This will be replaced by the FastAPI backend where
 * passwords are stored hashed (bcrypt/argon2) and never live in source.
 * Do NOT use these credentials in production.
 */
export type Role = "USER" | "OPERATOR" | "ADMIN";

export interface DemoUser {
  email: string;
  password: string;
  role: Role;
  name: string;
  /** Landing route after login */
  home: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    email: "citizen@demo.local",
    password: "Demo@User123",
    role: "USER",
    name: "Demo Citizen",
    home: "/user",
  },
  {
    email: "operator@demo.local",
    password: "Demo@Operator123",
    role: "OPERATOR",
    name: "Demo Operator",
    home: "/operator",
  },
  {
    email: "admin@demo.local",
    password: "Demo@Admin123",
    role: "ADMIN",
    name: "Demo Administrator",
    home: "/admin/dashboard",
  },
];

export function findDemoUser(email: string, password: string): DemoUser | null {
  const match = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
  );
  return match ?? null;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "OPERATOR":
      return "/operator";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/user";
  }
}
