import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createInviteHandler } from './handler.ts';

Deno.serve(createInviteHandler(createClient, (name) => Deno.env.get(name)));
