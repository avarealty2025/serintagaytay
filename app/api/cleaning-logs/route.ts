import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "../../../src/lib/supabase.ts";
import { getDbSettings, saveDbSettings, getUnitIdMap } from "../../../src/data/db.ts";

const CLEANING_TYPES = ["guest", "monthly", "quarterly", "annual"] as const;

const PRESETS: Record<string, { category: string; items: string[] }[]> = {
  guest: [
    { category: "Balcony", items: ["Sweep balcony floor", "Wipe railing", "Clean outdoor furniture", "Check plants"] },
    { category: "Bedroom", items: ["Change bed sheets & pillowcases", "Fluff pillows", "Check under bed", "Wipe bedside tables", "Check closet / hangers", "Sweep / vacuum floor"] },
    { category: "Living Area", items: ["Sweep / mop floor", "Wipe tables & counters", "Dust shelves & surfaces", "Clean sofa / cushions", "Empty trash bin", "Straighten decor items"] },
    { category: "Kitchen", items: ["Wash dishes & utensils", "Clean sink", "Wipe stove / induction cooker", "Clean microwave inside & out", "Check refrigerator (clean & empty)", "Wipe kitchen counter", "Restock coffee / tea essentials"] },
    { category: "Bathroom", items: ["Scrub toilet bowl", "Clean sink & mirror", "Scrub shower area / tiles", "Replace towels", "Refill toiletries (soap, shampoo)", "Check drain (no clog)", "Wipe bathroom floor"] },
    { category: "Appliances Check", items: ["TV / Smart TV working", "Air conditioning working", "Wi-Fi router working", "Electric kettle working", "Hot & cold shower working", "Lights all working", "Door lock working"] },
    { category: "Final Check", items: ["Windows closed & locked", "Curtains / blinds clean", "No personal items left by previous guest", "Room smells fresh", "Welcome amenities placed"] },
  ],
  monthly: [
    { category: "Balcony", items: ["Power wash floor", "Deep clean railing", "Clean outdoor furniture thoroughly", "Remove cobwebs from corners"] },
    { category: "Bedroom", items: ["Rotate / flip mattress", "Vacuum under & behind furniture", "Dust ceiling & corners", "Clean light fixtures", "Wipe window sills & tracks", "Check mattress protector condition"] },
    { category: "Living Area", items: ["Move furniture & vacuum behind", "Clean baseboards", "Dust ceiling fan blades", "Clean AC vents / filters", "Polish fixtures & handles", "Clean windows inside", "Vacuum upholstery"] },
    { category: "Kitchen", items: ["Deep clean oven / stove burners", "Clean behind refrigerator", "Degrease range hood / exhaust", "Clean cabinets inside & out", "Descale electric kettle", "Clean drain with solution", "Inventory utensils & cookware"] },
    { category: "Bathroom", items: ["Deep clean grout & tile", "Descale showerhead", "Clean exhaust fan", "Wipe down cabinets inside", "Check for mold spots", "Polish chrome fixtures", "Replace shower curtain if needed"] },
    { category: "General Inspection", items: ["Check for pest signs / droppings", "Inspect caulking / seals around wet areas", "Clean all door handles & knobs", "Wipe all light switches & outlets", "Spot clean walls & remove scuff marks", "Check under sinks for leaks"] },
  ],
  quarterly: [
    { category: "Plumbing", items: ["Check all faucets for drips / leaks", "Test water pressure (hot & cold)", "Check toilet flush mechanism", "Inspect under-sink pipes for corrosion", "Clean all drain traps", "Check water heater temperature setting"] },
    { category: "Electrical", items: ["Test all power outlets", "Check all light switches work", "Check circuit breaker labels", "Inspect extension cords for damage", "Test smoke detector / fire alarm", "Check emergency lighting"] },
    { category: "Structural", items: ["Inspect walls & ceiling for cracks", "Check for water stains / mold", "Inspect door frames & hinges", "Check window seals & locking", "Assess tile grout condition", "Look for signs of water damage"] },
    { category: "Appliance Service", items: ["Service AC unit / clean filters deeply", "Deep clean washing machine drum", "Check refrigerator door seals", "Test all remote controls", "Check microwave power & turntable", "Inspect electric wiring behind appliances"] },
    { category: "Safety & Compliance", items: ["Fire extinguisher check (pressure gauge)", "First aid kit restocked", "Emergency exit path clear", "Balcony railing secure (shake test)", "Non-slip mats in bathroom", "Check door peephole & deadbolt"] },
    { category: "Inventory & Supplies", items: ["Count all linens & towels", "Inventory kitchen utensils", "Check amenity supply levels", "Replace worn or stained items", "Order replacements if needed", "Update inventory list"] },
  ],
  annual: [
    { category: "Exterior & Structure", items: ["Assess paint condition (touch-ups needed?)", "Check balcony waterproofing", "Inspect facade / exterior walls", "Check outdoor lighting fixtures", "Assess outdoor furniture (replace?)", "Check window frames for rot / damage"] },
    { category: "Interior Painting", items: ["Touch up wall paint (all rooms)", "Check ceiling paint condition", "Assess if full repaint needed", "Touch up door frames & trim", "Check for discoloration / yellowing"] },
    { category: "Flooring Assessment", items: ["Assess all tile condition", "Check grout integrity throughout", "Look for loose / cracked tiles", "Assess need for re-grouting", "Check floor leveling / settling", "Inspect transition strips"] },
    { category: "Major Appliance Service", items: ["Schedule professional AC servicing", "Check all appliance warranties", "Assess appliance age / condition", "Service water heater (flush)", "Have electrician check main panel", "Assess need for appliance upgrades"] },
    { category: "Furniture & Fixtures", items: ["Assess all furniture condition", "Check bed frame stability", "Inspect sofa / chairs for wear", "Review mattress age (replace at 7-8 yrs)", "Check cabinet doors & hinges", "Assess curtain / blind condition"] },
    { category: "Documentation", items: ["Update full unit inventory list", "Take photo documentation of condition", "Review year's maintenance history", "Plan next year's renovation budget", "Update insurance documentation", "Review and update unit amenities list"] },
  ],
};

