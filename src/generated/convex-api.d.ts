/**
 * Snapshot autonome de l API Convex, destine au build Vercel.
 *
 * Le depot console n embarque pas wouri-convex. Les types complets vivent
 * dans le backend ; ici on conserve uniquement les symboles runtime dont
 * le bundler a besoin (api / internal / components).
 */
import type { AnyApi } from "convex/server";

export declare const api: AnyApi;
export declare const internal: AnyApi;
export declare const components: Record<string, unknown>;
