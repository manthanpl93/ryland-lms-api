import { Application } from "@feathersjs/feathers";
import { Model } from "mongoose";
import {
  Location,
  CreateLocationDto,
  LocationResponseDto,
  LocationQueryParams,
  PaginatedLocationResponse,
} from "../../types/locations.types";

export class LocationService {
  private Model: Model<any>;

  constructor(app: Application) {
    this.Model = app.service("categories").Model;
  }

  async find(params?: {
    query?: LocationQueryParams;
  }): Promise<PaginatedLocationResponse> {
    const {
      name,
      isParentLocation,
      parentLocation,
      skip = 0,
      limit = 10,
    } = params?.query || {};

    // Build filter
    const filter: any = { type: "location" };

    if (isParentLocation !== undefined) {
      filter.isParentLocation = isParentLocation;
    }

    if (parentLocation) {
      filter.parentLocation = parentLocation;
    }

    if (name) {
      filter.name = { $regex: new RegExp(name as string, "i") };
    }

    // Execute paginated query
    const records = await this.Model.find(filter)
      .sort({ name: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec();

    const total = await this.Model.countDocuments(filter);

    return {
      data: records as LocationResponseDto[],
      skip: +skip,
      limit: +limit,
      total,
    };
  }

  async get(id: string): Promise<LocationResponseDto> {
    const result = await this.Model.findById(id).lean().exec();
    return result as unknown as LocationResponseDto;
  }

  async create(data: CreateLocationDto): Promise<LocationResponseDto> {
    const result = await this.Model.create({ ...data, type: "location" });
    return result.toObject() as LocationResponseDto;
  }

  async patch(
    id: string,
    data: Partial<Location>
  ): Promise<LocationResponseDto> {
    const result = await this.Model.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    )
      .lean()
      .exec();
    return result as unknown as LocationResponseDto;
  }

  async remove(id: string): Promise<LocationResponseDto> {
    const result = await this.Model.findByIdAndRemove(id).lean().exec();
    return result as unknown as LocationResponseDto;
  }
}
