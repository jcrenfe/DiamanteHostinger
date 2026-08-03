import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface BreakfastItem_Key {
  id: UUIDString;
  __typename?: 'BreakfastItem_Key';
}

export interface BreakfastPackage_Key {
  id: UUIDString;
  __typename?: 'BreakfastPackage_Key';
}

export interface GetProductByIdData {
  breakfastItem?: {
    id: UUIDString;
    name: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
  } & BreakfastItem_Key;
}

export interface GetProductByIdVariables {
  id: UUIDString;
}

export interface ListAllPackagesData {
  breakfastPackages: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
  } & BreakfastPackage_Key)[];
}

export interface ListAllProductsData {
  breakfastItems: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
  } & BreakfastItem_Key)[];
}

export interface OrderItem_Key {
  id: UUIDString;
  __typename?: 'OrderItem_Key';
}

export interface Order_Key {
  id: UUIDString;
  __typename?: 'Order_Key';
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface ListAllProductsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllProductsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllProductsData, undefined>;
  operationName: string;
}
export const listAllProductsRef: ListAllProductsRef;

export function listAllProducts(options?: ExecuteQueryOptions): QueryPromise<ListAllProductsData, undefined>;
export function listAllProducts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllProductsData, undefined>;

interface GetProductByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
  operationName: string;
}
export const getProductByIdRef: GetProductByIdRef;

export function getProductById(vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;
export function getProductById(dc: DataConnect, vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;

interface ListAllPackagesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllPackagesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllPackagesData, undefined>;
  operationName: string;
}
export const listAllPackagesRef: ListAllPackagesRef;

export function listAllPackages(options?: ExecuteQueryOptions): QueryPromise<ListAllPackagesData, undefined>;
export function listAllPackages(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllPackagesData, undefined>;