async function resolveUnitUuid(appId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const idMap = await getUnitIdMap();
  return idMap.get(appId) ?? null;
}

export async function GET(req: NextRequest) {
  const unitId = req.nextUrl.searchParams.get("unitId");
  if (!unitId) {
    return NextResponse.json({ error: "unitId required" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdmin();
  const unitUuid = await resolveUnitUuid(unitId);

  const settings = await getDbSettings();

  const templates: Record<string, unknown> = {};
  for (const type of CLEANING_TYPES) {
    const key = type === "guest" ? `cleaning_checklist:${unitId}` : `cleaning_checklist:${unitId}:${type}`;
    templates[type] = settings?.[key] ?? PRESETS[type];
  }

  let logs: unknown[] = [];
  if (unitUuid) {
    const { data } = await sb
      .from("cleaning_logs")
      .select("*")
      .eq("unit_id", unitUuid)
      .order("signed_at", { ascending: false })
      .limit(50);
    logs = data ?? [];
  }

  return NextResponse.json({ templates, logs });
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { unitId, items, cleanedBy, notes, proofUrls, cleaningType } = body;

  if (!unitId || !cleanedBy || !items) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const unitUuid = await resolveUnitUuid(unitId);
  if (!unitUuid) {
    return NextResponse.json({ error: `Unit ${unitId} not found` }, { status: 404 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("cleaning_logs")
    .insert({
      unit_id: unitUuid,
      items,
      cleaned_by: cleanedBy,
      notes: notes || null,
      proof_urls: proofUrls ?? [],
      cleaning_type: cleaningType || "guest",
      signed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get("serin_admin")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { unitId, template, cleaningType } = body;

  if (!unitId || !template) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const type = cleaningType || "guest";
  const key = type === "guest" ? `cleaning_checklist:${unitId}` : `cleaning_checklist:${unitId}:${type}`;

  const result = await saveDbSettings(key, template);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
