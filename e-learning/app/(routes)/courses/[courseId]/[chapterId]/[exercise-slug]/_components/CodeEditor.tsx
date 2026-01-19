import React from 'react'
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    useSandpack,
} from "@codesandbox/sandpack-react";
import SplitterLayout from 'react-splitter-layout';
import 'react-splitter-layout/lib/index.css';
import { CourseExercise } from '../page';
import { Button } from '@/components/ui/button';
import { nightOwl } from "@codesandbox/sandpack-themes";
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';


type Props = {
    courseExerciseData: CourseExercise | undefined,
    loading: boolean,
    refreshData?: () => void,
}

const CodeEditorChildren = ({ onCompleteExercise, isCompleted }: any) => {

    const { sandpack } = useSandpack();

    return (
        <div className='font-game absolute bottom-40 flex gap-5 right-5 z-50'>
            <Button variant={'pixel'} size={'lg'}
                className='text-xl z-5'
                onClick={() => sandpack.runSandpack()}>
                Run Code</Button>
            <Button variant={'pixel'}
                disabled={isCompleted}
                className="bg-[#a3e534] text-xl z-5" size={'lg'}
                onClick={() => onCompleteExercise()}
            >
                {isCompleted ? 'Already Completed !' : 'Mark Completed!'}</Button>
        </div>
    )
}

function CodeEditor({ courseExerciseData, loading, refreshData }: Props) {

    const router = useRouter();

    const { 'exercise-slug': exerciseslug } = useParams();
    const exerciseIndex = courseExerciseData?.exercises?.findIndex(item => item.slug === exerciseslug);

    const isCompleted = courseExerciseData?.completedExercise?.find(item => item?.exerciseId == Number(exerciseIndex) + 1);



    const onCompleteExercise = async () => {

        if (exerciseIndex == undefined) {
            return;
        }
        try {
            const result = await axios.post('/api/exercise/complete', {
                courseId: courseExerciseData?.courseId,
                chapterId: courseExerciseData?.chapterId,
                exerciseId: exerciseIndex + 1,
                xpEarned: courseExerciseData?.exercises[exerciseIndex]?.xp
            })
            console.log(result);
            toast.success('Exercise marked as completed!');

            // Refetch dữ liệu bài tập hiện tại để cập nhật trạng thái
            if (refreshData) {
                await refreshData();
            }

            // Refresh trang để cập nhật dữ liệu trên trang parent (CourseChapter)
            router.refresh();
        } catch (error) {
            console.error('Error marking exercise complete:', error);
            toast.error('Failed to mark exercise as completed');
        }
    }

    return (
        <div>
            <SandpackProvider template="static"
                theme={nightOwl}
                style={{
                    height: '100vh'
                }}
                // @ts-ignore
                files={courseExerciseData?.exerciseData?.exerciseContent?.starterCode}
                options={{
                    autorun: false,
                    autoReload: false
                }}
            >
                <SandpackLayout style={{ height: '100%' }}>
                    <SplitterLayout
                        percentage
                        primaryMinSize={30}
                        secondaryMinSize={30}
                        secondaryInitialSize={50}
                    >
                        <div className='relative h-full '>
                            <SandpackCodeEditor
                                showTabs
                                showRunButton={false}
                                style={{ height: '100%' }} />
                            <CodeEditorChildren onCompleteExercise={onCompleteExercise} isCompleted={isCompleted} />
                        </div>
                        <SandpackPreview
                            showNavigator={true}
                            showOpenInCodeSandbox={false}
                            showOpenNewtab={true}
                            style={{ height: '100%' }} />
                    </SplitterLayout>
                </SandpackLayout>
            </SandpackProvider>
        </div>
    )
}

export default CodeEditor
