export default function AdminDashboard() {
    return (
        <div>
            <h1 className="text-4xl font-bold mb-6 font-game">Tổng quan hệ thống</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Placeholder cho các thẻ thống kê sau này */}
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <h3 className="text-zinc-400 text-lg mb-2">Tổng khóa học</h3>
                    <p className="text-4xl font-bold">0</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <h3 className="text-zinc-400 text-lg mb-2">Tổng học viên</h3>
                    <p className="text-4xl font-bold">0</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <h3 className="text-zinc-400 text-lg mb-2">Tổng doanh thu</h3>
                    <p className="text-4xl font-bold text-yellow-400">$0</p>
                </div>
            </div>
        </div>
    );
}