import * as dotenv from "dotenv"
import { z } from "zod"

import { cipherSchema, dbSchema, envSchema, redisSchema } from "./validator.zod"

dotenv.config()

export type EnvSchema = z.infer<typeof envSchema>
export type DatabaseSchema = z.infer<typeof dbSchema>
export type CipherSchema = z.infer<typeof cipherSchema>
export type RedisSchema = z.infer<typeof redisSchema>

export const ENV = envSchema.parse({
  APP_MODE: process.env.NODE_ENV ?? process.env.NEXT_PUBLIC_APP_MODE,
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  API_URL: process.env.NEXT_PUBLIC_API_URL,
  TZ: process.env.NEXT_PUBLIC_APP_TZ
})

export const DB = dbSchema.parse({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  name: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
})

export const CIPHER = cipherSchema.parse({
  algorithm: process.env.CIPHER_ALGO,
  secret: process.env.CIPHER_SECRET,
  iv: process.env.CIPHER_IV,
  salt: process.env.CIPHER_SALT
})

export const REDIS = redisSchema.parse({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
})

export const DATABASE_URL = `postgresql://${DB.user}:${DB.password}@${DB.host}:${DB.port}/${DB.name}`
