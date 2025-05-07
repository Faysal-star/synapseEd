import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isStarred: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 