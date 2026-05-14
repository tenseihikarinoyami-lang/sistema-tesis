import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const doc = await adminDb.collection("projects").doc(projectId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      success: true,
      data: {
        title: data?.title,
        university: data?.university,
        formData: data?.formData || {},
        research: data?.research || {},
        drafts: data?.drafts || {},
        audits: data?.audits || {},
        content: data?.content || {},
        steps: data?.steps || {},
        sections: data?.sections || [],
        plan: data?.plan || "",
        progress: data?.progress || 0,
        current_phase: data?.current_phase || ""
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
