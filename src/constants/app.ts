/**
 * Application-wide defaults and configuration
 */
export const APP_CONFIG = {
    NAME: 'Code Ignite',
    AUTHOR: 'Yash Chandnani',
    CODE_HISTORY_LIMIT: 5,
    TOAST_DURATION_MS: 3000,
    COPY_FEEDBACK_DURATION_MS: 2000,
} as const;

export const DEFAULT_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Code Ignite</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Geist+Mono:wght@300;400&display=swap"
    rel="stylesheet"
  />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:      hsl(24, 8%, 7%);
      --fg:      hsl(36, 25%, 90%);
      --primary: hsl(40, 60%, 68%);
      --muted:   hsl(36, 15%, 55%);
    }

    body {
      background: var(--bg);
      color: var(--fg);
      font-family: 'Geist Mono', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    /* Radial gold glow */
    body::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 50%,
        hsl(40 60% 68% / 0.07) 0%, transparent 70%);
      pointer-events: none;
      animation: fadeIn 1.4s ease both;
    }

    /* Top rule */
    .rule-top {
      width: 96px;
      height: 1px;
      background: var(--primary);
      opacity: 0.6;
      margin-bottom: 4rem;
      animation: fadeIn 1.4s ease both;
    }

    /* Headline */
    h1 {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 300;
      font-style: italic;
      font-size: clamp(3rem, 10vw, 6rem);
      line-height: 1.15;
      letter-spacing: 0.02em;
      text-align: center;
      /* shimmer */
      background: linear-gradient(
        90deg,
        hsl(40, 60%, 68%) 0%,
        hsl(36, 60%, 88%) 40%,
        hsl(40, 60%, 68%) 80%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both,
                 shimmer 4s linear 0.9s infinite;
    }

    /* Middle divider */
    .rule-mid {
      width: 64px;
      height: 1px;
      background: var(--primary);
      opacity: 0.4;
      margin: 2.5rem 0;
      animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
    }

    /* Sub-copy */
    p {
      font-family: 'Geist Mono', monospace;
      font-size: 0.8125rem;
      line-height: 1.7;
      letter-spacing: 0.18em;
      color: var(--muted);
      text-align: center;
      max-width: 22rem;
      animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
    }

    /* Footer label */
    .footer {
      position: absolute;
      bottom: 2.5rem;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Geist Mono', monospace;
      font-size: 0.7rem;
      letter-spacing: 0.3em;
      color: var(--muted);
      opacity: 0.4;
      white-space: nowrap;
      animation: fadeIn 2s ease 0.5s both;
    }

    /* Keyframes */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
  </style>
</head>
<body>

  <div class="rule-top"></div>

  <h1>Welcome to Code Ignite</h1>

  <div class="rule-mid"></div>

  <p>Describe what you want to build in the chat!</p>

  <div class="footer">Yash &nbsp;·&nbsp; Chandnani</div>

</body>
</html>
`;
