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
    const download = searchParams.get("download") === "true";

    if (!path) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    // Get the file from Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch file", details: error.message },
        { status: 500 }
      );
    }

    // Get the file metadata
    const { data: metadata } = await supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    // Convert the file to a buffer
    const buffer = await data.arrayBuffer();

    // Set the appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", data.type || "application/octet-stream");
    headers.set("Content-Length", buffer.byteLength.toString());

    if (download) {
      // Set the Content-Disposition header to force download
      const fileName = path.split("/").pop();
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "Failed to download file", details: error.message },
      { status: 500 }
    );
  }
}
