import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
    // Lấy danh sách user từ DB
    const users = await db.select().from(usersTable);

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold font-game text-white">Quản lý Học viên</h1>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-950">
                        <TableRow className="border-zinc-800">
                            <TableHead className="text-zinc-400 font-game">Tên học viên</TableHead>
                            <TableHead className="text-zinc-400 font-game">Email</TableHead>
                            <TableHead className="text-zinc-400 font-game text-center">Sao tích lũy (⭐)</TableHead>
                            <TableHead className="text-zinc-400 font-game text-center">Gói tài khoản</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} className="border-zinc-800">
                                <TableCell className="text-white font-medium">{user.name}</TableCell>
                                <TableCell className="text-zinc-400">{user.email}</TableCell>
                                <TableCell className="text-center text-yellow-400 font-bold">
                                    {user.points || 0} ⭐
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={user.subscription ? "default" : "outline"} className="font-game">
                                        {user.subscription || "FREE"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}