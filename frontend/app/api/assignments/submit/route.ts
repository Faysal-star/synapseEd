import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

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

    if (!profile || profile.role !== "student") {
      return NextResponse.json({ error: "Only students can submit assignments" }, { status: 403 });
    }

    const { assignmentId, fileUrl } = await request.json();

    if (!assignmentId || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Check if student has already submitted
    const existingSubmission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        userId: profile.id,
      },
    });

    if (existingSubmission) {
      return NextResponse.json({ error: "You have already submitted this assignment" }, { status: 400 });
    }

    // Create submission in database
    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        userId: profile.id,
        fileUrl,
      },
      include: {
        assignment: true,
        user: true,
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error("Error submitting assignment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 