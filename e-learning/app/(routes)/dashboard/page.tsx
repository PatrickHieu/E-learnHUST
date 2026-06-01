import React from "react"
import WelcomeBanner from "./_components/WelcomeBanner"
import EnrolledCourses from "./_components/EnrolledCourses"
import UserStatus from "./_components/UserStatus"
import Upgrade from "./_components/Upgrade"
import ExploreMoreCourses from "./_components/ExploreMoreCourses"
import TrendingCourses from "./_components/TrendingCourses"

function Dashboard() {
    return (
        <div className="p-10 md:px-20 lg:px-36 xl:px-48">
            <div className="grid grid-cols-3 gap-7">
                <div className="col-span-2">
                    <WelcomeBanner />
                    <TrendingCourses />
                    <EnrolledCourses />
                    <ExploreMoreCourses />
                </div>
                <div>
                    <UserStatus />
                    <Upgrade />
                </div>
            </div>
        </div>
    )
}

export default Dashboard
