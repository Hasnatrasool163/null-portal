import { z } from "zod";

// Shared by the browser forms AND the API routes: one source of truth for validation.
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long")
    .regex(/[A-Za-z]/, "Password needs at least one letter")
    .regex(/\d/, "Password needs at least one number"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type Role = "ADMIN" | "USER";
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
