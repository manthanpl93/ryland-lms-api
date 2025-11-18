// 1. Asset Type (for branding/certificates)
export interface Asset {
  status: "finished";
  objectUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

// 2. Core Location Structure
interface CoreLocation {
  name: string;
  type: "location";
}

// 3. Parent Location (Strict)
export interface ParentLocation extends CoreLocation {
  isParentLocation: true;
  childLocations: string[];
  parentLocation?: never;
  brandingLogo?: never;
  certificateLogo?: never;
  certificateIcon?: never;
  hrEmails?: never;
}

// 4. Child Location (Strict)
export interface ChildLocation extends CoreLocation {
  isParentLocation: false;
  parentLocation: string;
  childLocations?: never;
  brandingLogo?: Asset;
  certificateLogo?: Asset;
  certificateIcon?: Asset;
  hrEmails?: string[];
}

// 5. Combined Location Type
export type Location = ParentLocation | ChildLocation;

// 6. API Data Transfer Objects
export type CreateLocationDto = Location;

export type LocationResponseDto = Location & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

// 7. Query Parameters
export interface LocationQueryParams {
  isParentLocation?: boolean;
  parentLocation?: string;
  name?: string;
  skip?: number;
  limit?: number;
}

// 8. Paginated Response Type
export type PaginatedLocationResponse = {
  data: LocationResponseDto[];
  skip: number;
  limit: number;
  total: number;
};
