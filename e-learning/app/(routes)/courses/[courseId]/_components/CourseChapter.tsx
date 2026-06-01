import React from 'react'
import { Course } from '../../_components/CourseList'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'
import { Video, FileText, Code2, HelpCircle } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from 'next/link'

type Props = {
  loading: boolean,
  courseDetail: Course | undefined
}

function lessonIcon(type: string) {
  if (type === 'video') return <Video className="w-5 h-5 text-pink-300" />;
  if (type === 'pdf') return <FileText className="w-5 h-5 text-blue-300" />;
  if (type === 'quiz') return <HelpCircle className="w-5 h-5 text-purple-300" />;
  return <Code2 className="w-5 h-5 text-green-300" />;
}

function CourseChapter({ loading, courseDetail }: Props) {

  const { has } = useAuth();
  const hasProAccess = has && has({ plan: 'pro' });
  const completedIds = courseDetail?.completedLessonIds ?? [];

  return (
    <div>
      {courseDetail?.chapters?.length == 0 ?
        <div>
          <Skeleton className='w-full h-[100px] rounded=xl' />
          <Skeleton className='w-full h-[100px] mt-5 rounded=xl' />
        </div>
        :
        <div className='p-5 border-4 rounded-2xl'>
          {courseDetail?.chapters?.map((chapter, chapterIndex) => (
            <Accordion type="single" collapsible key={chapterIndex}>
              <AccordionItem value="item-1">
                <AccordionTrigger className='p-3 hover:bg-zinc-800 font-game text-4xl'>
                  <div className='flex items-center justify-between w-full'>
                    <div className='flex gap-10'>
                      <h2 className='h-10 w-10 bg-zinc-700 flex items-center justify-center rounded-full'>{chapterIndex + 1}</h2>
                      {chapter?.name}
                    </div>
                    {!hasProAccess && chapterIndex >= 2 && <h2 className='font-game text-3xl text-yellow-400'>Pro</h2>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className='p-7 bg-zinc-900 rounded-xl'>
                    {chapter?.lessons?.map((lesson, index) => {
                      const isCompleted = completedIds.includes(lesson.id);
                      const isLocked = !courseDetail?.userEnrolled || (!hasProAccess && chapterIndex >= 2);
                      return (
                        <div key={lesson.id} className='flex items-center justify-between mb-7'>
                          <div className='flex items-center gap-10 font-game'>
                            <h2 className='text-3xl flex items-center gap-3'>
                              {lessonIcon(lesson.type)}
                              <span className='text-zinc-400 text-2xl uppercase'>{lesson.type}</span>
                            </h2>
                            <h2 className='text-3xl'>{lesson.title}</h2>
                          </div>
                          {isCompleted ? (
                            <Button variant={'pixel'} className='bg-green-600'>Completed</Button>
                          ) : isLocked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant={'pixelDisabled'}>???</Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className='font-game text-lg'>
                                  {!courseDetail?.userEnrolled ? 'Please Enroll first' : 'Pro only'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Link href={`/courses/${courseDetail?.courseId}/${chapter?.chapterId}/${lesson.slug}`}>
                              <Button variant={'pixel'}>{lesson.xp}xp</Button>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>}
    </div>
  )
}

export default CourseChapter
