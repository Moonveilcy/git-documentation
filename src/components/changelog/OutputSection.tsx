import { Clipboard } from 'lucide-react';
import { OffsetShadowCard } from '../commit/Shared';
import { NotificationType } from '../../hooks/useGithub';

interface OutputSectionProps {
    isLoading: boolean;
    generatedChangelog: string;
    setNotification: (notification: NotificationType | null) => void;
}

export const OutputSection = ({ isLoading, generatedChangelog, setNotification }: OutputSectionProps) => {
    const handleCopy = () => {
        if (!generatedChangelog) return;
        navigator.clipboard.writeText(generatedChangelog)
            .then(() => setNotification({ message: 'Copied to clipboard!', type: 'success' }))
            .catch(() => setNotification({ message: 'Failed to copy.', type: 'error' }));
    };

    return (
        <OffsetShadowCard color="sky" className="bg-sky-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Generated Changelog</h2>
                <button
                    onClick={handleCopy}
                    disabled={!generatedChangelog || isLoading}
                    className="p-2 bg-purple-500 text-white rounded-md border-2 border-black hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    aria-label="Copy to clipboard"
                >
                    <Clipboard size={18} />
                </button>
            </div>
            <div className="w-full p-4 min-h-[20rem] bg-white/70 rounded-lg border-2 border-black whitespace-pre-wrap font-mono text-sm overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-gray-500">
                       Loading...
                    </div>
                ) : (
                    generatedChangelog || "Your generated changelog will appear here..."
                )}
            </div>
        </OffsetShadowCard>
    );
};