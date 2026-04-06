export default function AdminDashboard() {
    return (
        <div className="font-game">
            <h1 className="text-4xl font-bold mb-6 font-game">System overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Placeholder cho các thẻ thống kê sau này */}
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <h3 className="text-zinc-400 text-lg mb-2">Total Courses</h3>
                    <p className="text-4xl font-bold">0</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <h3 className="text-zinc-400 text-lg mb-2">Total Students</h3>
                    <p className="text-4xl font-bold">0</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <h3 className="text-zinc-400 text-lg mb-2">Total Revenue</h3>
                    <p className="text-4xl font-bold text-yellow-400">$0</p>
                </div>
            </div>
        </div>
    );
}