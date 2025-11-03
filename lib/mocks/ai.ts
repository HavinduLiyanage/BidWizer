export type BriefLength = "short" | "medium" | "long";

export type BriefSection = {
  title: string;
  points: string[];
};

export type CoverLetterParams = {
  tenderId: string;
  company: string;
  tone: "formal" | "professional" | "friendly";
  length: "concise" | "standard" | "detailed";
  strengths: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: Citation[];
};

export type Citation = {
  docId: string;
  docName: string;
  page?: number;
  snippet: string;
};

export type AskParams = {
  tenderId: string;
  scope: "file" | "folder" | "entire";
  fileId?: string;
  folderPath?: string;
  question: string;
};

export async function getBrief(
  tenderId: string,
  scope: string,
  length: BriefLength = "medium"
): Promise<BriefSection[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));

  const brief: BriefSection[] = [
    {
      title: "Project Overview",
      points: [
        "Construction of a new 10-story government administrative complex",
        "Total built-up area: approximately 45,000 square meters",
        "Location: Central Business District, with modern facilities and parking structure",
        length !== "short" ? "Project timeline: 24 months from commencement" : "",
      ].filter(Boolean),
    },
    {
      title: "Scope of Work",
      points: [
        "Complete civil and structural construction including foundation work",
        "MEP (Mechanical, Electrical, Plumbing) systems installation",
        "Landscaping and external works",
        length === "long" ? "Interior fit-out for office spaces and public areas" : "",
        length === "long" ? "Installation of modern HVAC, fire safety, and security systems" : "",
      ].filter(Boolean),
    },
    {
      title: "Key Requirements",
      points: [
        "Contractor must have CIDA Grade C1 or higher certification",
        "Minimum 10 years experience in large-scale government projects",
        "Financial capacity: proof of completion of projects worth $5M+ in last 3 years",
        length !== "short" ? "Quality assurance: ISO 9001:2015 certification required" : "",
        length === "long" ? "Safety compliance: OHSAS 18001 or equivalent" : "",
      ].filter(Boolean),
    },
    {
      title: "Budget & Timeline",
      points: [
        "Estimated budget range: $5,000,000 - $8,000,000",
        "Submission deadline: December 30, 2024",
        length !== "short" ? "Project commencement: Q1 2025" : "",
        length === "long" ? "Payment terms: Progress payments on milestone completion" : "",
      ].filter(Boolean),
    },
  ];

  if (length === "long") {
    brief.push({
      title: "Technical Specifications",
      points: [
        "Concrete grade: M30 for structural members",
        "Steel reinforcement: Grade 500 deformed bars",
        "All materials must meet SLSI standards",
        "Foundation: Pile foundation recommended due to soil conditions",
      ],
    });
  }

  return brief;
}

export async function generateCoverLetter(
  params: CoverLetterParams
): Promise<string> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

  const { company, tone, length, strengths } = params;

  const greeting =
    tone === "friendly" ? "Dear Selection Committee," : "To Whom It May Concern:";

  const intro =
    length === "concise"
      ? `${company} is pleased to submit our proposal for the Construction of Main Government Building Complex project.`
      : `We at ${company} are writing to express our strong interest in bidding for the Construction of Main Government Building Complex tender. Our company brings extensive experience and proven expertise to this significant undertaking.`;

  const body =
    length === "detailed"
      ? `With over 15 years of excellence in delivering large-scale government infrastructure projects, ${company} has established itself as a leader in the construction industry. Our track record includes successful completion of similar administrative complexes, demonstrating our capability to meet stringent quality standards and tight deadlines.

${strengths || "Our key strengths include experienced project management teams, state-of-the-art construction equipment, and a commitment to safety and environmental sustainability."}

We understand the critical importance of this project to the government and the community. Our approach combines innovative construction methodologies with strict adherence to specifications, ensuring timely delivery without compromising quality. We maintain ISO 9001:2015 certification and have consistently achieved client satisfaction ratings above 95%.`
      : `${company} has successfully delivered numerous government projects with budgets exceeding $5M. ${
          strengths || "Our experienced team and modern equipment position us perfectly for this project."
        }

We are committed to delivering exceptional quality while maintaining the highest safety standards.`;

  const closing =
    tone === "formal"
      ? "We respectfully request the opportunity to present our detailed proposal and look forward to your favorable consideration."
      : "We would welcome the opportunity to discuss our proposal in detail and demonstrate why we are the ideal partner for this project.";

  return `${greeting}

${intro}

${body}

${closing}

${tone === "friendly" ? "Warm regards," : "Sincerely,"}

[Your Name]
Project Director
${company}`;
}

