import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { cn } from '../../utils/cn.js';

/**
 * tabs: [{ label, icon?, count?, content }]
 * Controlled with selectedIndex/onChange, or uncontrolled when they are omitted.
 */
export default function Tabs({ tabs, selectedIndex, onChange, className, panelClassName }) {
  return (
    <TabGroup selectedIndex={selectedIndex} onChange={onChange} className={className}>
      <TabList className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map(({ label, icon: Icon, count }) => (
          <Tab
            key={label}
            className="-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap text-gray-500 transition-colors hover:text-gray-700 focus:outline-none data-focus:ring-2 data-focus:ring-brand/30 data-selected:border-brand data-selected:text-brand"
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {label}
            {count !== undefined && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 tabular-nums">{count}</span>
            )}
          </Tab>
        ))}
      </TabList>
      <TabPanels className={cn('pt-5', panelClassName)}>
        {tabs.map(({ label, content }) => (
          <TabPanel key={label} className="focus:outline-none">
            {content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}