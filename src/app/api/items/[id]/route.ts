import { NextResponse } from "next/server";
import { deleteItem } from "@/lib/store";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
