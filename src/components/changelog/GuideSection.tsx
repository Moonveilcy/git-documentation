import { HelpCircle, GitCommit, GitBranch, Tag, Rocket } from 'lucide-react';
import { OffsetShadowCard } from '../commit/Shared';

const GuideItem = ({ icon: Icon, title, children }) => (
  <div>
    <div className="flex items-center gap-3 mb-2">
      <Icon className="w-6 h-6 text-purple-600 flex-shrink-0" />
      <h4 className="text-lg font-bold text-gray-800">{title}</h4>
    </div>
    <p className="text-gray-600 ml-9">{children}</p>
  </div>
);

export const GuideSection = () => {
  return (
    <OffsetShadowCard color="purple" className="bg-purple-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">How to Use the AI Changelog</h2>
      <div className="space-y-6">
        <GuideItem icon={GitCommit} title="What It Does">
          This tool reads the commit history between two points in your repository and uses AI to write a clean, categorized changelog for your new release.
        </GuideItem>
        <GuideItem icon={GitBranch} title="Start Ref (The Past)">
          Enter the tag of your last release (e.g., <strong>v1.0.0</strong>). This tells the tool to find all new work done <em>after</em> this point.
        </GuideItem>
        <GuideItem icon={Tag} title="End Ref (The Present)">
           Usually, you'll enter your main branch name here (e.g., <strong>main</strong>). This tells the tool to include all new commits up to the very latest one.
        </GuideItem>
        <GuideItem icon={Rocket} title="Example Scenario">
          To generate release notes for your upcoming v2.0.0 release, you would set <strong>Start Ref</strong> to <strong>v1.0.0</strong> and <strong>End Ref</strong> to <strong>main</strong>. The AI will summarize all the changes made between them.
        </GuideItem>
      </div>
    </OffsetShadowCard>
  );
};