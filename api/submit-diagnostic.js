// api/submit-diagnostic.js
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

  console.log('=== Diagnostic submission received ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { email, answers, conflictPair, timestamp } = req.body || {};
    
    // Validation
    if (!email || !email.includes('@')) {
      console.error('Invalid email:', email);
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    if (!answers || !conflictPair) {
      console.error('Missing data - answers:', !!answers, 'conflictPair:', !!conflictPair);
      return res.status(400).json({ error: 'Incomplete diagnostic data' });
    }

    const FASTMAIL_USER = process.env.FASTMAIL_USER;
    const FASTMAIL_PASSWORD = process.env.FASTMAIL_PASSWORD;
    
    console.log('Email credentials check:', {
      userExists: !!FASTMAIL_USER,
      passwordExists: !!FASTMAIL_PASSWORD,
      user: FASTMAIL_USER ? FASTMAIL_USER.substring(0, 5) + '***' : 'MISSING'
    });
    
    if (!FASTMAIL_USER || !FASTMAIL_PASSWORD) {
      console.error('Missing email credentials in environment variables');
      return res.status(500).json({ error: 'Server configuration error - missing credentials' });
    }

    console.log('Creating transporter...');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.fastmail.com',
      port: 465,
      secure: true,
      auth: {
        user: FASTMAIL_USER,
        pass: FASTMAIL_PASSWORD,
      },
      debug: true, // Enable debug logs
      logger: true, // Enable logger
    });

    console.log('Verifying SMTP connection...');
    
    // Verify connection
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      return res.status(500).json({ 
        error: 'Email server connection failed',
        details: verifyError.message 
      });
    }

    // Map answer codes to readable text
    const alarmMap = {
      jaw: 'Jaw clenches',
      breathing: 'Breathing shallows',
      chest: 'Chest tightens',
      time: 'Time distorts'
    };

    const activityMap = {
      messages: 'Responding to messages/Slack',
      meetings: 'In a meeting or on a call',
      reviewing: 'Reviewing or approving work',
      planning: 'Planning or strategizing',
      switching: 'Context-switching between tasks'
    };

    const deferredMap = {
      deep_work: 'Deep work / focused execution',
      decisions: 'Decision-making / killing options',
      strategy: 'Strategy / big-picture thinking',
      learning: 'Learning / skill-building',
      shipping: 'Shipping / finishing things'
    };

    const alarm = alarmMap[answers.q1] || answers.q1;
    const activity = activityMap[answers.q2] || answers.q2;
    const deferred = deferredMap[answers.q3] || answers.q3;

    // Admin email HTML
    const adminEmailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
    .header { font-size: 24px; font-weight: 700; color: #2563EB; margin-bottom: 20px; }
    .data-row { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .label { font-weight: 600; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">New Diagnostic Submission</div>
  
  <div class="data-row">
    <span class="label">Email:</span> ${email}
  </div>
  
  <div class="data-row">
    <span class="label">Conflict Pair:</span> ${conflictPair}
  </div>
  
  <div class="data-row">
    <span class="label">Physical Signal:</span> ${alarm}
  </div>
  
  <div class="data-row">
    <span class="label">Triggering Activity:</span> ${activity}
  </div>
  
  <div class="data-row">
    <span class="label">Deferred Work:</span> ${deferred}
  </div>
  
  <div class="data-row">
    <span class="label">Timestamp:</span> ${timestamp || new Date().toISOString()}
  </div>
  
  <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
    Follow up via email or add to CRM.
  </p>
</body>
</html>
    `;

    // User email HTML (simplified for now)
    const userEmailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563EB; }
    .box { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Your Conflict Pair: ${conflictPair}</h1>
  
  <div class="box">
    <h3 style="margin-top: 0;">Your Results Summary</h3>
    <p><strong>Physical Signal:</strong> ${alarm}</p>
    <p><strong>Triggered by:</strong> ${activity}</p>
    <p><strong>You deferred:</strong> ${deferred}</p>
  </div>

  <div style="margin: 30px 0;">
    <h4>What This Means:</h4>
    <p>Your system is designed to favor one constraint over another, creating the tension you feel.</p>
    
    <h4>Next Steps:</h4>
    <ul>
      <li>Review your conflict pair pattern</li>
      <li>Implement the system design fixes</li>
      <li>Track your progress</li>
    </ul>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
    <p>Logos & Praxis | Behavior Operations Infrastructure</p>
  </div>
</body>
</html>
    `;

    console.log('Sending admin notification...');
    
    // Send admin notification
    const adminInfo = await transporter.sendMail({
      from: `"Logos & Praxis Diagnostic" <${FASTMAIL_USER}>`,
      to: FASTMAIL_USER,
      replyTo: email,
      subject: `[Diagnostic] ${conflictPair} - ${email}`,
      html: adminEmailHTML,
    });
    
    console.log('Admin email sent:', adminInfo.messageId);

    console.log('Sending user confirmation...');
    
    // Send user confirmation
    const userInfo = await transporter.sendMail({
      from: `"Logos & Praxis" <${FASTMAIL_USER}>`,
      to: email,
      subject: `Your Conflict Pair Diagnostic: ${conflictPair}`,
      html: userEmailHTML,
      text: `Your Conflict Pair: ${conflictPair}\n\nPhysical Signal: ${alarm}\nTriggered by: ${activity}\nYou deferred: ${deferred}\n\nYour system is designed to favor one constraint over another. Check your email for the full analysis.`,
    });
    
    console.log('User email sent:', userInfo.messageId);
    console.log('=== Diagnostic submission completed successfully ===');

    res.status(200).json({ 
      ok: true, 
      message: 'Results sent successfully',
      emailSent: true
    });
    
  } catch (err) {
    console.error('=== Email sending error ===');
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    
    // More specific error messages
    if (err.code === 'EAUTH') {
      return res.status(500).json({ error: 'Email authentication failed. Check credentials.' });
    } else if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      return res.status(500).json({ error: 'Cannot connect to email server.' });
    } else {
      return res.status(500).json({ 
        error: 'Failed to send diagnostic results', 
        details: err.message 
      });
    }
  }
}
