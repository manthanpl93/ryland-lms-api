// schools.types.ts - TypeScript types for schools service

export interface ISchool {
  _id?: string;
  schoolName: string;
  schoolType: "public" | "private" | "charter" | "online" | "university" | "college" | "training";
  address: string;
  city: string;
  status: "pending" | "active" | "suspended" | "inactive";
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateSchoolRequest {
  schoolName: string;
  schoolType: "public" | "private" | "charter" | "online" | "university" | "college" | "training";
  address: string;
  city: string;
  status?: "pending" | "active" | "suspended" | "inactive";
}

export interface IUpdateSchoolRequest {
  schoolName?: string;
  schoolType?: "public" | "private" | "charter" | "online" | "university" | "college" | "training";
  address?: string;
  city?: string;
  status?: "pending" | "active" | "suspended" | "inactive";
}

export interface ISchoolResponse extends ISchool {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISchoolsListResponse {
  data: ISchoolResponse[];
  total: number;
}

export interface ISchoolSearchParams {
  status?: string;
  schoolType?: string;
  skip?: number;
  limit?: number;
}

