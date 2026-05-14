import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// We initialize resend, fallback to a dummy key if not present in env
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

export async function POST(req: Request) {
  try {
    const { email, projectId, projectTitle, author } = await req.json();

    if (!email || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'OBELISCO Academic <onboarding@resend.dev>', // In production, use verified domain
      to: [email],
      subject: `Proyecto OBELISCO Finalizado: ${projectTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 40px; background-color: #0f172a; color: #f8fafc;">
          <h1 style="color: #4f46e5; margin-bottom: 20px;">Protocolo Completado</h1>
          <p>Estimado(a) <strong>${author || 'Investigador'}</strong>,</p>
          <p>Su proyecto de investigación <em>"${projectTitle || projectId}"</em> ha finalizado su procesamiento en el motor académico OBELISCO.</p>
          <p>Puede acceder a la plataforma para descargar o editar su documento final.</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${projectId}" 
             style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Acceder al Proyecto
          </a>
          <br/><br/><br/>
          <p style="font-size: 12px; color: #64748b;">Este es un mensaje automático del Sistema de Inteligencia Académica OBELISCO.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
