import { Injectable } from '@nestjs/common';

@Injectable()
export class EvidenceRetrievalService {
  // Evidence database (simplified - in production would connect to external sources)
  private readonly evidenceDatabase: Record<
    string,
    Array<{
      title: string;
      source: string;
      url: string;
      relevance: number;
      excerpt: string;
      category: string;
    }>
  > = {
    'acute coronary syndrome': [
      {
        title: 'Chest Pain and Acute Coronary Syndrome',
        source: 'American College of Cardiology/American Heart Association',
        url: 'https://www.acc.org',
        relevance: 0.95,
        excerpt: 'Prompt evaluation and risk stratification are essential in chest pain evaluation.',
        category: 'Guidelines',
      },
      {
        title: 'Troponin Testing in ACS',
        source: 'European Society of Cardiology',
        url: 'https://www.escardio.org',
        relevance: 0.9,
        excerpt: 'High-sensitivity troponin improves detection of myocardial infarction.',
        category: 'Guidelines',
      },
    ],
    'pneumonia': [
      {
        title: 'Community-Acquired Pneumonia Guidelines',
        source: 'Infectious Diseases Society of America',
        url: 'https://www.idsociety.org',
        relevance: 0.92,
        excerpt: 'Antibiotic selection based on severity and risk factors.',
        category: 'Guidelines',
      },
      {
        title: 'Respiratory Infection Diagnosis',
        source: 'CDC - Pneumonia',
        url: 'https://www.cdc.gov',
        relevance: 0.88,
        excerpt: 'Laboratory and imaging findings support clinical diagnosis.',
        category: 'Government',
      },
    ],
    'heart failure': [
      {
        title: 'Heart Failure Management',
        source: 'American Heart Association',
        url: 'https://www.heart.org',
        relevance: 0.93,
        excerpt: 'Evidence-based management improves outcomes in heart failure.',
        category: 'Guidelines',
      },
      {
        title: 'BNP as Diagnostic Marker',
        source: 'New England Journal of Medicine',
        url: 'https://www.nejm.org',
        relevance: 0.85,
        excerpt: 'Natriuretic peptides aid in diagnosis of heart failure.',
        category: 'Research',
      },
    ],
    'hypertension': [
      {
        title: '2017 ACC/AHA Hypertension Guidelines',
        source: 'American College of Cardiology',
        url: 'https://www.acc.org',
        relevance: 0.94,
        excerpt: 'Blood pressure targets and medication selection guidelines.',
        category: 'Guidelines',
      },
      {
        title: 'Antihypertensive Medication Review',
        source: 'The Lancet',
        url: 'https://www.thelancet.com',
        relevance: 0.87,
        excerpt: 'Comparative effectiveness of antihypertensive agents.',
        category: 'Research',
      },
    ],
    'diabetes': [
      {
        title: 'Type 2 Diabetes Management',
        source: 'American Diabetes Association',
        url: 'https://www.diabetes.org',
        relevance: 0.93,
        excerpt: 'Comprehensive management strategy for type 2 diabetes.',
        category: 'Guidelines',
      },
      {
        title: 'Glycemic Control and CVD Risk',
        source: 'Diabetes Care Journal',
        url: 'https://care.diabetesjournals.org',
        relevance: 0.88,
        excerpt: 'Impact of glycemic control on cardiovascular outcomes.',
        category: 'Research',
      },
    ],
  };

  constructor() {}

