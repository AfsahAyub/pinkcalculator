
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { sql } from "../../../../lib/db";

export async function GET() {
  try {
    await connection();

    const result = await sql`
      SELECT COUNT(*)::int AS total
      FROM calculator_history
    `;

    return NextResponse.json({
      success: true,
      message: "Pinkify connected to NeonDB!",
      totalCalculations: result[0].total,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