export async function* askQuestion(params: AskParams): AsyncGenerator<string> {
  await new Promise((r) => setTimeout(r, 300));

  const { question, scope, fileId } = params;

  let answer = "";

  if (question.toLowerCase().includes("budget") || question.toLowerCase().includes("cost")) {
    answer = `Based on the tender documents, the estimated budget range for this project is **$5,000,000 to $8,000,000**. The budget breakdown includes:\n\n- Civil and structural works: ~60%\n- MEP systems: ~25%\n- Finishing and landscaping: ~15%\n\nPayment will be made through progress payments tied to milestone completion, as specified in the Financial Terms document (page 12).`;
  } else if (question.toLowerCase().includes("deadline") || question.toLowerCase().includes("when")) {
    answer = `The submission deadline for this tender is **December 30, 2024, 5:00 PM local time**. Late submissions will not be accepted.\n\nKey dates:\n- Pre-bid meeting: November 15, 2024\n- Last date for queries: December 10, 2024\n- Tender opening: December 31, 2024\n- Expected award notification: January 2025`;
  } else if (
    question.toLowerCase().includes("requirement") ||
    question.toLowerCase().includes("qualification")
  ) {
    answer = `To be eligible for this tender, contractors must meet the following requirements:\n\n**Mandatory Qualifications:**\n1. CIDA Grade C1 or higher certification\n2. Minimum 10 years experience in large-scale government projects\n3. Financial capacity: completed projects worth $5M+ in last 3 years\n4. ISO 9001:2015 certification\n5. Valid tax compliance certificate\n\n**Technical Requirements:**\n- Proof of equipment and machinery ownership or lease agreements\n- Qualified project management team (including registered engineers)\n- Safety certification (OHSAS 18001 or equivalent)`;
  } else if (question.toLowerCase().includes("timeline") || question.toLowerCase().includes("duration")) {
    answer = `The project timeline is **24 months** from the date of commencement, expected to start in Q1 2025.\n\n**Phased Timeline:**\n- Phase 1 (Months 1-6): Foundation and structural framework\n- Phase 2 (Months 7-16): Building envelope and MEP rough-in\n- Phase 3 (Months 17-22): Interior finishing and systems commissioning\n- Phase 4 (Months 23-24): Final inspections and handover\n\nPenalty clauses apply for delays beyond agreed extension periods.`;
  } else {
    answer = `Based on the ${
      scope === "file" ? "selected document" : scope === "folder" ? "documents in this folder" : "tender documents"
    }, I can help you understand:\n\n- **Project scope**: 10-story government administrative complex\n- **Location**: Central Business District\n- **Budget**: $5M - $8M\n- **Timeline**: 24 months\n- **Key requirements**: CIDA C1, 10+ years experience\n\nPlease ask specific questions about budget, requirements, timeline, or technical specifications for more detailed information.`;
  }

  // Stream the response word by word
  const words = answer.split(" ");
  for (let i = 0; i < words.length; i++) {
    yield words[i] + (i < words.length - 1 ? " " : "");
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 40));
  }
}

export function getMockCitations(question: string): Citation[] {
  if (question.toLowerCase().includes("budget") || question.toLowerCase().includes("cost")) {
    return [
      {
        docId: "financial-terms",
        docName: "Financial_Terms.pdf",
        page: 12,
        snippet: "Total project budget estimated between $5,000,000 and $8,000,000...",
      },
      {
        docId: "tender-brief",
        docName: "Tender_Brief.pdf",
        page: 3,
        snippet: "Payment structure: Progress payments on milestone completion...",
      },
    ];
  } else if (question.toLowerCase().includes("requirement")) {
    return [
      {
        docId: "tender-brief",
        docName: "Tender_Brief.pdf",
        page: 8,
        snippet: "Contractor qualifications: CIDA Grade C1 or higher, minimum 10 years...",
      },
      {
        docId: "technical-req",
        docName: "Technical_Requirements.pdf",
        page: 2,
        snippet: "ISO 9001:2015 certification mandatory for all bidders...",
      },
    ];
  }
  return [];
}

export function getAiUsage(): { used: number; total: number } {
  // Could persist in localStorage in a real implementation
  return { used: 84, total: 120 };
}

