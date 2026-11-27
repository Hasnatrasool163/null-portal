import { z } from "zod";

export const idSchema = z.string().uuid("Invalid id");

/** 'YYYY-MM-DD' that is also a real calendar date. */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Not a valid date");
