import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

export const maxDuration = 120;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ error: "Missing project ID" }, { status: 400 });
  }

  try {
    const docSnap = await adminDb.collection("projects").doc(projectId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = docSnap.data()!;
    const content = project.content || {};

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: project.title,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({ text: `Universidad: ${project.university}` }),
            new Paragraph({ text: `Autor: ${project.author}` }),
            new Paragraph({ text: `ID: ${project.id}` }),
            ...Object.entries(content).flatMap(([section, text]) => [
              new Paragraph({
                text: section,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400 },
              }),
              new Paragraph({
                text: text as string,
                spacing: { before: 200 },
              }),
            ]),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Tesis_${projectId}.docx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error generating DOCX:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
