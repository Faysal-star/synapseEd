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
    const sourceBucket =
      formData.get("sourceBucket") ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      files;
    const sourcePath = formData.get("sourcePath");
    const destinationBucket = formData.get("destinationBucket") || sourceBucket;
    const destinationPath = formData.get("destinationPath");

    if (!sourcePath || !destinationPath) {
      return NextResponse.json(
        { error: "Source and destination paths are required" },
        { status: 400 }
      );
    }

    // First, download the file from the source
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(sourceBucket)
      .download(sourcePath);

    if (downloadError) {
      return NextResponse.json(
        {
          error: "Failed to download file from source",
          details: downloadError.message,
        },
        { status: 500 }
      );
    }

    // Convert the file to a buffer
    const buffer = await fileData.arrayBuffer();

    // Upload the file to the destination
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(destinationBucket)
      .upload(destinationPath, buffer, {
        contentType: fileData.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error: "Failed to upload file to destination",
          details: uploadError.message,
        },
        { status: 500 }
      );
    }

    // Get the public URL of the copied file
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from(destinationBucket)
      .getPublicUrl(destinationPath);

    return NextResponse.json({
      success: true,
      message: "File copied successfully",
      path: data.path,
      publicUrl,
    });
  } catch (error) {
    console.error("Error copying file:", error);
    return NextResponse.json(
      { error: "Failed to copy file", details: error.message },
      { status: 500 }
    );
  }
}
