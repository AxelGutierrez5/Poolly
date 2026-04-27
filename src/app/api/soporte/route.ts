import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const { tipo, asunto, mensaje, email, nombre, telefono } = await req.json();

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const DEST_EMAIL = process.env.SOPORTE_EMAIL;

  if (!RESEND_KEY || !DEST_EMAIL) {
    return NextResponse.json(
      { error: "Config de email no definida" },
      { status: 500 },
    );
  }

  const resend = new Resend(RESEND_KEY);

  const tipoLabel =
    tipo === "bug"
      ? "🐛 Bug"
      : tipo === "problema"
        ? "⚠️ Problema"
        : "💡 Sugerencia";

  const html = `
    <h2>${tipoLabel}: ${asunto}</h2>
    <p><strong>De:</strong> ${nombre} (${email})</p>
    ${telefono ? `<p><strong>Teléfono:</strong> ${telefono}</p>` : ""}
    <hr />
    <p style="white-space: pre-wrap">${mensaje}</p>
  `;

  const { error } = await resend.emails.send({
    from: "Poolly Soporte <onboarding@resend.dev>",
    to: [DEST_EMAIL],
    subject: `[Poolly ${tipoLabel}] ${asunto}`,
    html,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
