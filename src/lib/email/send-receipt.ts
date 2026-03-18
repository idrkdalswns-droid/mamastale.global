/**
 * I12: 결제 완료 영수증 이메일 — Resend REST API (패키지 없이 fetch)
 * fire-and-forget: 실패해도 결제 흐름에 영향 없음
 */

interface ReceiptParams {
  email: string;
  orderId: string;
  amount: number;
  tickets: number;
  paymentMethod?: string;
}

function buildReceiptHtml(params: ReceiptParams): string {
  const date = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#FBF5EC;padding:32px 16px;color:#5A3E2B;">
  <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <h1 style="font-size:20px;font-weight:600;text-align:center;margin:0 0 4px;">mamastale</h1>
    <p style="font-size:12px;text-align:center;color:#8B6F55;margin:0 0 24px;">결제가 완료되었습니다</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="border-bottom:1px solid #f0e8dd;">
        <td style="padding:10px 0;color:#8B6F55;">주문번호</td>
        <td style="padding:10px 0;text-align:right;font-weight:500;">${params.orderId.slice(0, 20)}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0e8dd;">
        <td style="padding:10px 0;color:#8B6F55;">결제일시</td>
        <td style="padding:10px 0;text-align:right;">${date}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0e8dd;">
        <td style="padding:10px 0;color:#8B6F55;">결제금액</td>
        <td style="padding:10px 0;text-align:right;font-weight:600;">₩${params.amount.toLocaleString()}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0e8dd;">
        <td style="padding:10px 0;color:#8B6F55;">동화 티켓</td>
        <td style="padding:10px 0;text-align:right;">${params.tickets}편</td>
      </tr>
      ${params.paymentMethod ? `<tr>
        <td style="padding:10px 0;color:#8B6F55;">결제수단</td>
        <td style="padding:10px 0;text-align:right;">${params.paymentMethod}</td>
      </tr>` : ""}
    </table>

    <div style="margin-top:24px;padding:16px;background:#FBF5EC;border-radius:12px;text-align:center;">
      <p style="font-size:13px;margin:0;color:#5A3E2B;">지금 바로 동화를 만들어 보세요</p>
      <a href="https://mamastale-global.pages.dev" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#E07A5F;color:#fff;border-radius:20px;text-decoration:none;font-size:13px;font-weight:500;">동화 만들기 →</a>
    </div>

    <p style="font-size:10px;color:#C4A882;text-align:center;margin:20px 0 0;">
      이 이메일은 mamastale 결제 확인을 위해 자동 발송되었습니다.<br>
      문의: support@mamastale.kr
    </p>
  </div>
</body>
</html>`;
}

export async function sendReceipt(params: ReceiptParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // graceful skip

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "mamastale <onboarding@resend.dev>",
        to: params.email,
        subject: `[mamastale] 결제 완료 — 동화 ${params.tickets}편`,
        html: buildReceiptHtml(params),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      throw new Error(`Resend ${res.status}: ${errText.slice(0, 100)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
