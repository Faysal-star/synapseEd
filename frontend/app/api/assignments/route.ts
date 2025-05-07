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

    // Fetch all assignments with their details
    const assignments = await prisma.assignment.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        course: {
          select: {
            name: true
          }
        },
        createdBy: {
          select: {
            name: true
          }
        },
        submissions: {
          where: {
            userId: user.id
          },
          select: {
            id: true,
            submittedAt: true,
            fileUrl: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const { title, description, dueDate, courseId } = await request.json();

    // Validate input
    if (!title || !description || !dueDate || !courseId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        courseId: parseInt(courseId),
        createdById: profile.id,
      },
      include: {
        course: true,
        createdBy: true,
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 