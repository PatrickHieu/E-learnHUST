import React, { useContext } from 'react'
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    useSandpack,
} from "@codesandbox/sandpack-react";
import SplitterLayout from 'react-splitter-layout';
import 'react-splitter-layout/lib/index.css';
import { Button } from '@/components/ui/button';
import { nightOwl } from "@codesandbox/sandpack-themes";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import type { ExerciseLessonContent } from '@/config/schema';
import { validateExerciseSubmission } from '@/lib/lesson-validation';
import { UserDetailContext } from '@/context/UserDetailContext';


type LessonExercise = {
    id: number,
    title: string,
    content: ExerciseLessonContent,
};

type Props = {
    lesson: LessonExercise,
    editorType?: string | null,
    isCompleted: boolean,
    refreshData?: () => void,
}

type ValidTemplate = 'react' | 'vue' | 'svelte' | 'vanilla';

const getValidTemplate = (editorType?: string | null): ValidTemplate => {
    const validTemplates: ValidTemplate[] = ['react', 'vue', 'svelte', 'vanilla'];
    if (editorType && validTemplates.includes(editorType as ValidTemplate)) {
        return editorType as ValidTemplate;
    }
    return 'react';
}

type CodeEditorChildrenProps = {
    onCompleteExercise: (submission: string) => void;
    isCompleted: boolean;
};

const CodeEditorChildren = ({ onCompleteExercise, isCompleted }: CodeEditorChildrenProps) => {

    const { sandpack } = useSandpack();

    const handleSubmit = () => {
        const submission = Object.values(sandpack.files)
            .map((f) => (typeof f === 'string' ? f : f?.code ?? ''))
            .join('\n');
        onCompleteExercise(submission);
    };

    return (
        <div className='font-game absolute bottom-40 flex gap-5 right-5 z-50'>
            <Button variant={'pixel'} size={'lg'}
                className='text-xl z-5'
                onClick={() => sandpack.runSandpack()}>
                Run Code</Button>
            <Button variant={'pixel'}
                disabled={isCompleted}
                className="bg-[#a3e534] text-xl z-5" size={'lg'}
                onClick={handleSubmit}
            >
                {isCompleted ? 'Already Completed !' : 'Mark Completed!'}</Button>
        </div>
    )
}

function CodeEditor({ lesson, editorType, isCompleted, refreshData }: Props) {

    const router = useRouter();
    const { refreshUserDetail } = useContext(UserDetailContext);

    const onCompleteExercise = async (submission: string) => {
        // Client-side pre-flight so the user gets immediate feedback instead
        // of a round-trip on a guaranteed-failing submission. Server
        // re-validates regardless.
        const local = validateExerciseSubmission(lesson.content, submission);
        if (!local.pass) {
            toast.error(local.reason);
            return;
        }

        try {
            await axios.post('/api/lesson/complete', {
                lessonId: lesson.id,
                submission,
            });
            toast.success('Lesson marked as completed!');

            if (refreshData) {
                await refreshData();
            }
            await refreshUserDetail();
            router.refresh();
        } catch (error: any) {
            const reason = error?.response?.data?.reason;
            if (reason) {
                toast.error(reason);
            } else {
                console.error('Error marking lesson complete:', error);
                toast.error('Failed to mark lesson as completed');
            }
        }
    }

    return (
        <div>
            <SandpackProvider template={getValidTemplate(editorType)}
                theme={nightOwl}
                style={{
                    height: '100vh'
                }}
                files={lesson.content.starterCode}
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
