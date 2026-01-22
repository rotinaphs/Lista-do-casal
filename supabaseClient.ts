
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rujmhqrxmvaodxichoqu.supabase.co';
const supabaseKey = 'sb_publishable_OVhAcson_qfWP0Rqt2T_Jw_xlRVNzb3';

export const supabase = createClient(supabaseUrl, supabaseKey);
