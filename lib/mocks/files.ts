export type FileNode = {
  id: string;
  name: string;
  type: "folder" | "file";
  ext?: string;
  size?: string;
  path: string;
  children?: FileNode[];
};

export type HighlightItem = {
  label: string;
  value: string;
};

export interface FilePreviewPage {
  title?: string;
  description?: string;
  bullets?: string[];
  highlights?: HighlightItem[];
  notes?: string[];
}

export interface FilePreviewSection {
  heading: string;
  description?: string;
  bullets?: string[];
  checklist?: string[];
}

export interface FilePreviewTable {
  caption?: string;
  headers: string[];
  rows: string[][];
  footnote?: string;
  highlights?: HighlightItem[];
}

export interface FilePreview {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx" | "image" | "generic";
  summary?: string;
  metadata?: {
    preparedBy?: string;
    lastUpdated?: string;
    version?: string;
    status?: string;
    tags?: string[];
  };
  pages?: FilePreviewPage[];
  sections?: FilePreviewSection[];
  table?: FilePreviewTable;
  previewImage?: string;
  notes?: string[];
}

const mockFilePreviews: Record<string, FilePreview> = {
  "tender-brief": {
    id: "tender-brief",
    name: "Tender_Brief.pdf",
    type: "pdf",
    summary: "Executive summary outlining the scope, objectives, and delivery expectations for the government complex redevelopment.",
    metadata: {
      preparedBy: "Strategic Projects PMO",
      lastUpdated: "2025-05-12",
      version: "1.2",
      status: "Approved",
      tags: ["Overview", "Scope", "Milestones"],
    },
    pages: [
      {
        title: "Project Overview",
        description:
          "The Ministry of Infrastructure is soliciting proposals for the redesign and construction of the Central Government Complex. The project consolidates administrative offices into a single high-efficiency campus.",
        bullets: [
          "Target completion window: Q4 2026",
          "Mandatory site visit scheduled for August 8, 2025",
          "Proposals must include ESG impact assessment",
        ],
        highlights: [
          { label: "Estimated Budget", value: "LKR 3.6B" },
          { label: "Submission Deadline", value: "Aug 14, 2025" },
          { label: "Pre-bid Meeting", value: "Jul 30, 2025 @ 10:00" },
        ],
      },
      {
        title: "Key Deliverables",
        description:
          "Bidders must demonstrate capability across design, LEED-certified construction, and integrated security systems.",
        bullets: [
          "Architectural concept package with 3D massing studies",
          "Full MEP design and load calculations",
          "Construction phasing with disruption mitigation plan",
          "Commissioning and handover documentation",
        ],
        notes: [
          "Provide at least three large-scale references completed in the past five years.",
          "Digital submissions accepted via BidWizer Workspace only.",
        ],
      },
      {
        title: "Evaluation Criteria",
        description:
          "The evaluation committee will weigh technical merit, delivery confidence, and financial competitiveness.",
        bullets: [
          "Technical approach and innovation (35%)",
          "Delivery methodology and staffing (25%)",
          "Financial proposal and payment schedule (25%)",
          "Sustainability commitments (10%)",
          "Local partnership strategy (5%)",
        ],
      },
    ],
  },
  "technical-req": {
    id: "technical-req",
    name: "Technical_Requirements.pdf",
    type: "pdf",
    summary: "Detailed technical specifications covering structural, MEP, and smart building systems.",
    metadata: {
      preparedBy: "Lead Design Authority",
      lastUpdated: "2025-05-05",
      version: "Draft B",
      tags: ["Specifications", "Engineering"],
    },
    pages: [
      {
        title: "Structural Standards",
        description:
          "All structural work must comply with the Sri Lanka National Building Code and reference Eurocode 2 for reinforced concrete design.",
        bullets: [
          "Seismic performance category: Zone 2",
          "Design live load: 5 kN/m² (office), 8 kN/m² (assembly)",
          "Concrete grade minimum: C35/45",
        ],
      },
      {
        title: "Mechanical Systems",
        description:
          "HVAC shall utilise variable refrigerant flow (VRF) with redundancy at 40% of peak load. Incorporate heat recovery ventilators for core areas.",
        bullets: [
          "Cooling load calculations must be provided in spreadsheet format.",
          "BMS integration via BACnet/IP with Modbus gateways for legacy equipment.",
          "Provide acoustic analysis for all AHUs.",
        ],
      },
      {
        title: "Smart Building Requirements",
        description:
          "Implement unified access control, CCTV, and IoT sensors managed through a central command dashboard.",
        bullets: [
          "Minimum 90-day rolling storage for all security footage.",
          "IoT platform must expose webhooks for alerting to third-party tools.",
          "Cybersecurity compliance with ISO/IEC 27001.",
        ],
      },
    ],
  },
  "financial-terms": {
    id: "financial-terms",
    name: "Financial_Terms.pdf",
    type: "pdf",
    summary: "Payment schedule, bonds, and financial compliance obligations for awarded bidders.",
    metadata: {
      preparedBy: "Finance & Treasury",
      lastUpdated: "2025-05-01",
      version: "Final",
      tags: ["Finance", "Compliance"],
    },
    pages: [
      {
        title: "Payment Milestones",
        bullets: [
          "Mobilisation advance: 10% upon contract signing",
          "Phase 1 structural completion: 25%",
          "MEP rough-in completion: 20%",
          "Practical completion: 35%",
          "Final handover and documentation: 10%",
        ],
        highlights: [
          { label: "Retention", value: "5% held for 12 months" },
          { label: "Currency", value: "LKR, indexed to USD" },
        ],
      },
      {
        title: "Financial Guarantees",
        description:
          "Bidders must submit performance guarantees issued by a recognised Sri Lankan bank.",
        bullets: [
          "Bid bond: 2% of total contract value",
          "Performance bond: 10% effective for project duration + 12 months",
          "Advance payment guarantee matching mobilisation amount",
        ],
      },
      {
        title: "Compliance Documentation",
        bullets: [
          "Audited financial statements (last 3 fiscal years)",
          "Statement of tax compliance within past 6 months",
          "Letter confirming absence of ongoing litigation impacting delivery",
        ],
        notes: ["Attach in PDF format within the BidWizer workspace uploads tab."],
      },
    ],
  },
  "floor-plans": {
    id: "floor-plans",
    name: "Floor_Plans.pdf",
    type: "pdf",
    summary: "Level-by-level breakdown of proposed architectural layouts with key dimensions and zones.",
    metadata: {
      preparedBy: "Axis Studio Architects",
      lastUpdated: "2025-04-28",
      version: "Concept 3",
      tags: ["Architecture"],
    },
    pages: [
      {
        title: "Ground Floor",
        description:
          "Public-facing services including registration, stakeholder engagement centre, and the primary auditorium.",
        bullets: [
          "Main lobby double-height volume with natural ventilation stack.",
          "Security screening with three throughput lanes.",
          "Auditorium seating capacity: 420.",
        ],
      },
      {
        title: "Typical Office Level",
        description:
          "Modular office plates supporting a 1:7 desk ratio with collaboration zones at each quadrant.",
        bullets: [
          "Raised floor system with 300mm service void.",
          "Neighbourhood approach with 24-person team clusters.",
          "Dedicated wellness room and focus pods per floor.",
        ],
      },
      {
        title: "Executive Level",
        bullets: [
          "Cabinet meeting suite with acoustic isolation.",
          "Secure circulation path independent of public lifts.",
          "Sky garden terrace for informal engagements.",
        ],
        notes: ["Refer to structural drawing set for column grid and penetrations."],
      },
    ],
  },
  elevations: {
    id: "elevations",
    name: "Elevations.pdf",
    type: "pdf",
    summary: "North, south, east, and west elevation studies illustrating façade treatments and shading strategy.",
    metadata: {
      preparedBy: "Axis Studio Architects",
      lastUpdated: "2025-04-28",
      version: "Concept 3",
      tags: ["Architecture", "Facade"],
    },
    pages: [
      {
        title: "North Elevation",
        description:
          "Primary civic frontage utilising vertical fins and photovoltaic glass panels for solar harvesting.",
        bullets: [
          "Average façade U-value: 0.8 W/m²K",
          "Integrated LED lighting for night-time civic presence",
          "Service core expressed as perforated aluminium screen",
        ],
      },
      {
        title: "South Elevation",
        description:
          "Operational entrance with emphasis on shading and controlled daylight for the open office floors.",
        bullets: [
          "Horizontal louvers calibrated to 23° incidence angle",
          "Green wall system with automated irrigation",
          "Maintenance gantry concealed within upper cornice",
        ],
      },
    ],
  },
  foundation: {
    id: "foundation",
    name: "Foundation_Plans.pdf",
    type: "pdf",
    summary: "Structural foundation layout including pile schedule, grade beams, and load-bearing cores.",
    metadata: {
      preparedBy: "Axis Structural Engineering",
      lastUpdated: "2025-05-02",
      version: "IFC Draft",
      tags: ["Structure"],
    },
    pages: [
      {
        title: "Pile Layout",
        description:
          "200 bored cast in-situ piles with 1.2m diameter at depths between 24m and 32m to achieve design loads.",
        bullets: [
          "Load factors based on geotechnical report GTR-2025-11",
          "Provide static load test results for 5% of piles",
          "Include corrosion protection measures for coastal humidity",
        ],
      },
      {
        title: "Core Foundations",
        bullets: [
          "Central services core walls: 600mm thick RC with double reinforcement grid",
          "Shear walls anchored with 32mm rebar couplers",
          "Allowance for future basement expansion to the south wing",
        ],
      },
    ],
  },
  "material-specs": {
    id: "material-specs",
    name: "Material_Specifications.docx",
    type: "docx",
    summary: "Material standards covering structural systems, interior finishes, and sustainability criteria.",
    metadata: {
      preparedBy: "Procurement Standards Committee",
      lastUpdated: "2025-04-30",
      version: "0.9",
      tags: ["Specifications", "Materials"],
    },
    sections: [
      {
        heading: "Concrete Works",
        description:
          "All structural concrete shall adhere to BS EN 206 with admixtures approved for tropical climates.",
        checklist: [
          "Submit proposed mix design for approval prior to pour.",
          "Provide cylinder tests at 7, 14, and 28 days.",
          "Document curing methodology for elevated slabs.",
        ],
      },
      {
        heading: "Interior Finishes",
        description:
          "Premium public areas require acoustic-rated finishes and durable materials suited to high traffic.",
        bullets: [
          "Lobby flooring: honed granite, slip resistance R11.",
          "Office flooring: low-VOC carpet tiles with 12-year warranty.",
          "Wall cladding in public corridors: recycled timber panels with Class A fire rating.",
        ],
      },
      {
        heading: "Sustainability Requirements",
        bullets: [
          "Minimum 20% recycled content across aggregate supply.",
          "Timber products must hold FSC or PEFC certification.",
          "Paints and sealants to comply with Green Label Plus.",
        ],
      },
    ],
  },
  "quality-standards": {
    id: "quality-standards",
    name: "Quality_Standards.pdf",
    type: "pdf",
    summary: "Quality assurance benchmarks and inspection checklist for critical project milestones.",
    metadata: {
      preparedBy: "Quality Assurance Office",
      lastUpdated: "2025-05-08",
      version: "Issue 2",
      tags: ["Quality", "Compliance"],
    },
    pages: [
      {
        title: "Inspection Matrix",
        description:
          "QA inspections occur at the completion of each structural bay, envelope mock-up, and services commissioning stage.",
        bullets: [
          "Submit inspection reports within 48 hours of site visit.",
          "Non-conformances to be rectified within five working days.",
          "Maintain digital record in BidWizer workspace QA log.",
        ],
      },
      {
        title: "Testing Requirements",
        bullets: [
          "Concrete core tests for every 500 m³ poured.",
          "Air-tightness tests per block before handover.",
          "Integrated systems test prior to practical completion.",
        ],
        notes: ["Attach certified reports within the relevant workspace folder."],
      },
    ],
  },
  boq: {
    id: "boq",
    name: "Bill of Quantities.xlsx",
    type: "xlsx",
    summary: "Cost breakdown across work packages with provisional sums and escalation allowances.",
    metadata: {
      preparedBy: "Commercial Team",
      lastUpdated: "2025-05-10",
      version: "Rev 4",
      tags: ["Finance", "Costing"],
    },
    table: {
      caption: "Summary of primary cost items",
      headers: ["Work Package", "Qty", "Unit", "Rate (LKR)", "Amount (LKR)"],
      rows: [
        ["Site preparation & enabling works", "1", "Lot", "82,500,000", "82,500,000"],
        ["Substructure and foundations", "1", "Lot", "415,000,000", "415,000,000"],
        ["Superstructure (frames & slabs)", "1", "Lot", "1,240,000,000", "1,240,000,000"],
        ["MEP systems (HVAC, electrical, plumbing)", "1", "Lot", "890,000,000", "890,000,000"],
        ["Fit-out & finishes", "1", "Lot", "360,000,000", "360,000,000"],
      ],
      footnote: "Include 7% contingency and reference exchange rate of 1 USD = 303.50 LKR.",
      highlights: [
        { label: "Subtotal", value: "LKR 2,987,500,000" },
        { label: "Escalation Allowance", value: "5% capped" },
      ],
    },
  },
  addendum: {
    id: "addendum",
    name: "Addendum_01.pdf",
    type: "pdf",
    summary: "Clarifications issued after the pre-bid meeting with updated submission checklist.",
    metadata: {
      preparedBy: "Procurement Secretariat",
      lastUpdated: "2025-05-18",
      version: "Addendum 01",
      tags: ["Clarification"],
    },
    pages: [
      {
        title: "Clarifications",
        bullets: [
          "Extended deadline for technical queries to July 25, 2025.",
          "Updated façade specification to permit aluminium composite panels (ACP) with Class A2 rating.",
          "Added requirement for digital twin deliverable at project closeout.",
        ],
        notes: ["Acknowledge receipt of addendum in your submission letter."],
      },
      {
        title: "Submission Checklist Updates",
        bullets: [
          "Include sustainability narrative with measurable KPIs.",
          "Provide evidence of cybersecurity posture for all connected systems.",
          "Attach proposed commissioning schedule as separate PDF.",
        ],
      },
    ],
  },
};