  /**
   * Retrieve evidence for a clinical condition
   */
  async retrieveEvidence(
    _consultationId: string,
    condition?: string,
  ): Promise<Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
    category?: string;
  }>> {
    // In production, would query based on extracted diagnoses
    // For Phase 2, return empty - to be populated by AI in later phases

    if (condition) {
      const evidence = this.evidenceDatabase[condition.toLowerCase()] || [];
      return evidence;
    }

    return this.getGeneralEvidence();
  }

  /**
   * Get guidelines for a diagnosis
   */
  async getGuidelinesForDiagnosis(diagnosis: string): Promise<Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
  }>> {
    const evidence = this.evidenceDatabase[diagnosis.toLowerCase()] || [];
    return evidence.filter((e) => e.category === 'Guidelines');
  }

  /**
   * Get research evidence for condition
   */
  async getResearchEvidence(condition: string): Promise<Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
  }>> {
    const evidence = this.evidenceDatabase[condition.toLowerCase()] || [];
    return evidence.filter((e) => e.category === 'Research');
  }

  /**
   * Get government/public health guidance
   */
  async getPublicHealthGuidance(condition: string): Promise<Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
  }>> {
    const evidence = this.evidenceDatabase[condition.toLowerCase()] || [];
    return evidence.filter((e) => e.category === 'Government');
  }

  /**
   * Get most relevant evidence
   */
  async getTopEvidenceResults(
    condition: string,
    limit: number = 5,
  ): Promise<Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
  }>> {
    const evidence = this.evidenceDatabase[condition.toLowerCase()] || [];
    return evidence
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Search evidence by keyword
   */
  async searchEvidence(keyword: string): Promise<Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
  }>> {
    const results: Array<{
      title: string;
      source: string;
      url?: string;
      relevance: number;
      excerpt?: string;
    }> = [];

    Object.values(this.evidenceDatabase).forEach((evidence) => {
      evidence.forEach((item) => {
        if (
          item.title.toLowerCase().includes(keyword.toLowerCase()) ||
          item.excerpt?.toLowerCase().includes(keyword.toLowerCase())
        ) {
          results.push(item);
        }
      });
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Get treatment recommendations from evidence
   */
  async getTreatmentRecommendations(
    diagnosis: string,
  ): Promise<{
    diagnosis: string;
    firstLine: string[];
    alternative: string[];
    evidence: Array<{
      source: string;
      url?: string;
    }>;
  }> {
    // Simplified treatment recommendations
    const treatmentMap: {
      [key: string]: {
        firstLine: string[];
        alternative: string[];
      };
    } = {
      'acute coronary syndrome': {
        firstLine: [
          'Aspirin 325mg PO',
          'P2Y12 Inhibitor (Clopidogrel/Prasugrel/Ticagrelor)',
          'Beta-blocker',
          'ACE inhibitor',
          'Statin',
        ],
        alternative: [
          'Anticoagulation (Heparin or Enoxaparin)',
          'Glycoprotein IIb/IIIa inhibitor',
        ],
      },
      pneumonia: {
        firstLine: [
          'Amoxicillin-clavulanate (community-acquired)',
          'Respiratory fluoroquinolone',
        ],
        alternative: [
          'Azithromycin',
          'Third-generation cephalosporin',
        ],
      },
      'heart failure': {
        firstLine: [
          'ACE inhibitor or Angiotensin Receptor Blocker',
          'Beta-blocker',
          'Aldosterone antagonist',
          'Diuretics',
        ],
        alternative: [
          'Hydralazine-nitrate',
          'SGLT2 inhibitors',
        ],
      },
      hypertension: {
        firstLine: [
          'ACE inhibitor',
          'Angiotensin Receptor Blocker',
          'Thiazide diuretic',
          'Calcium channel blocker',
        ],
        alternative: [
          'Beta-blocker',
          'Alpha-blocker',
        ],
      },
    };

    const treatment = treatmentMap[diagnosis.toLowerCase()] || {
      firstLine: [],
      alternative: [],
    };
    const guidelines = await this.getGuidelinesForDiagnosis(diagnosis);

    return {
      diagnosis,
      ...treatment,
      evidence: guidelines.map((g) => ({
        source: g.source,
        url: g.url,
      })),
    };
  }

  /**
   * Get drug interaction information
   */
  async checkDrugInteractions(
    medications: string[],
  ): Promise<Array<{
    drug1: string;
    drug2: string;
    severity: 'critical' | 'moderate' | 'minor';
    description: string;
    action: string;
  }>> {
    // Simplified drug interaction checking
    // In production would connect to real database

    const interactions: Array<{
      drug1: string;
      drug2: string;
      severity: 'critical' | 'moderate' | 'minor';
      description: string;
      action: string;
    }> = [];

    // Check common interactions
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i].toLowerCase();
        const med2 = medications[j].toLowerCase();

        // Warfarin interactions
        if ((med1.includes('warfarin') && med2.includes('aspirin')) ||
            (med1.includes('aspirin') && med2.includes('warfarin'))) {
          interactions.push({
            drug1: medications[i],
            drug2: medications[j],
            severity: 'moderate',
            description: 'Increased bleeding risk',
            action: 'Monitor INR; consider alternative if possible',
          });
        }

        // ACE inhibitor + potassium
        if ((med1.includes('lisinopril') && med2.includes('potassium')) ||
            (med1.includes('potassium') && med2.includes('lisinopril'))) {
          interactions.push({
            drug1: medications[i],
            drug2: medications[j],
            severity: 'moderate',
            description: 'Hyperkalemia risk',
            action: 'Monitor potassium levels; adjust as needed',
          });
        }
      }
    }

    return interactions;
  }

  /**
   * Get general evidence
   */
  private getGeneralEvidence(): Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
  }> {
    return [
      {
        title: 'Clinical Decision Support Best Practices',
        source: 'Journal of Medical Systems',
        url: 'https://example.com',
        relevance: 0.8,
        excerpt: 'Evidence-based clinical decisions improve patient outcomes.',
      },
    ];
  }

  /**
   * Get recommendation summary
   */
  async getEvidenceSummary(condition: string): Promise<string> {
    const evidence = await this.getTopEvidenceResults(condition, 3);

    if (evidence.length === 0) {
      return `No specific evidence available for ${condition}. Recommend literature search.`;
    }

    const titles = evidence.map((e) => `• ${e.title}`).join('\n');
    return `Top evidence for ${condition}:\n${titles}`;
  }
}
