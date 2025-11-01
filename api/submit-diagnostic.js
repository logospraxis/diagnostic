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

    // User email HTML with actionable CTAs
    const userEmailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px;
      background: #ffffff;
    }
    h1 { 
      color: #2563EB; 
      font-size: 28px;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 16px;
      margin-bottom: 32px;
    }
    .box { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0;
      border-left: 4px solid #2563EB;
    }
    .box h3 {
      margin-top: 0;
      color: #1f2937;
      font-size: 18px;
    }
    .box p {
      color: #4b5563;
      line-height: 1.6;
      margin: 8px 0;
    }
    .section {
      margin: 32px 0;
    }
    .section h3 {
      color: #1f2937;
      font-size: 20px;
      margin-bottom: 16px;
    }
    .cta-button {
      display: inline-block;
      background: #2563EB;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 600;
      margin: 16px 0;
      text-align: center;
    }
    .cta-button:hover {
      background: #1e40af;
    }
    .step {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .step-number {
      display: inline-block;
      background: #2563EB;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      text-align: center;
      line-height: 32px;
      font-weight: 700;
      margin-right: 12px;
    }
    .step h4 {
      display: inline;
      color: #1f2937;
      font-size: 18px;
      font-weight: 600;
    }
    .step p {
      color: #6b7280;
      margin: 12px 0 12px 44px;
      line-height: 1.6;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 40px;
      color: #6b7280;
      font-size: 14px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Your Conflict Pair: ${conflictPair}</h1>
  <p class="subtitle">Here's what your diagnostic revealed</p>
  
  <div class="box">
    <h3>Your Pattern</h3>
    <p><strong>Physical Signal:</strong> ${alarm}</p>
    <p><strong>Triggered by:</strong> ${activity}</p>
    <p><strong>You deferred:</strong> ${deferred}</p>
  </div>

  <div class="section">
    <h3>What This Means</h3>
    <p style="color: #4b5563; line-height: 1.7;">Your system is designed to favor one constraint over another, creating the tension you feel. This isn't a motivation problem—it's architectural. Your operating system rewards ${activity.toLowerCase()} while penalizing ${deferred.toLowerCase()}.</p>
  </div>

  <div class="section">
    <h3>Next Steps: Fix Your System</h3>
    
    <div class="step">
      <span class="step-number">1</span>
      <h4>Set Up Your Work Blocks</h4>
      <p>Block 5 same-time sessions (Mon-Fri) for deep work. This creates constraint enforcement—your system needs forcing functions, not more willpower.</p>
      <a href="https://cal.logospraxis.xyz/" class="cta-button" style="display: block; text-align: center; color: white;">Set Up Work Blocks →</a>
    </div>

    <div class="step">
      <span class="step-number">2</span>
      <h4>Book Your System Audit</h4>
      <p>30-minute call to audit your current system + 8-week async program to rebuild your constraint architecture. $2,000. No refunds if you don't ship proof artifacts.</p>
      <a href="https://calendly.com/admin-logospraxis/system-audit" class="cta-button" style="display: block; text-align: center; color: white;">Book System Audit ($2,000) →</a>
    </div>
  </div>

  <div class="footer">
    <p><strong>Logos & Praxis</strong> | Behavior Operations Infrastructure</p>
    <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">Not therapy. Not coaching. System design.</p>
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
