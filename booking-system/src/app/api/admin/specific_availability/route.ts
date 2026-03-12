import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('specific_availability')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    return Response.json({ data });
  } catch (err: any) {
    console.error('Fetch specific availability error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const { date, slots } = body;

    if (!date || !Array.isArray(slots)) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { error } = await supabase
      .from('specific_availability')
      .upsert({
        date: date,
        slots: slots
      }, { onConflict: 'date' });

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    console.error('Save specific availability error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const url = new URL(req.url);
    const date = url.searchParams.get('date');

    if (!date) {
      return Response.json({ error: 'Date required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('specific_availability')
      .delete()
      .eq('date', date);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    console.error('Delete specific availability error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
