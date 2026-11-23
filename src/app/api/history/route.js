
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { sql } from "../../../../lib/db";

// Get saved calculations
export async function GET() {
  try {
    await connection();

    const rows = await sql`
      SELECT id, expression, result, created_at
      FROM calculator_history
      ORDER BY created_at DESC, id DESC
      LIMIT 40
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error("History GET error:", error);

    return NextResponse.json(
      { error: "Could not load calculation history" },
      { status: 500 }
    );
  }
}

// Save a calculation
export async function POST(request) {
  try {
    const body = await request.json();

    const expression = body.expression;
    const result = body.result;

    if (
      typeof expression !== "string" ||
      typeof result !== "string" ||
      !expression.trim() ||
      expression.length > 200 ||
      result.length > 100
    ) {
      return NextResponse.json(
        { error: "Invalid calculation" },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO calculator_history (expression, result)
      VALUES (${expression}, ${result})
      RETURNING id, expression, result, created_at
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("History POST error:", error);

    return NextResponse.json(
      { error: "Could not save calculation" },
      { status: 500 }
    );
  }
}

// Delete saved history
export async function DELETE() {
  try {
    await sql`DELETE FROM calculator_history`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("History DELETE error:", error);

    return NextResponse.json(
      { error: "Could not clear history" },
      { status: 500 }
    );
  }
}
