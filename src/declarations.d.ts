import { Application as ExpressFeathers } from "@feathersjs/express";
import { Application as FeathersApplication } from "@feathersjs/feathers";

// A mapping of service names to types. Will be extended in service files.
export interface ServiceTypes {}

// Extend the application type to include channel and publish methods
declare module "@feathersjs/feathers" {
  interface Application<ServiceTypes = any> {
    channel(name: string): any;
    publish(callback: (data: any, context: any) => any): void;
    publish(event: string, callback: (data: any, context: any) => any): void;
  }
}

// The application instance type that will be used everywhere else
export type Application = ExpressFeathers<ServiceTypes> & FeathersApplication<ServiceTypes> & { io?: any };
