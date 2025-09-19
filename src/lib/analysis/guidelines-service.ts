import { SCRIPT_GUIDELINES, ICP_GUIDELINES } from './guidelines';

interface ActiveGuidelines {
  script: string;
  icp: string;
  scriptId?: string;
  icpId?: string;
}

const shouldUseFallback = () => {
  const usesDevStore = process.env.DEV_STORE_ENABLED === 'true';
  const dbUrl = process.env.DATABASE_URL;
  const fakeDb = dbUrl?.includes('fake');
  const missingDb = !dbUrl;
  return usesDevStore || fakeDb || missingDb;
};

export async function getActiveGuidelines(): Promise<ActiveGuidelines> {
  if (shouldUseFallback()) {
    return { script: SCRIPT_GUIDELINES, icp: ICP_GUIDELINES };
  }

  try {
    const [{ getActiveScript, getActiveIcp }] = await Promise.all([
      import('@/lib/playbooks-data'),
    ]);

    const [script, icp] = await Promise.all([getActiveScript(), getActiveIcp()]);

    return {
      script: script?.content || SCRIPT_GUIDELINES,
      icp: icp?.content || ICP_GUIDELINES,
      scriptId: script?.id,
      icpId: icp?.id,
    };
  } catch (error) {
    console.error('guidelines-service: erro ao carregar guidelines ativos, usando fallback.', error);
    return { script: SCRIPT_GUIDELINES, icp: ICP_GUIDELINES };
  }
}
