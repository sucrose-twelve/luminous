import { z } from "zod"

export const envSchema = z.object({
  APP_MODE: z
    .union([z.literal("production"), z.literal("development")])
    .default("development"),
  APP_NAME: z.string().default("project_name"),
  APP_URL: z.string().default("http://www.example.com"),
  TZ: z.string().default("Asia/Singapore")
})

export const dbSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.string().default("5432"),
  name: z.string().default("postgres"),
  user: z.string().default("postgres"),
  password: z.string().default("password")
})

/**
 * AES-GCM settings for auth tokens.
 *
 * `secret` has no default on purpose: a missing or short secret must stop the app instead of silently signing
 * tokens with a known value.
 */
export const cipherSchema = z.object({
  algorithm: z.enum(["aes-128-gcm", "aes-192-gcm", "aes-256-gcm"]).default("aes-256-gcm"),
  secret: z.string().min(32),
  iv: z.coerce.number().int().min(12).max(16).default(12),
  salt: z.coerce.number().int().min(16).max(64).default(16)
})

export const redisSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.string().transform(Number).default(6379),
  username: z.string().default("default"),
  password: z.string().default("password")
})
