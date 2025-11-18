import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
const locations = [
  { value: "ch", label: "Chicago" },
  { value: "la", label: "Los Angeles" },
  { value: "nyc", label: "New York City" },
  { value: "sf", label: "San Francisco" },
  { value: "mia", label: "Miami" },
  { value: "sea", label: "Seattle" },
  { value: "atx", label: "Austin" },
  { value: "den", label: "Denver" },
  { value: "phx", label: "Phoenix" },
  { value: "bos", label: "Boston" },
  { value: "atl", label: "Atlanta" },
  { value: "dal", label: "Dallas" },
  { value: "hou", label: "Houston" },
  { value: "det", label: "Detroit" },
  { value: "msp", label: "Minneapolis" },
  { value: "phi", label: "Philadelphia" },
  { value: "por", label: "Portland" },
  { value: "sd", label: "San Diego" },
  { value: "dc", label: "Washington, D.C." },
  { value: "orl", label: "Orlando" },
];
export class Countries extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
  }
}
