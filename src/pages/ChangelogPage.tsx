import { useChangelogGenerator } from '../hooks/useChangelogGenerator';
import { Toast } from '../components/commit/Toast';
import { ConfigSection } from '../components/changelog/ConfigSection';
import { OutputSection } from '../components/changelog/OutputSection';
import { UnapologeticButton } from '../components/commit/Shared';
import { GuideSection } from '../components/changelog/GuideSection';

export default function ChangelogPage() {
    const changelog = useChangelogGenerator();

    return (
        <div className="bg-white text-gray-800 py-12">
            <main className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
                {changelog.notification && (
                    <Toast 
                        message={changelog.notification.message} 
                        type={changelog.notification.type} 
                        onDismiss={() => changelog.setNotification(null)} 
                    />
                )}
                
                <div className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-800">AI Changelog Generator</h1>
                    <p className="text-lg text-gray-600 mt-2">Automatically create beautiful release notes from your commit history.</p>
                </div>

                <ConfigSection 
                    repo={changelog.repo} setRepo={changelog.setRepo}
                    startRef={changelog.startRef} setStartRef={changelog.setStartRef}
                    endRef={changelog.endRef} setEndRef={changelog.setEndRef}
                    githubToken={changelog.githubToken} setGithubToken={changelog.setGithubToken}
                    geminiKey={changelog.geminiKey} setGeminiKey={changelog.setGeminiKey}
                />

                <UnapologeticButton
                    onClick={changelog.handleGenerate}
                    disabled={changelog.isLoading}
                    variant="primary"
                >
                    {changelog.isLoading ? 'Generating...' : 'Generate Changelog'}
                </UnapologeticButton>

                <OutputSection 
                    isLoading={changelog.isLoading}
                    generatedChangelog={changelog.generatedChangelog}
                    setNotification={changelog.setNotification}
                />

                <div className="mt-16">
                    <GuideSection />
                </div>
            </main>
        </div>
    );
}