import { NextRequest, NextResponse } from 'next/server';
import { getSellers } from '@/lib/meetings-data';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and leads can see all sellers
    if (user.role === 'rep') {
      return NextResponse.json([{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      }]);
    }
    
    const sellers = await getSellers();
    
    return NextResponse.json(sellers);
    
  } catch (error) {
    console.error('Sellers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}