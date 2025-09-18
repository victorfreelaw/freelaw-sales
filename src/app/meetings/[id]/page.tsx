import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { MeetingDetailsContent } from '@/components/meetings/meeting-details-content';
import { getMeetingDetails } from '@/lib/meeting-details-data';
import { getCurrentUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface MeetingDetailsPageProps {
  params: Promise<{ id: string }>;
}

function MeetingDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="flex gap-4">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          <div className="h-6 w-28 bg-muted rounded animate-pulse" />
        </div>
      </div>
      
      {/* Content Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-96 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

async function MeetingDetailsPage({ params }: MeetingDetailsPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    notFound();
  }

  // For reps, only show their own meetings
  const userId = user.role === 'rep' ? user.id : undefined;
  const { id } = await params;
  const meeting = await getMeetingDetails(id, userId);

  if (!meeting) {
    notFound();
  }

  return (
    <MainLayout>
      <Suspense fallback={<MeetingDetailsSkeleton />}>
        <MeetingDetailsContent meeting={meeting} currentUser={user} />
      </Suspense>
    </MainLayout>
  );
}

export default MeetingDetailsPage;