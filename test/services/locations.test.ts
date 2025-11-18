import { Application } from "@feathersjs/feathers";
import assert from "assert";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { LocationService } from "../../src/services/locations/locations.class";
import { CreateLocationDto, LocationQueryParams } from "../../src/types/locations.types";
import { CategoryModel } from "../../src/models/category.model";

describe("LocationService (End-to-End)", () => {
  let app: Application;
  let service: LocationService;
  let mongod: MongoMemoryServer;

  const mockParentLocation: CreateLocationDto = {
    name: "Parent Location",
    type: "location",
    isParentLocation: true,
    childLocations: [],
  };

  const mockChildLocation: CreateLocationDto = {
    name: "Child Location",
    type: "location",
    isParentLocation: false,
    parentLocation: new mongoose.Types.ObjectId().toHexString(),
  };

  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // Directly provide the required CategoryModel
    app = {
      service: () => ({
        Model: CategoryModel
      })
    } as unknown as Application;

    service = new LocationService(app);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Clear relevant collections
    if (CategoryModel.db.collections["categories"]) {
      await CategoryModel.db.collections["categories"].deleteMany({});
    }
  });

  it("should create and retrieve a ParentLocation", async () => {
    const created = await service.create(mockParentLocation);
    const retrieved = await service.get(created._id.toString());
    assert.strictEqual(retrieved.name, mockParentLocation.name);
    assert.strictEqual(retrieved.isParentLocation, true);
  });

  it("should enforce Parent-Child relationships", async () => {
    const parent = await service.create(mockParentLocation);
    const child = await service.create({
      ...mockChildLocation,
      parentLocation: parent._id.toString(),
    });

    await assert.rejects(
      () => service.patch(child._id.toString(), { isParentLocation: true }),
      { message: "Cannot change location type" }
    );
  });

  it("should reject invalid ParentLocation ID", async () => {
    await assert.rejects(
      () => service.create({ ...mockChildLocation, parentLocation: "invalid" }),
      { message: "Invalid parentLocation ID format." }
    );
  });

  it("should paginate results", async () => {
    await service.create(mockParentLocation);
    await service.create({ ...mockParentLocation, name: "Parent 2" });
    const result = await service.find({ query: { $limit: 1 } });
    assert.strictEqual(result.data.length, 1);
    assert.strictEqual(result.total, 2);
  });
});
