import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { FASTMAIL_USER, FASTMAIL_PASSWORD } = process.env;
  if (!FASTMAIL_USER || !FASTMAIL_PASSWORD) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.fastmail.com',
    port: 465,
    secure: true,
    auth: { user: FASTMAIL_USER, pass: FASTMAIL_PASSWORD },
  });

  const { name, email, message } = req.body || {};
  await transporter.sendMail({
    from: FASTMAIL_USER,
    to: FASTMAIL_USER,
    subject: `Diagnostic from ${name || 'Unknown'}`,
    replyTo: email || FASTMAIL_USER,
    text: message || '',
  });

  res.status(200).json({ ok: true });
}
