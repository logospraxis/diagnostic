// api/submit-diagnostic.js
// Vercel serverless function to handle diagnostic email submissions

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, answers, conflictPair, timestamp } = req.body;

    // Validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    if (!answers || !conflictPair) {
      return res.status(400).json({ error: 'Incomplete diagnostic data' });
    }

    // Get Fastmail credentials from environment variables
    const FASTMAIL_USER = process.env.FASTMAIL_USER; // adam@logospraxis.xyz
    const FASTMAIL_PASSWORD = process.env.FASTMAIL_PASSWORD; // App-specific password

    if (!FASTMAIL_USER || !FASTMAIL_PASSWORD) {
      console.error('Missing Fastmail credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Import nodemailer (Vercel includes it by default)
    const nodemailer = require('nodemailer');

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

    // Map answers to readable text
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

    // Email to user
    const userEmailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #374151;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 32px 0;
      border-bottom: 2px solid #E5E7EB;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #0B0B0C;
    }
    .result-block {
      background: #F9FAFB;
      border-left: 4px solid #2563EB;
      padding: 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .result-title {
      font-size: 28px;
      font-weight: 700;
      color: #2563EB;
      margin-bottom: 16px;
    }
    .label {
      font-size: 12px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 24px;
      margin-bottom: 8px;
    }
    .content {
      font-size: 16px;
      color: #1F2937;
      line-height: 1.7;
    }
    .highlight {
      background: #EFF6FF;
      border-left: 4px solid #2563EB;
      padding: 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .cta {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: #2563EB;
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding-top: 32px;
      margin-top: 32px;
      border-top: 1px solid #E5E7EB;
      color: #6B7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Logos & Praxis</div>
  </div>

  <div class="result-block">
    <div class="result-title">${conflictPair}</div>
    <p style="color: #6B7280; margin: 0;">Your Conflict Pair</p>
  </div>

  <div class="label">Your Alarm Pattern</div>
  <div class="content">
    <strong>Physical signal:</strong> ${alarm}<br>
    <strong>Triggered by:</strong> ${activity}<br>
    <strong>Deferred:</strong> ${deferred}
  </div>

  <div class="highlight">
    <strong>Your system is designed to favor one over the other.</strong> That's why the alarm keeps firing. No amount of discipline fixes architectural problems.
  </div>

  <div class="label">What This Means</div>
  <div class="content">
    You're stuck in a pattern where your system rewards ${activity.toLowerCase()} while penalizing ${deferred.toLowerCase()}. This creates a constraint violation—your body signals it, but your operating system has no exit condition.
  </div>

  <div class="label">The Fix</div>
  <div class="content">
    The 8-week Output Ops Engine rebuilds your constraint architecture:
    <ul>
      <li><strong>WIP=2:</strong> Two lanes max (one live, one maintenance)</li>
      <li><strong>Kill-list:</strong> Everything else gets a forcing function</li>
      <li><strong>Proof artifacts:</strong> Binary decisions (shipped or not)</li>
      <li><strong>Constraint enforcement:</strong> Same-time blocks Mon-Fri</li>
    </ul>
  </div>

  <div class="cta">
    <a href="https://logospraxis.xyz/system-map" class="button">
      Get the 8-Week System →
    </a>
  </div>

  <div class="footer">
    <p><strong>Next Steps:</strong></p>
    <p>1. Complete your System Map v1.0<br>
    2. Book your System Audit ($2,000)<br>
    3. Submit calendar proof (5 same-time 50-min blocks)</p>
    <br>
    <p style="font-size: 12px; color: #9CA3AF;">
      Logos & Praxis | Behavior Operations Infrastructure<br>
      © 2025 All rights reserved
    </p>
  </div>
</body>
</html>
    `;

    // Email to Adam (notification)
    const adminEmailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #374151;
      padding: 20px;
    }
    .header {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #2563EB;
    }
    .data-row {
      padding: 12px;
      border-bottom: 1px solid #E5E7EB;
    }
    .label {
      font-weight: 600;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="header">New Diagnostic Completion</div>
  
  <div class="data-row">
    <span class="label">Email:</span> ${email}
  </div>
  
  <div class="data-row">
    <span class="label">Conflict Pair:</span> ${conflictPair}
  </div>
  
  <div class="data-row">
    <span class="label">Alarm:</span> ${alarm}
  </div>
  
  <div class="data-row">
    <span class="label">Activity:</span> ${activity}
  </div>
  
  <div class="data-row">
    <span class="label">Deferred:</span> ${deferred}
  </div>
  
  <div class="data-row">
    <span class="label">Timestamp:</span> ${timestamp}
  </div>
  
  <p style="margin-top: 20px; font-size: 14px; color: #6B7280;">
    Follow up via email or add to CRM for nurture sequence.
  </p>
</body>
</html>
    `;

    // Send email to user
    await transporter.sendMail({
      from: `"Logos & Praxis" <${FASTMAIL_USER}>`,
      to: email,
      subject: `Your Conflict Pair: ${conflictPair}`,
      html: userEmailHTML,
    });

    // Send notification to Adam
    await transporter.sendMail({
      from: `"Logos & Praxis" <${FASTMAIL_USER}>`,
      to: FASTMAIL_USER,
      subject: `[Diagnostic] ${conflictPair} - ${email}`,
      html: adminEmailHTML,
    });

    // Success response
    return res.status(200).json({ 
      success: true,
      message: 'Diagnostic results sent to email'
    });

  } catch (error) {
    console.error('Error processing diagnostic:', error);
    return res.status(500).json({ 
      error: 'Failed to send diagnostic results',
      details: error.message 
    });
  }
}
