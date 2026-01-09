import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  
  // Simple success page that tells the user they can close the window
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Subscription Successful - Navi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 48px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 480px;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .features {
      text-align: left;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .feature:last-child { margin-bottom: 0; }
    .feature-check {
      width: 24px;
      height: 24px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .close-text {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Welcome to Navi Pro!</h1>
    <p>Your subscription is now active. Enjoy unlimited AI conversations!</p>
    <div class="features">
      <div class="feature">
        <div class="feature-check">✓</div>
        <span>Unlimited messages</span>
      </div>
      <div class="feature">
        <div class="feature-check">✓</div>
        <span>Priority response times</span>
      </div>
      <div class="feature">
        <div class="feature-check">✓</div>
        <span>Cloud sync across devices</span>
      </div>
    </div>
    <p class="close-text">You can close this window and return to Navi.</p>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
