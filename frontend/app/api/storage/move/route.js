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
    const sourcePath = formData.get("source");
    const destinationBucket = formData.get("destinationBucket") || sourceBucket;
    const destinationPath = formData.get("destination");

    if (!sourcePath || !destinationPath) {
      return NextResponse.json(
        { error: "Source and destination paths are required" },
        { status: 400 }
      );
    }

    // First, copy the file to the destination
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(sourceBucket)
      .download(sourcePath);

    if (downloadError) {
      return NextResponse.json(
        { error: "Failed to download file", details: downloadError.message },
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
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // Delete the original file
    const { error: deleteError } = await supabaseAdmin.storage
      .from(sourceBucket)
      .remove([sourcePath]);

    if (deleteError) {
      return NextResponse.json(
        {
          error: "Failed to delete original file",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    // Get the public URL of the moved file
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from(destinationBucket)
      .getPublicUrl(destinationPath);

    return NextResponse.json({
      success: true,
      message: "File moved successfully",
      path: data.path,
      publicUrl,
    });
  } catch (error) {
    console.error("Error moving file:", error);
    return NextResponse.json(
      { error: "Failed to move file", details: error.message },
      { status: 500 }
    );
  }
}
