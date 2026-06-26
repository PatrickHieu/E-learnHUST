import React from 'react'
import { Course } from '../../_components/CourseList'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Video, FileText, Code2, HelpCircle, Lock } from 'lucide-react'
import { isChapterUnlocked } from '@/lib/chapter-gating'

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
  void loading;
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
          {courseDetail?.chapters?.map((chapter, chapterIndex) => {
            const chapterUnlocked = isChapterUnlocked(
              courseDetail.chapters ?? [],
              chapterIndex,
              completedIds,
            );
            return (
              <Accordion type="single" collapsible key={chapterIndex}>
                <AccordionItem value="item-1">
                  <AccordionTrigger className='p-3 hover:bg-zinc-800 font-game text-4xl'>
                    <div className='flex items-center justify-between w-full'>
                      <div className='flex gap-10'>
                        <h2 className='h-10 w-10 bg-zinc-700 flex items-center justify-center rounded-full'>{chapterIndex + 1}</h2>
                        {chapter?.name}
                      </div>
                      <div className="flex items-center gap-3">
                        {!chapterUnlocked && (
                          <Lock className="w-6 h-6 text-zinc-500" aria-label="Locked" />
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='p-7 bg-zinc-900 rounded-xl'>
                      {!chapterUnlocked && (
                        <div className="font-game text-zinc-400 text-xl mb-6 p-3 border-2 border-dashed border-zinc-700 rounded-xl">
                          Complete every quiz + exercise in the previous chapter to unlock this one.
                        </div>
                      )}
                      {chapter?.lessons?.map((lesson) => {
                        const isCompleted = completedIds.includes(lesson.id);
                        const notEnrolled = !courseDetail?.userEnrolled;
                        const isLocked = notEnrolled || !chapterUnlocked;
                        const lockReason = notEnrolled
                          ? 'Please Enroll first'
                          : 'Complete previous chapter first';
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
                              // Wrap the Completed pill in a Link so students
                              // can re-enter a finished lesson to re-read
                              // their saved submission or replay the video.
                              // Without the wrapper the button was just a
                              // static green chip — clicking did nothing.
                              <Link href={`/courses/${courseDetail?.courseId}/${chapter?.chapterId}/${lesson.slug}`}>
                                <Button variant={'pixel'} className='bg-green-600'>Completed</Button>
                              </Link>
                            ) : isLocked ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant={'pixelDisabled'}>???</Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className='font-game text-lg'>{lockReason}</p>
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
            );
          })}
        </div>}
    </div>
  )
}

export default CourseChapter
