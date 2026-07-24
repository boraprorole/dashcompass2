import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listReportsAdminImpl,
  createReportImpl,
  updateReportImpl,
  deleteReportImpl,
  setReportAssignmentImpl,
  createSectionImpl,
  updateSectionImpl,
  deleteSectionImpl,
} from "./reports.server";

export const listReportsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listReportsAdminImpl(context.userId));

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().max(200).optional().nullable(),
      company_id: z.string().uuid().optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
      embed_code: z.string().max(10000).optional().nullable(),
      logo_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
    }).parse(input),
  )
  .handler(async ({ context, data }) =>
    createReportImpl(context.userId, {
      title: data.title || "",
      company_id: data.company_id || null,
      description: data.description || null,
      url: data.url || null,
      embed_code: data.embed_code || null,
      logo_url: data.logo_url || null,
    }),
  );

export const updateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().max(200).optional().nullable(),
      company_id: z.string().uuid().optional().nullable(),
      description: z.string().max(2000).optional().nullable(),
      url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
      embed_code: z.string().max(10000).optional().nullable(),
      logo_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
    }).parse(input),
  )
  .handler(async ({ context, data }) =>
    updateReportImpl(context.userId, {
      id: data.id,
      title: data.title || "",
      company_id: data.company_id || null,
      description: data.description || null,
      url: data.url || null,
      embed_code: data.embed_code || null,
      logo_url: data.logo_url || null,
    }),
  );


export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => deleteReportImpl(context.userId, data.id));

export const setReportAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      reportId: z.string().uuid(),
      userId: z.string().uuid(),
      assigned: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ context, data }) =>
    setReportAssignmentImpl(context.userId, data.reportId, data.userId, data.assigned),
  );

/* ----- Sections ----- */

export const createReportSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      reportId: z.string().uuid(),
      title: z.string().min(1).max(200),
      embed_code: z.string().max(10000).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ context, data }) =>
    createSectionImpl(context.userId, {
      reportId: data.reportId,
      title: data.title,
      embed_code: data.embed_code || null,
    }),
  );

export const updateReportSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200),
      embed_code: z.string().max(10000).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ context, data }) =>
    updateSectionImpl(context.userId, {
      id: data.id,
      title: data.title,
      embed_code: data.embed_code || null,
    }),
  );

export const deleteReportSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => deleteSectionImpl(context.userId, data.id));
