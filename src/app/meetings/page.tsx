import { Suspense } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { MeetingsPageContent } from '@/components/meetings/meetings-page-content';
import { Loader2 } from 'lucide-react';

function MeetingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
      </div>
      
      <div className="h-32 bg-muted rounded animate-pulse" />
      
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function MeetingsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <MainLayout>
      <Suspense fallback={<MeetingsSkeleton />}>
        <MeetingsPageContent searchParams={searchParams} />
      </Suspense>
    </MainLayout>
  );
}