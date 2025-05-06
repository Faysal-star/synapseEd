import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket =
      searchParams.get("bucket") ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      files;
    const path = searchParams.get("path");
    const expiresIn = parseInt(searchParams.get("expiresIn") || "3153600000"); // Default 100 years
    const download = searchParams.get("download") === "false";

    if (!path) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    // Generate signed URL
    const { data } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn, {
        download,
      });

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      path: data.path,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL", details: error.message },
      { status: 500 }
    );
  }
}
