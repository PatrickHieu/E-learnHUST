"use client";
import React, { useCallback, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useSession } from "next-auth/react";
import axios from "axios";
import { UserDetail, UserDetailContext } from "@/context/UserDetailContext";
import Headers from "../app/_components/Header";

function Provider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {

    const { data: session, status } = useSession();
    const [userDetail, setUserDetail] = useState<UserDetail | undefined>();

    // POST /api/user returns the row for the current session (looked
    // up by users.id off the JWT). Used both for initial hydration
    // and as the refresh path after XP / star balance changes.
    const refreshUserDetail = useCallback(async () => {
        if (status !== "authenticated") return;
        try {
            const result = await axios.post<UserDetail>("/api/user", {});
            setUserDetail(result?.data);
        } catch (err) {
            console.error("Failed to refresh user detail:", err);
        }
    }, [status]);

    useEffect(() => {
        refreshUserDetail();
    }, [refreshUserDetail]);

    // Clear cached detail when the user signs out so the next sign-in
    // re-fetches a fresh row.
    useEffect(() => {
        if (status === "unauthenticated") setUserDetail(undefined);
    }, [status]);

    void session; // keep the destructure shape stable for future use

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
