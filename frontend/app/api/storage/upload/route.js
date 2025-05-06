import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(request) {
  try {
    // Create a Supabase client for server-side operations
    const supabase = await createClient();

    // Check if the user is authenticated
    const user = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const bucket =
      formData.get("bucket") || process.env.SUPABASE_STORAGE_BUCKET || files;
    const path = formData.get("path") || "";
    const fileName = formData.get("fileName") || file.name;
    const contentType = formData.get("contentType") || file.type;
    const upsert = formData.get("upsert") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create a buffer from the file
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload the file to Supabase storage
    const { data } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path + fileName, buffer, {
        contentType,
        upsert,
      });

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      path: data.path,
      publicUrl,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}
