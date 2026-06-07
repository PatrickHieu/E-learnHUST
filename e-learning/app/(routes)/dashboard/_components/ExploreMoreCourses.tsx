import React, { Suspense } from 'react'
import CourseList from '../../courses/_components/CourseList'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function ExploreMoreCourses() {
  return (
      <div>
          <div className='mt-7 flex justify-between items-center'>
              <h2 className="font-game text-3xl mb-2">Explore Other Courses</h2>
              <Link href="/courses">
                <Button className='font-game text-lg' variant="pixel">View All</Button>
              </Link>
          </div>
          {/* CourseList uses useSearchParams internally — wrap in
              Suspense so the dashboard still prerenders cleanly. */}
          <Suspense fallback={null}>
            <CourseList smallerCard={true} maxLimit={5} />
          </Suspense>
    </div>
  )
}

export default ExploreMoreCourses
