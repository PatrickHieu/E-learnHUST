import { usersTable } from "@/config/schema";
import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/config/db";


export async function POST(req: NextRequest) {

    const user = await currentUser();
    
    // If user already exists
    const users = await db.select().from(usersTable).where(eq(usersTable.email, user?.primaryEmailAddress?.emailAddress!));
    
    //If Not The Create New User
    if (users?.length <= 0) {
        const newUser = {
            name: user?.fullName ?? '',
            email: user?.primaryEmailAddress?.emailAddress ?? '',
            points: 0
        }

        const result = await db.insert(usersTable)
            .values(newUser).returning()
        
        return NextResponse.json(result[0])
    }

    return NextResponse.json(users[0]);

}