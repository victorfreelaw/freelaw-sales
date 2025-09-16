import { Client } from '@hubspot/api-client';
import { z } from 'zod';
import { Telemetry } from '@/lib/telemetry';

// HubSpot configuration schema
const HubSpotConfigSchema = z.object({
  accessToken: z.string(),
  portalId: z.string().optional(),
});

// Contact/Company data from analysis
interface ContactData {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface CompanyData {
  name: string;
  domain?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  numberOfEmployees?: string;
  annualRevenue?: string;
}

interface DealData {
  dealName: string;
  amount?: string;
  dealStage: string;
  closeDate?: string;
  associatedCompanyId?: string;
  associatedContactId?: string;
}

export interface HubSpotSyncResult {
  success: boolean;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  noteId?: string;
  error?: string;
}

export class HubSpotIntegration {
  private client: Client;
  private config: z.infer<typeof HubSpotConfigSchema>;

  constructor(accessToken: string) {
    this.config = HubSpotConfigSchema.parse({ accessToken });
    this.client = new Client({ accessToken });
  }

  // Create or update contact
  async createOrUpdateContact(contactData: ContactData): Promise<string | null> {
    try {
      const properties = {
        email: contactData.email,
        firstname: contactData.firstName,
        lastname: contactData.lastName,
        company: contactData.company,
        phone: contactData.phone,
        website: contactData.website,
        city: contactData.city,
        state: contactData.state,
        country: contactData.country,
        // FreelawSales specific fields
        freelaw_source: 'FreelawSales · Fathom',
        freelaw_last_sync: new Date().toISOString(),
      };

      // Remove undefined values
      const cleanProperties = Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => value !== undefined)
      );

      let contactId: string;

      if (contactData.email) {
        try {
          // Try to find existing contact by email
          const existingContact = await this.client.crm.contacts.basicApi.getById(
            contactData.email,
            undefined,
            undefined,
            undefined,
            false,
            'email'
          );
          
          // Update existing contact
          await this.client.crm.contacts.basicApi.update(
            existingContact.id,
            { properties: cleanProperties }
          );
          
          contactId = existingContact.id;
        } catch {
          // Contact doesn't exist, create new one
          const newContact = await this.client.crm.contacts.basicApi.create({
            properties: cleanProperties,
          });
          
          contactId = newContact.id;
        }
      } else {
        // No email provided, create contact anyway
        const newContact = await this.client.crm.contacts.basicApi.create({
          properties: cleanProperties,
        });
        
        contactId = newContact.id;
      }

