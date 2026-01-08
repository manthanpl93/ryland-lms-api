import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest, Forbidden } from "@feathersjs/errors";

export class ForumTags extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async create(data: any, params?: Params): Promise<any> {
    // Normalize tag name
    if (data.name) {
      data.name = data.name.toLowerCase().trim();
    }

    // Add createdBy from authenticated user
    if (params?.user?._id) {
      data.createdBy = params.user._id;
    }

    // Set default color if not provided
    if (!data.color) {
      data.color = "#3B82F6";
    }

    return super.create(data, params);
  }

  async find(params?: Params): Promise<any> {
    // Default to showing only active tags
    if (!params) params = {};
    if (!params.query) params.query = {};
    
    if (params.query.isActive === undefined) {
      params.query.isActive = true;
    }

    // Handle search parameter for autocomplete
    if (params.query.$search) {
      const searchTerm = params.query.$search;
      delete params.query.$search;
      
      params.query.name = {
        $regex: `^${searchTerm}`,
        $options: "i",
      };
    }

    // Sort by usageCount desc, then name asc
    if (!params.query.$sort) {
      params.query.$sort = {
        usageCount: -1,
        name: 1,
      };
    }

    return super.find(params);
  }

  async patch(id: any, data: any, params?: Params): Promise<any> {
    // Normalize tag name if being updated
    if (data.name) {
      data.name = data.name.toLowerCase().trim();
    }

    // Don't allow updating createdBy or usageCount directly
    delete data.createdBy;
    delete data.usageCount;

    return super.patch(id, data, params);
  }

  async remove(id: any, params?: Params): Promise<any> {
    // Soft delete: set isActive to false instead of actually deleting
    return super.patch(id, { isActive: false }, params);
  }
}

