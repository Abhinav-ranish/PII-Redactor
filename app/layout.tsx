import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "PII Redactor (Next.js)",
  description:
    "Delete or mask PII/PHI locally before sending to external LLMs.",
  icons: { icon: "/favicon.png" },
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* AI Agent Discovery */}
        <link rel="ai-plugin" href="/.well-known/ai-plugin.json" />
        <link rel="openapi" type="text/yaml" href="/openapi.yaml" />
        <link rel="agents" type="text/markdown" href="/agents.md" />
      </head>
      <body className={inter.className}>
        {/*
          === AI AGENT ACCESS ===
          This application provides a public PII/PHI redaction API.
          Base URL: https://pii.aranish.uk

          API Endpoint: POST /api/redact
          Content-Type: application/json
          Auth: None required

          Request body:
          {
            "text": "Your text with PII here",
            "policy": { "mode": "mask" | "delete" },
            "return_entities": true
          }

          Supported entity types: PERSON, EMAIL_ADDRESS, PHONE_NUMBER, US_SSN,
          CREDIT_CARD, DATE_TIME, IP_ADDRESS, URL, ADDRESS, POSTAL_CODE,
          LOCATION, MEDICAL_RECORD_NUMBER

          Discovery files:
          - OpenAPI spec: https://pii.aranish.uk/openapi.yaml
          - AI plugin manifest: https://pii.aranish.uk/.well-known/ai-plugin.json
          - Agent docs: https://pii.aranish.uk/agents.md
          === END AI AGENT ACCESS ===
        */}
        {children}
      </body>
    </html>
  );
}
