// _shared/errors.ts
import { corsHeaders } from './cors.ts'

export function handleError(error: Error | any) {
  console.error("Function error:", error);
  return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred" }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 400,
  });
}
