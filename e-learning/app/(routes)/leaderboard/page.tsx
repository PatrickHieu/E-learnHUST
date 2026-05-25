"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Medal, Trophy } from "lucide-react";

type Leader = {
  id: number;
  name: string;
  email: string;
  points: number | null;
};

type LeaderboardResponse = {
  leaders: Leader[];
  currentUserEmail: string | null;
};

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-7 h-7 text-yellow-300" />;
  if (rank === 2) return <Trophy className="w-7 h-7 text-zinc-300" />;
  if (rank === 3) return <Medal className="w-7 h-7 text-amber-600" />;
  return null;
}

function rowHighlight(rank: number, isMe: boolean) {
  if (isMe) return "bg-yellow-400/10 border-yellow-400";
  if (rank === 1) return "bg-yellow-500/5 border-yellow-500/40";
  if (rank === 2) return "bg-zinc-400/5 border-zinc-400/40";
  if (rank === 3) return "bg-amber-700/5 border-amber-700/40";
  return "border-zinc-800";
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
}

function Leaderboard() {
  const [data, setData] = useState<LeaderboardResponse>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await axios.get<LeaderboardResponse>("/api/leaderboard");
        setData(result.data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-10 md:px-24 lg:px-36 xl:px-48">
      <div className="flex items-center gap-3 mb-6">
        <Image src="/star.png" alt="star" width={60} height={60} />
        <h1 className="font-game text-6xl">Leaderboard</h1>
      </div>
      <p className="font-game text-2xl text-gray-400 mb-8">
        Top learners ranked by total stars earned.
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.leaders?.length ? (
        <div className="font-game text-2xl text-gray-500 text-center p-10 border-4 border-dashed rounded-2xl">
          Nobody on the board yet. Complete a lesson to claim the throne.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.leaders.map((leader, idx) => {
            const rank = idx + 1;
            const isMe = leader.email === data.currentUserEmail;
            return (
              <div
                key={leader.id}
                className={`flex items-center justify-between p-4 border-4 rounded-xl font-game ${rowHighlight(rank, isMe)}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 text-center text-3xl text-yellow-300">
                    #{rank}
                  </div>
                  {rankIcon(rank)}
                  <div>
                    <h2 className="text-2xl">
                      {leader.name || "Anonymous"}
                      {isMe && (
                        <span className="ml-3 text-yellow-400 text-base">(you)</span>
                      )}
                    </h2>
                    <p className="text-sm text-zinc-500">{maskEmail(leader.email)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-3xl text-yellow-300">
                  <Image src="/star.png" alt="star" width={32} height={32} />
                  {leader.points ?? 0}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
