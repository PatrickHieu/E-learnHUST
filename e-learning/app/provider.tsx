"use client";
import React, { useCallback, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { UserDetail, UserDetailContext } from "@/context/UserDetailContext";
import Headers from "../app/_components/Header";

function Provider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {

    const { user } = useUser();
    const [userDetail, setUserDetail] = useState<UserDetail | undefined>();

    // POST /api/user is idempotent — it returns the existing row, or creates
    // one on first sign-in. Used both for initial hydration and as the
    // refresh path after XP / star balance changes.
    const refreshUserDetail = useCallback(async () => {
        if (!user) return;
        try {
            const result = await axios.post<UserDetail>("/api/user", {});
            setUserDetail(result?.data);
        } catch (err) {
            console.error("Failed to refresh user detail:", err);
        }
    }, [user]);

    useEffect(() => {
        refreshUserDetail();
    }, [refreshUserDetail]);

    return (
        <NextThemesProvider {...props}>
            <UserDetailContext.Provider value={{ userDetail, setUserDetail, refreshUserDetail }}>
                <div className="flex flex-col items-center">
                    <Headers />
                </div>
                {children}
            </UserDetailContext.Provider>
        </NextThemesProvider>
    );
}

export default Provider;
