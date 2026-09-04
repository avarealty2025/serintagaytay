import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!ANTHROPIC_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to your environment variables." },
      { status: 500 },
    );
  }

  const { photos } = (await req.json()) as {
    photos: { idx: number; url: string; thumb: string; type: string }[];
  };

  if (!photos || photos.length < 2) {
    return NextResponse.json({ error: "Need at least 2 photos to suggest ordering" }, { status: 400 });
  }

  const imagePhotos = photos.filter((p) => p.type === "photo");
  if (imagePhotos.length < 2) {
    return NextResponse.json({ error: "Need at least 2 photos (not videos) to suggest ordering" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  const imageBlocks: Anthropic.Messages.ContentBlockParam[] = [];
  for (const p of imagePhotos) {
    const imgUrl = p.thumb || p.url;
    imageBlocks.push({
      type: "image",
      source: { type: "url", url: imgUrl },
    });
    imageBlocks.push({
      type: "text",
      text: `[Photo index: ${p.idx}]`,
    });
  }

  imageBlocks.push({
    type: "text",
    text: `You are an expert vacation rental marketing photographer. Analyze these ${imagePhotos.length} photos for unit "${id}" (a staycation condo in Tagaytay, Philippines).

Your task:
1. Pick the BEST cover photo — the one that will get the most clicks on a listing site. The cover should be visually striking, well-lit, show the best feature of the space (usually a beautiful bedroom, a scenic view, or an inviting living area). NEVER pick a bathroom, kitchen close-up, or dark/cluttered shot as cover.

2. Suggest the optimal photo ORDER for maximum booking conversions. Use this proven marketing sequence:
   - Cover/hero shot (the bedroom or most impressive room angle)
   - Additional bedroom angles
   - Living/dining area
   - Kitchen
   - Bathroom
   - Views, amenities, exterior shots

Respond in this EXACT JSON format only, no other text:
{
  "coverIndex": <number>,
  "order": [<array of photo indices in recommended order>],
  "reasoning": "<brief 1-2 sentence explanation of why you chose this cover and order>"
}`,
  });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: imageBlocks }],
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const suggestion = JSON.parse(jsonMatch[0]) as {
      coverIndex: number;
      order: number[];
      reasoning: string;
    };

    return NextResponse.json(suggestion);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
