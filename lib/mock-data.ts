/**
 * Mock data for development
 */

export interface Publisher {
  id: string;
  name: string;
  logo: string;
}

export interface Tender {
  id: string;
  title: string;
  publisher: Publisher;
  category: string;
  deadline: string;
  status: "Active" | "Closed" | "Draft" | "Awarded" | "Cancelled";
  description: string;
  publishedDate: string;
  budget?: string;
  type: "Public" | "Private";
  location?: string;
}

export const mockPublishers: Publisher[] = [
  {
    id: "1",
    name: "Ministry of Construction",
    logo: "https://ui-avatars.com/api/?name=Ministry+of+Construction&background=2563EB&color=fff",
  },
  {
    id: "2",
    name: "Department of Health",
    logo: "https://ui-avatars.com/api/?name=Department+of+Health&background=10B981&color=fff",
  },
  {
    id: "3",
    name: "Transport Authority",
    logo: "https://ui-avatars.com/api/?name=Transport+Authority&background=F59E0B&color=fff",
  },
  {
    id: "4",
    name: "National Water Board",
    logo: "https://ui-avatars.com/api/?name=National+Water+Board&background=06B6D4&color=fff",
  },
  {
    id: "5",
    name: "Ministry of Education",
    logo: "https://ui-avatars.com/api/?name=Ministry+of+Education&background=8B5CF6&color=fff",
  },
];

export const mockTenders: Tender[] = [
  {
    id: "TND-2024-001",
    title: "Construction of Main Government Building Complex",
    publisher: mockPublishers[0],
    category: "Construction",
    deadline: "2024-12-30",
    status: "Active",
    description:
      "Seeking qualified contractors for the construction of a new government administrative complex. The project includes a 10-story main building with modern facilities, parking structure, and landscaping.",
    publishedDate: "2024-09-15",
    budget: "$5,000,000 - $8,000,000",
    type: "Public",
    location: "Colombo, Sri Lanka"
  },
  {
    id: "TND-2024-002",
    title: "Medical Equipment Supply for Regional Hospitals",
    publisher: mockPublishers[1],
    category: "Healthcare",
    deadline: "2024-11-20",
    status: "Active",
    description:
      "Procurement of advanced medical equipment including MRI machines, CT scanners, and patient monitoring systems for three regional hospitals.",
    publishedDate: "2024-09-10",
    budget: "$2,500,000",
    type: "Public",
    location: "Kandy, Sri Lanka"
  },
  {
    id: "TND-2024-003",
    title: "Road Infrastructure Development - Phase 2",
    publisher: mockPublishers[2],
    category: "Infrastructure",
    deadline: "2024-12-15",
    status: "Active",
    description:
      "Development and upgrading of 50km of rural roads including bridges, drainage systems, and road safety features.",
    publishedDate: "2024-09-20",
    budget: "$10,000,000 - $15,000,000",
    type: "Public",
    location: "Galle, Sri Lanka"
  },
  {
    id: "TND-2024-004",
    title: "Water Treatment Plant Modernization",
    publisher: mockPublishers[3],
    category: "Infrastructure",
    deadline: "2024-11-25",
    status: "Active",
    description:
      "Upgrade and modernization of existing water treatment facilities including new filtration systems, chemical dosing equipment, and automation systems.",
    publishedDate: "2024-09-18",
    budget: "$3,200,000",
    type: "Public",
    location: "Kurunegala, Sri Lanka"
  },
  {
    id: "TND-2024-005",
    title: "School IT Infrastructure Upgrade - District Wide",
    publisher: mockPublishers[4],
    category: "IT & Technology",
    deadline: "2024-11-28",
    status: "Active",
    description:
      "Supply and installation of computer labs, networking equipment, and educational software for 25 schools across the district.",
    publishedDate: "2024-09-22",
    budget: "$1,800,000",
    type: "Public",
    location: "Jaffna, Sri Lanka"
  },
];

export interface AnalyticsData {
  value: number;
  change: number;
  data: number[];
}

export interface TenderAnalytics {
  views: AnalyticsData;
  visitors: AnalyticsData;
  downloads: AnalyticsData;
  questions: AnalyticsData;
}

export const mockAnalytics: TenderAnalytics = {
  views: {
    value: 1247,
    change: 12,
    data: [100, 120, 115, 140, 135, 160, 155, 170, 165, 185, 180, 200, 195, 210],
  },
  visitors: {
    value: 890,
    change: 8,
    data: [70, 85, 80, 95, 90, 110, 105, 120, 115, 130, 125, 140, 135, 150],
  },
  downloads: {
    value: 234,
    change: -3,
    data: [20, 25, 22, 28, 26, 30, 28, 32, 30, 28, 26, 24, 22, 23],
  },
  questions: {
    value: 89,
    change: 15,
    data: [5, 7, 6, 9, 8, 11, 10, 13, 12, 14, 13, 15, 14, 16],
  },
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  position: string;
  role: "Owner" | "Member";
  status: "Active" | "Pending" | "Inactive";
}

export const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@company.com",
    position: "CEO",
    role: "Owner",
    status: "Active",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@company.com",
    position: "Project Manager",
    role: "Member",
    status: "Active",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob.johnson@company.com",
    position: "Bid Specialist",
    role: "Member",
    status: "Pending",
  },
];
