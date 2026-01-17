import React from 'react'
import { CourseExercise } from '../page'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbulb } from 'lucide-react';

type Props = {
    courseExerciseData: CourseExercise | undefined,
    loading: boolean,
}

function ContentSection({ courseExerciseData, loading}: Props) {

    const content = courseExerciseData?.exerciseData?.exerciseContent?.content;
    
    return (
        <div className='p-10'>
            {loading || !courseExerciseData ?
                <Skeleton className="h-full w-full m-10 rounded-2xl" />
                :
                <div>
                    <h2 className='font-game text-3xl my-3'> {courseExerciseData?.name}</h2>
                    <div dangerouslySetInnerHTML={{ __html: courseExerciseData?.exerciseData.exerciseContent.content }} />

                    <div>
                        <h2 className='font-game text-3xl mt-4'>Task</h2>
                        <div>
                            <div className='p-4 border rounded-2xl bg-zinc-800' dangerouslySetInnerHTML={{ __html: courseExerciseData?.exerciseData.exerciseContent.task }} />
                        </div>
                    </div>

                    <div>
                        <h2 className='font-game text-3xl mt-4 flex gap-2 items-center text-yellow-300'><Lightbulb /> Hint</h2>
                        <div>
                            <div className='p-4 border rounded-2xl bg-zinc-800' dangerouslySetInnerHTML={{ __html: courseExerciseData?.exerciseData.exerciseContent.hint }} />
                        </div>
                    </div>
                </div>
            }
    </div>
    )
}

export default ContentSection
