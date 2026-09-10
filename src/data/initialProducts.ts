import { Product } from "../types";
import productsData from "./products.json";

export const INITIAL_PRODUCTS: Product[] = productsData as unknown as Product[];
