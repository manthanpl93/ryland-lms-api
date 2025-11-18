// users.ts - API functions for user management
// Note: You'll need to implement the actual HTTP client and React Query hooks based on your project setup

import {
  ICreateUserRequest,
  IUpdateUserRequest,
  IUserResponse,
  IUsersListResponse,
  IUserSearchParams
} from "../types/users.types";

export interface Pagination {
  limit: number;
  page: number;
  total: number;
}

export interface Filter {
  status: string;
  role: string;
}

// Actual HTTP client using fetch API
const apiClient = {
  post: async <T>(url: string, data: any): Promise<{ data: T }> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return { data: result };
  },
  
  patch: async <T>(url: string, data: any): Promise<{ data: T }> => {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return { data: result };
  },
  
  get: async <T>(url: string, config?: any): Promise<{ data: T }> => {
    let fullUrl = url;
    
    if (config?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      fullUrl = `${url}?${searchParams.toString()}`;
    }
    
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return { data: result };
  },
  
  delete: async <T>(url: string, config?: any): Promise<{ data: T }> => {
    let fullUrl = url;
    
    if (config?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      fullUrl = `${url}?${searchParams.toString()}`;
    }
    
    const response = await fetch(fullUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return { data: result };
  }
};

// Create a new user
export const createUser = async (userData: ICreateUserRequest): Promise<IUserResponse> => {
  try {
    const response = await apiClient.post<IUserResponse>("users", userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update an existing user
export const updateUser = async (userId: string, userData: IUpdateUserRequest): Promise<IUserResponse> => {
  try {
    const response = await apiClient.patch<IUserResponse>(`users/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch user by ID
export const fetchUserById = async (userId: string): Promise<IUserResponse> => {
  try {
    const response = await apiClient.get<IUserResponse>("users", {
      params: { controller: "get-user-by-id", userId }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch users with pagination and filters
export const fetchUsers = async (params: {
  limit: number;
  skip: number;
  search?: string;
  filter?: Filter;
  sort?: string;
  searchBy?: "mobileNo" | "email" | "name";
}): Promise<IUsersListResponse> => {
  try {
    const queryParams: IUserSearchParams = {
      limit: params.limit,
      skip: params.skip,
      controller: "users"
    };

    if (params.search) {
      queryParams.name = params.search;
      if (params.searchBy) {
        queryParams.searchBy = params.searchBy;
      }
    }

    if (params.filter?.role && params.filter.role !== "all") {
      queryParams.role = params.filter.role;
    }

    if (params.filter?.status && params.filter.status !== "all") {
      queryParams.status = params.filter.status;
    }

    if (params.sort) {
      queryParams.sortQuery = { [params.sort]: 1 };
    }

    const response = await apiClient.get<IUsersListResponse>("users", { params: queryParams });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Bulk delete users
export const deleteBulkUsers = async (userIds: string[]): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>("users/0", {
      params: {
        controller: "bulk_user_delete",
        userIds
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Export users
export const exportUsers = async (): Promise<any> => {
  try {
    const response = await apiClient.get<any>("user-export");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch authors for course creation and notifications
export const fetchAuthors = async (): Promise<IUserResponse[]> => {
  try {
    const response = await apiClient.get<IUserResponse[]>("users", {
      params: { controller: "authors" }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching authors:", error);
    return [];
  }
};

// Custom hook for fetching authors with React Query
export const useAuthors = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useQuery } = require("@tanstack/react-query");
  
  return useQuery({
    queryKey: ["authors"],
    queryFn: fetchAuthors,
  });
};

// Custom hook for fetching users with React Query
export const useUsers = (params: {
  limit: number;
  skip: number;
  search?: string;
  filter?: Filter;
  sort?: string;
  searchBy?: "mobileNo" | "email" | "name";
}) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useQuery } = require("@tanstack/react-query");
  
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => fetchUsers(params),
  });
};

// Custom hook for fetching a single user with React Query
export const useUser = (userId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useQuery } = require("@tanstack/react-query");
  
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
  });
}; 