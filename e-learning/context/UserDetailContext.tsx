"use client";
import { createContext } from "react";

export type UserDetail = {
    id: number;
    name: string;
    email: string;
    points: number | null;
    subscription: string | null;
};

export type UserDetailContextValue = {
    userDetail: UserDetail | undefined;
    setUserDetail: (u: UserDetail | undefined) => void;
    refreshUserDetail: () => Promise<void>;
};

export const UserDetailContext = createContext<UserDetailContextValue>({
    userDetail: undefined,
    setUserDetail: () => {},
    refreshUserDetail: async () => {},
});
