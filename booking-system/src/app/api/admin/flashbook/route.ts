import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const includeUnavailable = request.nextUrl.searchParams.get('all') === 'true';

  let query = supabase.from('flash_designs').select('*').order('created_at', { ascending: false });
  
  if (!includeUnavailable) {
    query = query.eq('is_available', true);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ flash_designs: data });
}

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const { title, description, price, size, body_placement_suggestion, image_url, tags } = body;

    if (!title || !image_url) {
      return Response.json({ error: 'Title and image_url are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('flash_designs')
      .insert([
        { 
          title, 
          description, 
          price, 
          size, 
          body_placement_suggestion, 
          image_url, 
          tags,
          is_available: true
        }
      ])
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ flash_design: data }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