export async function getTenderTree(tenderId: string): Promise<FileNode> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 300));

  return {
    id: "root",
    name: "Tender Documents",
    type: "folder",
    path: "/",
    children: [
      {
        id: "main",
        name: "Main Documents",
        type: "folder",
        path: "/Main Documents",
        children: [
          {
            id: "tender-brief",
            name: "Tender_Brief.pdf",
            type: "file",
            ext: "pdf",
            size: "2.4 MB",
            path: "/Main Documents/Tender_Brief.pdf",
          },
          {
            id: "technical-req",
            name: "Technical_Requirements.pdf",
            type: "file",
            ext: "pdf",
            size: "1.8 MB",
            path: "/Main Documents/Technical_Requirements.pdf",
          },
          {
            id: "financial-terms",
            name: "Financial_Terms.pdf",
            type: "file",
            ext: "pdf",
            size: "945 KB",
            path: "/Main Documents/Financial_Terms.pdf",
          },
        ],
      },
      {
        id: "drawings",
        name: "Technical Drawings",
        type: "folder",
        path: "/Technical Drawings",
        children: [
          {
            id: "architectural",
            name: "Architectural",
            type: "folder",
            path: "/Technical Drawings/Architectural",
            children: [
              {
                id: "floor-plans",
                name: "Floor_Plans.pdf",
                type: "file",
                ext: "pdf",
                size: "5.2 MB",
                path: "/Technical Drawings/Architectural/Floor_Plans.pdf",
              },
              {
                id: "elevations",
                name: "Elevations.pdf",
                type: "file",
                ext: "pdf",
                size: "3.8 MB",
                path: "/Technical Drawings/Architectural/Elevations.pdf",
              },
            ],
          },
          {
            id: "structural",
            name: "Structural",
            type: "folder",
            path: "/Technical Drawings/Structural",
            children: [
              {
                id: "foundation",
                name: "Foundation_Plans.pdf",
                type: "file",
                ext: "pdf",
                size: "2.1 MB",
                path: "/Technical Drawings/Structural/Foundation_Plans.pdf",
              },
            ],
          },
        ],
      },
      {
        id: "specifications",
        name: "Specifications",
        type: "folder",
        path: "/Specifications",
        children: [
          {
            id: "material-specs",
            name: "Material_Specifications.docx",
            type: "file",
            ext: "docx",
            size: "456 KB",
            path: "/Specifications/Material_Specifications.docx",
          },
          {
            id: "quality-standards",
            name: "Quality_Standards.pdf",
            type: "file",
            ext: "pdf",
            size: "1.2 MB",
            path: "/Specifications/Quality_Standards.pdf",
          },
        ],
      },
      {
        id: "boq",
        name: "Bill of Quantities.xlsx",
        type: "file",
        ext: "xlsx",
        size: "823 KB",
        path: "/Bill of Quantities.xlsx",
      },
      {
        id: "addendum",
        name: "Addendum_01.pdf",
        type: "file",
        ext: "pdf",
        size: "234 KB",
        path: "/Addendum_01.pdf",
      },
    ],
  };
}

export async function getFileContent(fileId: string): Promise<FilePreview> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));

  const preview = mockFilePreviews[fileId];

  if (preview) {
    return JSON.parse(JSON.stringify(preview)) as FilePreview;
  }

  return {
    id: fileId,
    name: fileId,
    type: "generic",
    summary: "Preview is not yet available for this file. Download to review the original document.",
  };
}
