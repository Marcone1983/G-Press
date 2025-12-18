/**
 * API Client for G-Press Backend
 * Handles communication with the tRPC backend for AI article generation
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// API base URL - uses local server in development, Vercel in production
const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return "/api/trpc";
  }
  return process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/trpc";
};

// ============================================
// TYPES
// ============================================

export interface AIArticleRequest {
  documents: Array<{
    name: string;
    content: string;
    category: string;
  }>;
  companyInfo: {
    name: string;
    ceo: string;
    products: string[];
    strengths: string[];
    industry: string;
  };
  format: "news_brief" | "deep_dive" | "interview" | "case_study" | "announcement";
  targetAudience?: string;
  tone?: "formal" | "conversational" | "technical";
  skipCache?: boolean;
}

export interface AIArticleResponse {
  id?: number;
  title: string;
  subtitle: string;
  content: string;
  tags: string[];
  suggestedCategories: string[];
  estimatedReadTime: number;
  fromCache?: boolean;
  generationTimeMs?: number;
}

// ============================================
// API CLIENT
// ============================================

class APIClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  async setAuthToken(token: string) {
    this.authToken = token;
    await AsyncStorage.setItem("gpress_auth_token", token);
  }

  async loadAuthToken() {
    this.authToken = await AsyncStorage.getItem("gpress_auth_token");
    return this.authToken;
  }

  private async trpcRequest<T>(
    procedure: string,
    input: unknown,
    method: "query" | "mutation" = "mutation"
  ): Promise<T> {
    const url = `${this.baseUrl}/${procedure}`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      method: method === "query" ? "GET" : "POST",
      headers,
      body: method === "mutation" ? JSON.stringify({ json: input }) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.result?.data?.json || data.result?.data || data;
  }

  // AI Article Generation
  async generateArticle(request: AIArticleRequest): Promise<AIArticleResponse> {
    return this.trpcRequest<AIArticleResponse>("ai.generateArticle", request);
  }

  async optimizeSubject(originalSubject: string, historicalData?: Array<{ subject: string; openRate: number }>): Promise<{ suggestions: string[] }> {
    return this.trpcRequest<{ suggestions: string[] }>("ai.optimizeSubject", { originalSubject, historicalData });
  }

  async listArticles(status?: string): Promise<AIArticleResponse[]> {
    return this.trpcRequest<AIArticleResponse[]>("ai.listArticles", { status }, "query");
  }

  async updateArticleStatus(id: number, status: "draft" | "approved" | "sent" | "archived"): Promise<void> {
    return this.trpcRequest<void>("ai.updateStatus", { id, status });
  }

  async deleteArticle(id: number): Promise<void> {
    return this.trpcRequest<void>("ai.deleteArticle", { id });
  }

  // Knowledge Base
  async listDocuments(): Promise<Array<{ id: number; name: string; content: string; category: string; createdAt: string }>> {
    return this.trpcRequest("knowledge.listDocuments", {}, "query");
  }

  async uploadDocument(doc: { name: string; content: string; category?: string; fileType?: string; fileSize?: number }): Promise<number> {
    return this.trpcRequest<number>("knowledge.uploadDocument", doc);
  }

  async deleteDocument(id: number): Promise<void> {
    return this.trpcRequest<void>("knowledge.deleteDocument", { id });
  }

  async getCompanyInfo(): Promise<{ name: string; ceo?: string; industry?: string; products?: string[]; strengths?: string[]; boilerplate?: string; website?: string } | null> {
    return this.trpcRequest("knowledge.getCompanyInfo", {}, "query");
  }

  async saveCompanyInfo(info: { name: string; ceo?: string; industry?: string; products?: string[]; strengths?: string[]; boilerplate?: string; website?: string }): Promise<void> {
    return this.trpcRequest<void>("knowledge.saveCompanyInfo", info);
  }
}

export const apiClient = new APIClient();

// Hybrid mode: tries backend API first, falls back to local generation
export async function generateArticleHybrid(
  request: AIArticleRequest,
  fallbackGenerator: () => Promise<AIArticleResponse>
): Promise<AIArticleResponse & { source: "api" | "local" }> {
  try {
    const article = await apiClient.generateArticle(request);
    return { ...article, source: "api" };
  } catch (error) {
    console.warn("[Hybrid] Backend unavailable, using local generation:", error);
    const localArticle = await fallbackGenerator();
    return { ...localArticle, source: "local" };
  }
}