      return contactId;
    } catch (error) {
      console.error('HubSpot contact sync error:', error);
      return null;
    }
  }

  // Create or update company
  async createOrUpdateCompany(companyData: CompanyData): Promise<string | null> {
    try {
      const properties = {
        name: companyData.name,
        domain: companyData.domain,
        city: companyData.city,
        state: companyData.state,
        country: companyData.country,
        industry: companyData.industry,
        numberofemployees: companyData.numberOfEmployees,
        annualrevenue: companyData.annualRevenue,
        // FreelawSales specific fields
        freelaw_source: 'FreelawSales · Fathom',
        freelaw_last_sync: new Date().toISOString(),
      };

      // Remove undefined values
      const cleanProperties = Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => value !== undefined)
      );

      let companyId: string;

      if (companyData.domain) {
        try {
          // Try to find existing company by domain
          const searchResponse = await this.client.crm.companies.searchApi.doSearch({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'domain',
                    operator: 'EQ',
                    value: companyData.domain,
                  },
                ],
              },
            ],
            properties: ['name', 'domain'],
            limit: 1,
          });

          if (searchResponse.results && searchResponse.results.length > 0) {
            // Update existing company
            companyId = searchResponse.results[0].id;
            await this.client.crm.companies.basicApi.update(companyId, {
              properties: cleanProperties,
            });
          } else {
            // Create new company
            const newCompany = await this.client.crm.companies.basicApi.create({
              properties: cleanProperties,
            });
            companyId = newCompany.id;
          }
        } catch {
          // Create new company if search fails
          const newCompany = await this.client.crm.companies.basicApi.create({
            properties: cleanProperties,
          });
          companyId = newCompany.id;
        }
      } else {
        // No domain provided, create company anyway
        const newCompany = await this.client.crm.companies.basicApi.create({
          properties: cleanProperties,
        });
        companyId = newCompany.id;
      }

      return companyId;
    } catch (error) {
      console.error('HubSpot company sync error:', error);
      return null;
    }
  }

  // Create deal/meeting
  async createDeal(dealData: DealData): Promise<string | null> {
    try {
      const properties = {
        dealname: dealData.dealName,
        amount: dealData.amount,
        dealstage: dealData.dealStage,
        closedate: dealData.closeDate,
        // FreelawSales specific fields
        freelaw_source: 'FreelawSales · Fathom',
        freelaw_last_sync: new Date().toISOString(),
      };

      // Remove undefined values
      const cleanProperties = Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => value !== undefined)
      );

      const deal = await this.client.crm.deals.basicApi.create({
        properties: cleanProperties,
        associations: [
          ...(dealData.associatedCompanyId
            ? [
                {
                  to: { id: dealData.associatedCompanyId },
                  types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }], // Deal to Company
                },
              ]
            : []),
          ...(dealData.associatedContactId
            ? [
                {
                  to: { id: dealData.associatedContactId },
                  types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }], // Deal to Contact
                },
              ]
            : []),
        ],
      });

      return deal.id;
    } catch (error) {
      console.error('HubSpot deal creation error:', error);
      return null;
    }
  }

  // Add note to deal/contact
  async addNote(
    content: string,
    associatedObjectId: string,
    objectType: 'contact' | 'company' | 'deal' = 'deal'
  ): Promise<string | null> {
    try {
      const note = await this.client.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: content,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: associatedObjectId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: objectType === 'contact' ? 202 : objectType === 'company' ? 190 : 214,
              },
            ],
          },
        ],
      });

      return note.id;
    } catch (error) {
      console.error('HubSpot note creation error:', error);
      return null;
    }
  }

  // Main sync method for a meeting
  async syncMeeting(meetingData: {
    meetingId: string;
    title: string;
    fathomUrl: string;
    summary: string;
    scriptScore: number;
    icpFit: string;
    nextAction: string;
    participants: Array<{
      name?: string;
      email?: string;
    }>;
    companyInfo?: {
      name: string;
      size?: string;
      industry?: string;
      revenue?: string;
    };
  }): Promise<HubSpotSyncResult> {
    return Telemetry.time(
      'hubspot.sync',
      async () => {
        try {
          let contactId: string | null = null;
          let companyId: string | null = null;
          let dealId: string | null = null;
          let noteId: string | null = null;

          // 1. Create/update company if provided
          if (meetingData.companyInfo) {
            companyId = await this.createOrUpdateCompany({
              name: meetingData.companyInfo.name,
              industry: meetingData.companyInfo.industry,
              numberOfEmployees: meetingData.companyInfo.size,
              annualRevenue: meetingData.companyInfo.revenue,
            });
          }

          // 2. Create/update primary contact
          const primaryParticipant = meetingData.participants.find(p => p.email) || meetingData.participants[0];
          if (primaryParticipant) {
            const nameParts = primaryParticipant.name?.split(' ') || [];
            contactId = await this.createOrUpdateContact({
              email: primaryParticipant.email,
              firstName: nameParts[0],
              lastName: nameParts.slice(1).join(' '),
              company: meetingData.companyInfo?.name,
            });
          }

          // 3. Create deal/opportunity
          const dealStage = this.getDealStageFromScore(meetingData.scriptScore, meetingData.icpFit);
          dealId = await this.createDeal({
            dealName: `${meetingData.title} - ${meetingData.companyInfo?.name || 'Prospect'}`,
            dealStage,
            associatedCompanyId: companyId || undefined,
            associatedContactId: contactId || undefined,
          });

          // 4. Add detailed note with meeting summary
          if (dealId) {
            const noteContent = this.formatMeetingNote(meetingData);
            noteId = await this.addNote(noteContent, dealId, 'deal');
          }

          const result: HubSpotSyncResult = {
            success: true,
            contactId: contactId || undefined,
            companyId: companyId || undefined,
            dealId: dealId || undefined,
            noteId: noteId || undefined,
          };

          // Emit telemetry
          Telemetry.hubspotSynced({
            meetingId: meetingData.meetingId,
            contactId,
            companyId,
            dealId,
            success: true,
          });

          return result;
        } catch (error) {
          console.error('HubSpot sync error:', error);

          const result: HubSpotSyncResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };

          // Emit error telemetry
          Telemetry.hubspotSynced({
            meetingId: meetingData.meetingId,
            success: false,
          });

          return result;
        }
      },
      { meetingId: meetingData.meetingId }
    );
  }

  private getDealStageFromScore(scriptScore: number, icpFit: string): string {
    // Map scores to HubSpot deal stages (customize based on your pipeline)
    if (icpFit === 'high' && scriptScore >= 80) {
      return 'qualifiedtobuy'; // High-intent qualified lead
    } else if (icpFit === 'high' && scriptScore >= 60) {
      return 'presentationscheduled'; // Good fit, needs follow-up
    } else if (scriptScore >= 70) {
      return 'appointmentscheduled'; // Good meeting, medium fit
    } else if (scriptScore >= 40) {
      return 'qualifiedtobuy'; // Needs nurturing
    } else {
      return 'leadinqualified'; // Poor fit or execution
    }
  }

  private formatMeetingNote(meetingData: {
    title: string;
    fathomUrl: string;
    summary: string;
    scriptScore: number;
    icpFit: string;
    nextAction: string;
  }): string {
    return `
📹 **Reunião de Vendas - ${meetingData.title}**

**🎯 Resumo Executivo:**
${meetingData.summary}

**📊 Análise de Performance:**
• Script Score: ${meetingData.scriptScore}/100
• ICP Fit: ${meetingData.icpFit.toUpperCase()}

**🎬 Gravação da Reunião:**
${meetingData.fathomUrl}

**📝 Próximos Passos:**
${meetingData.nextAction}

---
_Sincronizado automaticamente via FreelawSales_
`.trim();
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.crm.contacts.basicApi.getPage(1);
      return true;
    } catch (error) {
      console.error('HubSpot health check failed:', error);
      return false;
    }
  }
}

// Singleton for HubSpot integration
let hubspotInstance: HubSpotIntegration | null = null;

export function getHubSpotIntegration(): HubSpotIntegration | null {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  
  if (!token) {
    console.warn('HUBSPOT_PRIVATE_APP_TOKEN not configured');
    return null;
  }

  if (!hubspotInstance) {
    hubspotInstance = new HubSpotIntegration(token);
  }

  return hubspotInstance;
}