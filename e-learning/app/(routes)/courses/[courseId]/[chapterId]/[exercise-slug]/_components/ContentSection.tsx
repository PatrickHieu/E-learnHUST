import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbulb, Goal } from 'lucide-react';
import type { ExerciseLessonContent } from '@/config/schema';
import { sanitizeLessonHtml } from '@/lib/sanitize';

type Props = {
    title: string,
    content: ExerciseLessonContent | undefined,
    loading: boolean,
}

function ContentSection({ title, content, loading }: Props) {

    return (
        <div className='p-10 mb-20'>
            {loading || !content ?
                <Skeleton className="h-full w-full m-10 rounded-2xl" />
                :
                <div>
                    <h2 className='font-game text-3xl my-3'>{title}</h2>
                    <div dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(content.content) }} />

                    <div>
                        <div className='flex mt-4 gap-2 items-center'>
                            <Goal className='text-blue-400' />
                            <h2 className='font-game text-3xl'>Task</h2>
                        </div>
                        <div>
                            <div className='p-4 border rounded-2xl bg-zinc-800' dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(content.task) }} />
                        </div>
                    </div>

                    <div>
                        <div className='flex mt-4 gap-2 items-center'>
                            <Lightbulb className='text-yellow-300' />
                            <h2 className='font-game text-3xl'> Hint</h2>
                        </div>

                        <div>
                            <div className='p-4 border rounded-2xl bg-zinc-800' dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(content.hint) }} />
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}

export default ContentSection
