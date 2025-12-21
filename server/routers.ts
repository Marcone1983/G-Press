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
import * as autopilotSystem from "./autopilot-system.js";
import * as trendDetection from "./trend-detection.js";
import * as articleCache from "./article-cache.js";
import * as d1 from "./cloudflare-d1.js";
import * as backup from "./backup.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logolist: protectedProcedureutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================
  // JOURNALISTS API
  // ============================================
  journalists: router({
    // SECURED: Requires authentication to protect journalist data
    list: protectedProcedure
      .input(
        z.object({
          category: z.string().optional(),
          country: z.string().optional(),
          search: z.string().optional(),
          isActive: z.boolean().optional(),
        }).optional()
      )
      .query(({ input }) => db.getAllJournalists(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getJournalistById(input.id)),

    count: protectedProcedure.query(() => db.getJournalistCount()),

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
    // SECURED: Requires authentication to prevent spam abuse
    send: protectedProcedure
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
    processHourlyBatch: protectedProcedure.mutation(async () => {
      // This will be called by cron, processes all active autopilot campaigns
      // NOTE: This procedure is protected, the cron service must be authenticated or use a dedicated secret.
      return autopilotSystem.runAutopilotCycle();
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

  // ============================================
  // AUTONOMOUS AUTOPILOT SYSTEM
  // Sistema completamente autonomo per GROWVERSE
  // ============================================
  autonomousAutopilot: router({
    // Esegui ciclo autopilota (chiamato ogni ora dal cron)
    // SECURED: Requires cron secret or authentication
    // NOTE: Changed from publicProcedure to protectedProcedure to prevent DoS/Abuse (P0)
    rurunCycle: protectedProcedure.mutation(async () => {{
      return autopilotSystem.runAutopilotCycle();
    }),

    // Ottieni stato autopilota
    // SECURED: Requires authentication
    ggetStatus: protectedProcedure.query(async () => { {
      return autopilotSystem.getAutopilotStatus();
    }),

    // Attiva/disattiva autopilota
    setActive: protectedProcedure
      .input(z.object({ active: z.boolean() }))
      .mutation(async ({ input }) => {
        await autopilotSystem.setAutopilotActive(input.active);
        return { success: true, active: input.active };
      }),

    // Approva articolo generato
    approveArticle: protectedProcedure
      .input(z.object({ articleId: z.string() }))
      .mutation(({ input }) => {
        return autopilotSystem.approveAutopilotArticle(input.articleId);
      }),

    // Rifiuta articolo generato
    rejectArticle: protectedProcedure
      .input(z.object({ articleId: z.string(), reason: z.string().optional() }))
      .mutation(({ input }) => {
        return autopilotSystem.rejectAutopilotArticle(input.articleId, input.reason);
      }),

    // Analizza e impara dai risultati
    analyzeAndLearn: protectedProcedure.query(async () => {
      return autopilotSystem.analyzeAndLearn();
    }),
  }),

  // ============================================
  // TREND DETECTION
  // ============================================
  trends: router({
    // Rileva trend attuali
    // SECURED: Requires authentication to prevent API abuse
    ddetect: protectedProcedure.query(async () => { {
      return trendDetection.detectTrends();
    }),

    // Controlla se generare articolo
    // SECURED: Requires authentication
    shouldGenerate: protectedProcedure.query(async () => {
      const analysis = await trendDetection.detectTrends();
      return trendDetection.shouldGenerateArticle(analysis);
    }),
  }),

  // ============================================
  // JOURNALIST RANKING
  // ============================================
  ranking: router({
    // Ottieni ranking completo
    getAll: protectedProcedure.query(async () => {
      return autopilotSystem.calculateJournalistRankings();
    }),

    // Ottieni top giornalisti per campagna
    getTopForCampaign: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        category: z.string().optional(),
        country: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return autopilotSystem.getTopJournalistsForCampaign(
          input.limit,
          input.category,
          input.country
        );
      }),
  }),

  // ============================================
  // ARTICLE CACHE - Articoli di successo
  // ============================================
  articleCache: router({
    // Statistiche cache
    stats: protectedProcedure.query(async () => {
      return articleCache.getCacheStats();
    }),

    // Lista articoli di successo
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return articleCache.getSuccessfulArticles(
          input?.category,
          input?.limit || 10
        );
      }),

    // Trova articolo simile per template
    findSimilar: protectedProcedure
      .input(z.object({
        category: z.string(),
        keywords: z.array(z.string()),
      }))
      .query(async ({ input }) => {
        return articleCache.findSimilarSuccessfulArticle(
          input.category,
          input.keywords
        );
      }),

    // Aggiorna cache analizzando tutti gli articoli
    refresh: protectedProcedure.mutation(async ({ ctx }) => {
      return articleCache.refreshArticleCache(ctx.user.id);
    }),
  }),

  // ============================================
  // CLOUDFLARE D1 - DATABASE PERSISTENTE
  // Tutti i dati sotto il controllo dell'utente
  // ============================================
  cloudflare: router({
    // Inizializza database (crea tabelle se non esistono)
    init: protectedProcedure.mutation(async () => {
      return d1.initializeDatabase();
    }),

    // ---- KNOWLEDGE BASE ----
    documents: router({
      list: protectedProcedure.query(async () => {
        return d1.getAllDocuments();
      }),
      
      save: protectedProcedure
        .input(z.object({
          title: z.string(),
          content: z.string(),
          type: z.string().optional(),
          category: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await d1.saveDocument(input);
          return { success: !!id, id };
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return d1.deleteDocument(input.id);
        }),
    }),

    // ---- FINE-TUNING Q&A ----
    qa: router({
      list: protectedProcedure.query(async () => {
        return d1.getAllQA();
      }),
      
      save: protectedProcedure
        .input(z.object({
          question: z.string(),
          answer: z.string(),
          category: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await d1.saveQA(input);
          return { success: !!id, id };
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return d1.deleteQA(input.id);
        }),
    }),

    // ---- PRESS RELEASES ----
    pressReleases: router({
      list: protectedProcedure.query(async () => {
        return d1.getAllPressReleases();
      }),
      
      save: protectedProcedure
        .input(z.object({
          title: z.string(),
          content: z.string(),
          subject: z.string().optional(),
          category: z.string().optional(),
          recipientsCount: z.number(),
        }))
        .mutation(async ({ input }) => {
          const id = await d1.savePressRelease(input);
          return { success: !!id, id };
        }),
    }),

    // ---- EMAIL TRACKING ----
    tracking: router({
      stats: protectedProcedure.query(async () => {
        return d1.getEmailStats();
      }),
      
      track: protectedProcedure
        .input(z.object({
          pressReleaseId: z.number().optional(),
          journalistEmail: z.string(),
          journalistName: z.string().optional(),
          eventType: z.string(),
          eventData: z.any().optional(),
        }))
        .mutation(async ({ input }) => {
          return d1.trackEmailEvent(input);
        }),
    }),

    // ---- AUTOPILOT STATE ----
    autopilot: router({
      status: protectedProcedure.query(async () => {
        return d1.getAutopilotState();
      }),
      
      update: protectedProcedure
        .input(z.object({
          isActive: z.boolean().optional(),
          trendsAnalyzed: z.number().optional(),
          articlesGenerated: z.number().optional(),
          articlesSent: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return d1.updateAutopilotState(input);
        }),
    }),

    // ---- JOURNALIST RANKINGS ----
    rankings: router({
      top: protectedProcedure
        .input(z.object({ limit: z.number().optional() }).optional())
        .query(async ({ input }) => {
          return d1.getTopJournalists(input?.limit || 50);
        }),
      
      update: protectedProcedure
        .input(z.object({
          email: z.string(),
          name: z.string().optional(),
          opens: z.number().optional(),
          clicks: z.number().optional(),
          totalSent: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return d1.updateJournalistRanking(input);
        }),
    }),

    // ---- SUCCESSFUL ARTICLES CACHE ----
    cache: router({
      list: protectedProcedure
        .input(z.object({
          category: z.string().optional(),
          limit: z.number().optional(),
        }).optional())
        .query(async ({ input }) => {
          return d1.getSuccessfulArticlesFromCache(input?.category, input?.limit || 10);
        }),
      
      save: protectedProcedure
        .input(z.object({
          title: z.string(),
          content: z.string(),
          subject: z.string().optional(),
          category: z.string().optional(),
          openRate: z.number(),
          clickRate: z.number(),
          keywords: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input }) => {
          return d1.cacheSuccessfulArticle(input);
        }),
    }),

    // ---- SEND PATTERNS (LEARNING) ----
    patterns: router({
      bestTime: protectedProcedure
        .input(z.object({
          country: z.string().optional(),
          category: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
          return d1.getBestSendTime(input?.country, input?.category);
        }),
      
      list: protectedProcedure.query(async () => {
        return d1.getAllSendPatterns();
      }),
      
      save: protectedProcedure
        .input(z.object({
          country: z.string().optional(),
          category: z.string().optional(),
          bestHour: z.number(),
          bestDay: z.number(),
          avgOpenRate: z.number(),
          avgClickRate: z.number(),
          sampleSize: z.number(),
        }))
        .mutation(async ({ input }) => {
          return d1.saveSendPattern(input);
        }),
    }),

    // ---- CUSTOM JOURNALISTS ----
    customJournalists: router({
      list: protectedProcedure.query(async () => {
        return d1.getAllCustomJournalists();
      }),
      
      save: protectedProcedure
        .input(z.object({
          name: z.string(),
          email: z.string(),
          outlet: z.string().optional(),
          category: z.string().optional(),
          country: z.string().optional(),
          isVip: z.boolean().optional(),
          isBlacklisted: z.boolean().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await d1.saveCustomJournalist(input);
          return { success: !!id, id };
        }),
      
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          outlet: z.string().optional(),
          category: z.string().optional(),
          country: z.string().optional(),
          isVip: z.boolean().optional(),
          isBlacklisted: z.boolean().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          return d1.updateCustomJournalist(id, updates);
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return d1.deleteCustomJournalist(input.id);
        }),
    }),

    // ---- EMAIL TEMPLATES ----
    templates: router({
      list: protectedProcedure.query(async () => {
        return d1.getAllEmailTemplates();
      }),
      
      save: protectedProcedure
        .input(z.object({
          name: z.string(),
          subject: z.string().optional(),
          content: z.string(),
          isDefault: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await d1.saveEmailTemplate(input);
          return { success: !!id, id };
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return d1.deleteEmailTemplate(input.id);
        }),
    }),

    // ---- TRAINING EXAMPLES ----
    trainingExamples: router({
      list: protectedProcedure.query(async () => {
        return d1.getAllTrainingExamples();
      }),
      
      save: protectedProcedure
        .input(z.object({
          prompt: z.string(),
          completion: z.string(),
          category: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await d1.saveTrainingExample(input);
          return { success: !!id, id };
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return d1.deleteTrainingExample(input.id);
        }),
    }),

    // ---- FOLLOW-UP SEQUENCES ----
    followups: router({
      list: protectedProcedure.query(async () => {
        return d1.getAllFollowupSequences();
      }),
      
      pending: protectedProcedure.query(async () => {
        return d1.getPendingFollowups();
      }),
      
      save: protectedProcedure
        .input(z.object({
          journalistEmail: z.string(),
          originalSubject: z.string(),
          originalContent: z.string().optional(),
          step: z.number().optional(),
          nextSendAt: z.string().optional(),
          status: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const id = await d1.saveFollowupSequence(input);
          return { success: !!id, id };
        }),
      
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          step: z.number().optional(),
          nextSendAt: z.string().optional(),
          status: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          return d1.updateFollowupSequence(id, updates);
        }),
      
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return d1.deleteFollowupSequence(input.id);
        }),
      
      cancelByEmail: protectedProcedure
        .input(z.object({ email: z.string() }))
        .mutation(async ({ input }) => {
          return d1.cancelFollowupByEmail(input.email);
        }),
    }),

    // ---- APP SETTINGS ----
    settings: router({
      get: protectedProcedure
        .input(z.object({ key: z.string() }))
        .query(async ({ input }) => {
          return d1.getSetting(input.key);
        }),
      
      getAll: protectedProcedure.query(async () => {
        return d1.getAllSettings();
      }),
      
      set: protectedProcedure
        .input(z.object({
          key: z.string(),
          value: z.string(),
        }))
        .mutation(async ({ input }) => {
          return d1.setSetting(input.key, input.value);
        }),
    }),

    // ---- EMAIL TRACKING HISTORY ----
    trackingHistory: router({
      list: protectedProcedure
        .input(z.object({ limit: z.number().optional() }).optional())
        .query(async ({ input }) => {
          return d1.getEmailTrackingHistory(input?.limit || 100);
        }),
    }),

    // ---- BACKUP & RESTORE ----
    backup: router({
      create: protectedProcedure.mutation(async () => {
        return backup.createFullBackup();
      }),
      
      exportJSON: protectedProcedure.query(async () => {
        return backup.exportBackupAsJSON();
      }),
      
      restore: protectedProcedure
        .input(z.any())
        .mutation(async ({ input }) => {
          const validation = backup.validateBackup(input);
          if (!validation.valid) {
            throw new Error(`Invalid backup: ${validation.errors.join(', ')}`);
          }
          return backup.restoreFromBackup(input);
        }),
      
      validate: protectedProcedure
        .input(z.any())
        .query(({ input }) => {
          return backup.validateBackup(input);
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
