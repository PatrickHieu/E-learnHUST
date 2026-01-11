import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { CoursesTable } from "@/config/schema";


export async function GET(req: NextRequest) {
    
    //fetch all courses from the database
    const result = await db.select().from(CoursesTable);
    
    return NextResponse.json(result);
}