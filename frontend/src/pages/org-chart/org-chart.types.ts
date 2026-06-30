export interface OrgNode {
  id: number;
  name: string;
  code: string;
  status: string;
  children: OrgNode[];
}

