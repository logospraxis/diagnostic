// ESM-only — no CommonJS anywhere
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS (optional for same-origin; harmless if left)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  try {
    const { email, answers, conflictPair, timestamp } = req.body || {};
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    if (!answers || !conflictPair)   return res.status(400).json({ error: 'Incomplete diagnostic data' });

    const FASTMAIL_USER = process.env.FASTMAIL_USER;
    const FASTMAIL_PASSWORD = process.env.FASTMAIL_PASSWORD;
    if (!FASTMAIL_USER || !FASTMAIL_PASSWORD) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.fastmail.com',
      port: 465,
      secure: true,
      auth: { user: FASTMAIL_USER, pass: FASTMAIL_PASSWORD },
    });

    // build your HTML/messages exactly as before…
    const adminEmailHTML = /* html */`
      <h1>Diagnostic Submission</h1>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Conflict Pair:</strong> ${conflictPair}</p>
      <pre>${JSON.stringify(answers, null, 2)}</pre>
      <p><small>${timestamp || new Date().toISOString()}</small></p>
    `;

    // send to you
    await transporter.sendMail({
      from: `"Logos & Praxis" <${FASTMAIL_USER}>`,
      to: FASTMAIL_USER,
      subject: `[Diagnostic] ${conflictPair} - ${email}`,
      html: adminEmailHTML,
    });

    // optional: send confirmation to user
    await transporter.sendMail({
      from: `"Logos & Praxis" <${FASTMAIL_USER}>`,
      to: email,
      subject: `Your Diagnostic: ${conflictPair}`,
      text: 'Thanks—results received.',
      html: '<p>Thanks—results received.</p>',
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send diagnostic results' });
  }
}
