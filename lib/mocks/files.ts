export type FileNode = {
  id: string;
  name: string;
  type: "folder" | "file";
  ext?: string;
  size?: string;
  path: string;
  children?: FileNode[];
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

export async function getFileContent(fileId: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
  
  // Return a mock PDF URL or content
  return `/mock-pdfs/${fileId}.pdf`;
}

