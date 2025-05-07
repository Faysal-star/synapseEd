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

    const profile = await prisma.profile.findUnique({
      where: { email: user.email },
    });

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch courses where the user is a teacher
    const courses = await prisma.course.findMany({
      where: {
        teachers: {
          some: {
            id: profile.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        isStarred: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching teacher courses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 