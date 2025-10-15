import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redactText } from "@/lib/redact";

const PolicySchema = z
  .object({
    mode: z.enum(["delete", "mask"]).default("mask"),
    entities: z.array(z.string()).optional(),
    mask_map: z.record(z.string()).optional(),
  })
  .optional();

const BodySchema = z.object({
  text: z.string().min(1),
  policy: PolicySchema,
  return_entities: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, policy, return_entities } = BodySchema.parse(body);
    const res = redactText(text, policy as any);
    return NextResponse.json({
      redacted_text: res.redacted_text,
      entities: return_entities ? res.entities : undefined,
      policy: res.policy,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bad Request" },
      { status: 400 }
    );
  }
}
