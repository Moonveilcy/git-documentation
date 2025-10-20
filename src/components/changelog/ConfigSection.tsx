import { OffsetShadowCard } from '../commit/Shared';

interface ConfigSectionProps {
    repo: string;
    setRepo: (value: string) => void;
    startRef: string;
    setStartRef: (value: string) => void;
    endRef: string;
    setEndRef: (value: string) => void;
    githubToken: string;
    setGithubToken: (value: string) => void;
    geminiKey: string;
    setGeminiKey: (value: string) => void;
}

export const ConfigSection = (props: ConfigSectionProps) => {
    const {
        repo, setRepo, startRef, setStartRef, endRef, setEndRef,
        githubToken, setGithubToken, geminiKey, setGeminiKey
    } = props;

    const handleRepoBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const cleanedValue = e.target.value.trim().replace(/^\/|\/$/g, '');
        setRepo(cleanedValue);
    };

    return (
        <OffsetShadowCard color="yellow" className="bg-yellow-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Repository (e.g., username/repo)"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    onBlur={handleRepoBlur}
                    className="w-full p-2 border-2 border-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 sm:col-span-2"
                />
                <input
                    type="text"
                    placeholder="Start Ref (e.g., v1.0.0)"
                    value={startRef}
                    onChange={(e) => setStartRef(e.target.value)}
                    className="w-full p-2 border-2 border-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                    type="text"
                    placeholder="End Ref (e.g., main)"
                    value={endRef}
                    onChange={(e) => setEndRef(e.target.value)}
                    className="w-full p-2 border-2 border-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                    type="password"
                    placeholder="GitHub Personal Access Token"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full p-2 border-2 border-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                    type="password"
                    placeholder="Gemini API Key"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full p-2 border-2 border-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>
        </OffsetShadowCard>
    );
};