import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET(request) {
  try {
    // Create a Supabase client for server-side operations
    const supabase = await createClient();

    // Check if the user is authenticated
    const user = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucket =
      searchParams.get("bucket") ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      files;
    const path = searchParams.get("path") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const search = searchParams.get("search") || "";

    // List files in the bucket
    const { data } = await supabaseAdmin.storage.from(bucket).list(path, {
      limit,
      offset,
      sortBy: { column: sortBy, order: sortOrder },
    });

    // Filter files if search is provided
    let files = data;
    if (search) {
      files = data.filter((file) =>
        file.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Get public URLs for each file
    const filesWithUrls = files.map((file) => {
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(`${path}${file.name}`);

      return {
        ...file,
        publicUrl,
      };
    });

    return NextResponse.json({
      success: true,
      files: filesWithUrls,
      count: files.length,
      total: data.length,
    });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files", details: error.message },
      { status: 500 }
    );
  }
}
