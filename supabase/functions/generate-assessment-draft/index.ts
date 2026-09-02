import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { createGenerateAssessmentDraftHandler } from './handler.ts';
import { resolveModel, resolveTimeoutMs } from './config.ts';
import { generateAssessmentDraftWithProvider } from './provider.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
// La función debe arrancar aunque falte la clave del proveedor: en ese caso cada
// solicitud responde `ai_not_configured` en lugar de dejar la función caída.
const apiKey = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
const model = resolveModel(Deno.env.get('DEEPSEEK_MODEL'));
const timeoutMs = resolveTimeoutMs(Deno.env.get('AI_GENERATION_TIMEOUT_MS'));
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!supabaseUrl || !anonKey || allowedOrigins.length === 0) {
  throw new Error('Faltan variables obligatorias para generate-assessment-draft.');
}

const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

const handler = createGenerateAssessmentDraftHandler({
  allowedOrigins,
  async verifyUser(token) {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, appMetadata: data.user.app_metadata };
  },
  generate(input) {
    return generateAssessmentDraftWithProvider(input, { apiKey, model, timeoutMs });
  },
});

Deno.serve(handler);
