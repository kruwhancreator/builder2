import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `ex3_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const bucketName = 'exercise-images';

    if (supabase) {
      // 1. Try to ensure bucket exists without crashing on RLS policy of buckets table
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === bucketName);

        if (!bucketExists) {
          await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880 // 5MB
          });
        }
      } catch (bucketErr) {
        // Ignored if RLS on buckets table prevents listing/creating buckets via anon key
        console.warn('Bucket verification warning (proceeding to direct upload):', bucketErr);
      }

      // 2. Upload file buffer to bucket
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: file.type || 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return NextResponse.json({
        success: true,
        fileName,
        publicUrl: publicUrlData.publicUrl
      });
    }

    return NextResponse.json({
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
    }, { status: 500 });
  } catch (err: any) {
    console.error('Upload image API error:', err);
    return NextResponse.json({ error: err.message || 'Error processing image upload' }, { status: 500 });
  }
}
