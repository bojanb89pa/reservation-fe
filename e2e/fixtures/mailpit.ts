import { expect } from '@playwright/test';
import { env } from '../env';

interface MailpitSummary {
  ID: string;
  Subject: string;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  HTML: string;
  Text: string;
}

async function mailpitGet<T>(path: string): Promise<T> {
  const response = await fetch(`${env.mailpitUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Mailpit ${path}: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * Čeka poslednji mejl poslat na `to` (auth-service ga šalje asinhrono, pa ga
 * nema odmah posle odgovora na registraciju).
 */
export async function waitForEmail(to: string, timeoutMs = 20_000): Promise<MailpitMessage> {
  let found: MailpitSummary | undefined;
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}"`);
        const result = await mailpitGet<{ messages: MailpitSummary[] }>(
          `/api/v1/search?query=${query}&limit=1`,
        );
        found = result.messages[0];
        return found !== undefined;
      },
      { message: `mejl za ${to} nije stigao u Mailpit`, timeout: timeoutMs },
    )
    .toBe(true);
  return mailpitGet<MailpitMessage>(`/api/v1/message/${found!.ID}`);
}

/** Aktivacioni link iz mejla (`.../users/activate?token=...`). */
export async function activationLink(to: string): Promise<string> {
  const message = await waitForEmail(to);
  const match = /https?:\/\/[^\s"'<>]+\/users\/activate\?token=[^\s"'<>&]+/.exec(
    message.HTML || message.Text,
  );
  if (!match) {
    throw new Error(`u mejlu za ${to} nema aktivacionog linka (subject: ${message.Subject})`);
  }
  return match[0];
}
