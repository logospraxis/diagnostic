// ESM-only — no CommonJS anywhere
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, answers, conflictPair, timestamp } = req.body || {};
    
    // Validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    if (!answers || !conflictPair) {
      return res.status(400).json({ error: 'Incomplete diagnostic data' });
    }

    const FASTMAIL_USER = process.env.FASTMAIL_USER;
    const FASTMAIL_PASSWORD = process.env.FASTMAIL_PASSWORD;
    
    if (!FASTMAIL_USER || !FASTMAIL_PASSWORD) {
      console.error('Missing email credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.fastmail.com',
      port: 465,
      secure: true,
      auth: {
        user: FASTMAIL_USER,
        pass: FASTMAIL_PASSWORD,
      },
    });

    // Verify connection
    await transporter.verify();

    // Admin email HTML
    const adminEmailHTML = `
      <h1>New Diagnostic Submission</h1>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Conflict Pair:</strong> ${conflictPair}</p>
      <h3>Answers:</h3>
      <ul>
        <li>Q1 (Physical Signal): ${answers.q1 || 'Not answered'}</li>
        <li>Q2 (Triggering Activity): ${answers.q2 || 'Not answered'}</li>
        <li>Q3 (Deferred Work): ${answers.q3 || 'Not answered'}</li>
      </ul>
      <p><small>Submitted: ${timestamp || new Date().toISOString()}</small></p>
    `;

    // User email HTML
    const userEmailHTML = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563EB;">Your Conflict Pair: ${conflictPair}</h1>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Results Summary</h3>
          <p>Based on your diagnostic, your system is favoring one constraint over another, creating the tension you feel.</p>
        </div>

        <div style="margin: 30px 0;">
          <h4>Next Steps:</h4>
          <ul>
            <li>Review your conflict pair pattern</li>
            <li>Implement the system design fixes suggested</li>
            <li>Track your progress over 8 weeks</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280;">
          <p><small>This is an automated response from Logos & Praxis Diagnostic.</small></p>
        </div>
      </div>
    `;

    // Send admin notification
    await transporter.sendMail({
      from: `"Logos & Praxis Diagnostic" <${FASTMAIL_USER}>`,
      to: FASTMAIL_USER,
      replyTo: email,
      subject: `[Diagnostic] ${conflictPair} - ${email}`,
      html: adminEmailHTML,
    });

    // Send user confirmation
    await transporter.sendMail({
      from: `"Logos & Praxis" <${FASTMAIL_USER}>`,
      to: email,
      subject: `Your Conflict Pair Diagnostic: ${conflictPair}`,
      html: userEmailHTML,
      text: `Your Conflict Pair: ${conflictPair}\n\nBased on your diagnostic, your system is favoring one constraint over another. Check your email for the full analysis and next steps.`,
    });

    console.log(`Diagnostic submitted successfully for: ${email}`);
    res.status(200).json({ ok: true, message: 'Results sent successfully' });
    
  } catch (err) {
    console.error('Email sending error:', err);
    
    // More specific error messages
    if (err.code === 'EAUTH') {
      return res.status(500).json({ error: 'Email authentication failed. Check credentials.' });
    } else if (err.code === 'ECONNECTION') {
      return res.status(500).json({ error: 'Cannot connect to email server.' });
    } else {
      return res.status(500).json({ error: 'Failed to send diagnostic results. Please try again.' });
    }
  }
}
