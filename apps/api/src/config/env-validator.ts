import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number'),
  HOST: z.string().min(1, 'HOST is required'),
  NODE_ENV: z.enum(['development', 'production', 'test'], {
    errorMap: () => ({ message: 'NODE_ENV must be development, production, or test' }),
  }),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET must be at least 32 characters long')
    .refine(
      (val) => val !== 'local-dev-cron-secret-change-me' && val !== 'CHANGEME_GENERATE_WITH_COMMAND_ABOVE',
      {
        message:
          'CRON_SECRET must be changed from example value. Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
      }
    ),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long')
    .refine(
      (val) => val !== 'local-dev-jwt-secret' && val !== 'CHANGEME_GENERATE_WITH_COMMAND_ABOVE',
      {
        message:
          'JWT_SECRET must be changed from example value. Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
      }
    ),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(): ValidatedEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Environment variable validation failed:\n');
    const errors = result.error.flatten().fieldErrors;

    for (const [field, messages] of Object.entries(errors)) {
      console.error(`  • ${field}:`);
      for (const message of messages || []) {
        console.error(`    - ${message}`);
      }
    }

    console.error('\n💡 Check your .env file and ensure all required variables are set correctly.\n');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
  return result.data;
}
