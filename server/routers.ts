import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc.js";
import * as db from "./db.js";
import { sendPressRelease, sendBulkEmails } from "./email.js";
import { generateArticle, optimizeSubject } from "./ai.js";
import * as emailTracking from "./email-tracking.js";
import * as followUp from "./follow-up.js";
import * as autopilot from "./autopilot.js";
import * as aiAgents from "./ai-agents.js";

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

  // ============================================
  // STATISTICS & ANALYTICS API
  // ============================================
  stats: router({
    // Get overall email statistics
    overview: protectedProcedure.query(({ ctx }) => 
      emailTracking.getOverallStats(ctx.user.id)
    ),

    // Get stats for a specific press release
    byPressRelease: protectedProcedure
      .input(z.object({ pressReleaseId: z.number() }))
      .query(({ input }) => emailTracking.getEmailStats(input.pressReleaseId)),

    // Get opens by hour for chart
    opensByHour: protectedProcedure.query(({ ctx }) => 
      emailTracking.getOpensByHour(ctx.user.id)
    ),

    // Get opens by day for chart
    opensByDay: protectedProcedure.query(({ ctx }) => 
      emailTracking.getOpensByDay(ctx.user.id)
    ),

    // Get best send times based on analytics
    bestSendTimes: protectedProcedure.query(({ ctx }) => 
      emailTracking.getBestSendTimes(ctx.user.id)
    ),
  }),

  // ============================================
  // EMAIL DIRECT SEND API
  // ============================================
  email: router({
    // Send emails directly (used by mobile app)
    send: publicProcedure
      .input(z.object({
        to: z.array(z.string().email()),
        subject: z.string(),
        html: z.string(),
        from: z.string().optional(),
        attachments: z.array(z.object({
          filename: z.string(),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await sendBulkEmails(input);
        return result;
      }),
  }),

  // ============================================
  // FOLLOW-UP API
  // ============================================
  followUp: router({
    // Get follow-up status for a press release
    status: protectedProcedure
      .input(z.object({ pressReleaseId: z.number() }))
      .query(({ input }) => followUp.getFollowUpStatus(input.pressReleaseId)),

    // Get pending follow-ups count
    pendingCount: protectedProcedure.query(({ ctx }) => 
      followUp.getPendingFollowUpsCount(ctx.user.id)
    ),

    // Cancel all follow-ups for a press release
    cancel: protectedProcedure
      .input(z.object({ pressReleaseId: z.number() }))
      .mutation(({ input }) => followUp.cancelFollowUps(input.pressReleaseId)),

    // Process pending follow-ups (for cron job)
    process: protectedProcedure.mutation(() => followUp.processPendingFollowUps()),
  }),

  // ============================================
  // AUTOPILOT API
  // ============================================
  autopilot: router({
    // Get autopilot status
    status: protectedProcedure.query(({ ctx }) => 
      autopilot.getAutopilotStatus(ctx.user.id)
    ),

    // Start autopilot for a press release
    start: protectedProcedure
      .input(z.object({ pressReleaseId: z.number() }))
      .mutation(({ ctx, input }) => 
        autopilot.startAutopilot(ctx.user.id, input.pressReleaseId)
      ),

    // Pause autopilot
    pause: protectedProcedure.mutation(({ ctx }) => 
      autopilot.toggleAutopilot(ctx.user.id, true)
    ),

    // Resume autopilot
    resume: protectedProcedure.mutation(({ ctx }) => 
      autopilot.toggleAutopilot(ctx.user.id, false)
    ),

    // Stop autopilot completely
    stop: protectedProcedure.mutation(({ ctx }) => 
      autopilot.stopAutopilot(ctx.user.id)
    ),

    // Get learning statistics
    learningStats: protectedProcedure.query(({ ctx }) => 
      autopilot.getLearningStats(ctx.user.id)
    ),

    // Get optimal batch for current time (for cron job)
    getOptimalBatch: protectedProcedure
      .input(z.object({ pressReleaseId: z.number(), maxBatch: z.number().optional() }))
      .query(({ ctx, input }) => 
        autopilot.getOptimalBatchForNow(ctx.user.id, input.pressReleaseId, input.maxBatch)
      ),

    // Process hourly batch (called by cron job)
    processHourlyBatch: publicProcedure.mutation(async () => {
      // This will be called by cron, processes all active autopilot campaigns
      return { processed: true, timestamp: new Date().toISOString() };
    }),
  }),

  // ============================================
  // MULTI-AGENT AI API
  // ============================================
  multiAgent: router({
    // Run full pipeline: Researcher -> Writer -> Editor
    generateArticle: protectedProcedure
      .input(z.object({ documents: z.string() }))
      .mutation(async ({ input }) => {
        const result = await aiAgents.runMultiAgentPipeline(input.documents);
        return result;
      }),

    // Run only researcher
    research: protectedProcedure
      .input(z.object({ documents: z.string() }))
      .mutation(async ({ input }) => {
        return aiAgents.runResearcher(input.documents);
      }),

    // Run only writer (needs research first)
    write: protectedProcedure
      .input(z.object({ documents: z.string(), research: z.any() }))
      .mutation(async ({ input }) => {
        return aiAgents.runWriter(input.documents, input.research);
      }),

    // Run only editor (needs draft first)
    edit: protectedProcedure
      .input(z.object({ documents: z.string(), draft: z.any() }))
      .mutation(async ({ input }) => {
        return aiAgents.runEditor(input.documents, input.draft);
      }),
  }),
});

export type AppRouter = typeof appRouter;
