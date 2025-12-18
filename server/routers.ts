import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sendPressRelease } from "./email";
import { generateArticle, optimizeSubject } from "./ai";

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

  // ============================================
  // AI ARTICLE GENERATION API
  // ============================================
  ai: router({
    generateArticle: protectedProcedure
      .input(z.object({
        documents: z.array(z.object({
          name: z.string(),
          content: z.string(),
          category: z.string(),
        })),
        companyInfo: z.object({
          name: z.string(),
          ceo: z.string(),
          products: z.array(z.string()),
          strengths: z.array(z.string()),
          industry: z.string(),
        }),
        format: z.enum(["news_brief", "deep_dive", "interview", "case_study", "announcement"]),
        targetAudience: z.string().optional(),
        tone: z.enum(["formal", "conversational", "technical"]).optional(),
        skipCache: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const startTime = Date.now();
        
        // Check cache first (unless skipCache is true)
        if (!input.skipCache) {
          const cached = await db.getCachedArticle(ctx.user.id, input);
          if (cached) {
            return {
              ...cached,
              fromCache: true,
              generationTimeMs: Date.now() - startTime,
            };
          }
        }
        
        // Generate new article with OpenAI
        const article = await generateArticle(input);
        
        // Save to cache
        const id = await db.cacheArticle(ctx.user.id, input, article);
        
        return {
          id,
          ...article,
          fromCache: false,
          generationTimeMs: Date.now() - startTime,
        };
      }),

    optimizeSubject: publicProcedure
      .input(z.object({
        originalSubject: z.string(),
        historicalData: z.array(z.object({
          subject: z.string(),
          openRate: z.number(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const suggestions = await optimizeSubject(
          input.originalSubject,
          input.historicalData || []
        );
        return { suggestions };
      }),

    listArticles: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ ctx, input }) => db.getUserArticles(ctx.user.id, input?.status)),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "approved", "sent", "archived"]),
      }))
      .mutation(({ input }) => db.updateArticleStatus(input.id, input.status)),

    deleteArticle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteArticle(input.id)),
  }),

  // ============================================
  // KNOWLEDGE BASE API
  // ============================================
  knowledge: router({
    listDocuments: protectedProcedure
      .query(({ ctx }) => db.getKnowledgeDocuments(ctx.user.id)),

    uploadDocument: protectedProcedure
      .input(z.object({
        name: z.string(),
        content: z.string(),
        category: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => db.createKnowledgeDocument(ctx.user.id, input)),

    deleteDocument: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteKnowledgeDocument(input.id)),

    getCompanyInfo: protectedProcedure
      .query(({ ctx }) => db.getCompanyInfo(ctx.user.id)),

    saveCompanyInfo: protectedProcedure
      .input(z.object({
        name: z.string(),
        ceo: z.string().optional(),
        industry: z.string().optional(),
        products: z.array(z.string()).optional(),
        strengths: z.array(z.string()).optional(),
        boilerplate: z.string().optional(),
        website: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.saveCompanyInfo(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
