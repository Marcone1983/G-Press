import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sendPressRelease } from "./email";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================
  // JOURNALISTS API
  // ============================================
  journalists: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        country: z.string().optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional())
      .query(({ input }) => db.getAllJournalists(input)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getJournalistById(input.id)),

    count: publicProcedure.query(() => db.getJournalistCount()),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        outlet: z.string().max(255).optional(),
        position: z.string().max(255).optional(),
        category: z.enum(["technology", "business", "finance", "health", "sports", "entertainment", "politics", "lifestyle", "general"]).optional(),
        country: z.string().max(2).optional(),
        city: z.string().max(100).optional(),
        phone: z.string().max(50).optional(),
        twitter: z.string().max(100).optional(),
        linkedin: z.string().max(255).optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createJournalist(input)),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().max(320).optional(),
        outlet: z.string().max(255).optional(),
        position: z.string().max(255).optional(),
        category: z.enum(["technology", "business", "finance", "health", "sports", "entertainment", "politics", "lifestyle", "general"]).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateJournalist(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteJournalist(input.id)),

    bulkCreate: protectedProcedure
      .input(z.array(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        outlet: z.string().max(255).optional(),
        category: z.enum(["technology", "business", "finance", "health", "sports", "entertainment", "politics", "lifestyle", "general"]).optional(),
      })))
      .mutation(({ input }) => db.bulkCreateJournalists(input)),
  }),

  // ============================================
  // PRESS RELEASES API
  // ============================================
  pressReleases: router({
    list: protectedProcedure.query(({ ctx }) => 
      db.getAllPressReleases(ctx.user.id)
    ),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getPressReleaseById(input.id)),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        subtitle: z.string().max(500).optional(),
        content: z.string().min(1),
        category: z.enum(["technology", "business", "finance", "health", "sports", "entertainment", "politics", "lifestyle", "general"]).optional(),
        boilerplate: z.string().optional(),
        contactName: z.string().max(255).optional(),
        contactEmail: z.string().email().max(320).optional(),
        contactPhone: z.string().max(50).optional(),
      }))
      .mutation(({ ctx, input }) => 
        db.createPressRelease({ ...input, userId: ctx.user.id })
      ),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        subtitle: z.string().max(500).optional(),
        content: z.string().min(1).optional(),
        category: z.enum(["technology", "business", "finance", "health", "sports", "entertainment", "politics", "lifestyle", "general"]).optional(),
        status: z.enum(["draft", "scheduled", "sending", "sent", "failed"]).optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updatePressRelease(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deletePressRelease(input.id)),

    // Send press release to all journalists
    send: protectedProcedure
      .input(z.object({
        pressReleaseId: z.number(),
        categoryFilter: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await sendPressRelease(input.pressReleaseId, input.categoryFilter);
        return result;
      }),

    getStats: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getDistributionStats(input.id)),
  }),

  // ============================================
  // TEMPLATES API
  // ============================================
  templates: router({
    list: protectedProcedure.query(({ ctx }) => 
      db.getAllTemplates(ctx.user.id)
    ),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        subject: z.string().max(500).optional(),
        content: z.string().min(1),
        isDefault: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => 
        db.createTemplate({ ...input, userId: ctx.user.id })
      ),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteTemplate(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
