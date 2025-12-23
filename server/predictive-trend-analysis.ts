import OpenAI from "openai";

/**
 * Sistema di Analisi Predittiva del Trend (Deep Learning)
 * 
 * Questo sistema utilizza un modello di Deep Learning (simulato tramite GPT-4)
 * per prevedere l'evoluzione e il picco di interesse di un trend con 48 ore di anticipo.
 * 
 * Vantaggi:
 * 1. Permette all'Autopilota di agire in modo proattivo
 * 2. Assicura che gli articoli Growverse vengano pubblicati PRIMA del picco
 * 3. Massimizza la viralità e l'impatto della distribuzione
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TrendPrediction {
  trendName: string;
  currentMomentum: number; // 0-100
  predictedPeakTime: Date;
  hoursUntilPeak: number;
  confidenceScore: number; // 0-100
  recommendedActionTime: Date;
  actionRecommendation: string;
  evolutionForecast: string;
}

/**
 * Analizza un trend e predice il suo picco di interesse.
 * Utilizza un modello di Deep Learning (tramite GPT-4) per l'analisi.
 */
export async function predictTrendPeak(
  trendName: string,
  trendDescription: string,
  historicalData?: {
    timestamp: Date;
    searchVolume: number;
    mentions: number;
  }[]
): Promise<TrendPrediction> {
  // Prepara il contesto per il modello
  const historicalContext = historicalData
    ? historicalData
        .map(
          d =>
            `${d.timestamp.toISOString()}: Volume ${d.searchVolume}, Menzioni ${d.mentions}`
        )
        .join("\n")
    : "Nessun dato storico disponibile";

  const systemPrompt = `Sei un esperto di analisi dei trend e di previsione del momentum dei contenuti virali.
Analizza il trend fornito e predici:
1. Il momento del picco di interesse (in ore da ora)
2. Il livello di fiducia della previsione (0-100)
3. L'azione consigliata (es. "Pubblica immediatamente", "Attendi 12 ore", "Pubblica tra 24-36 ore")
4. L'evoluzione prevista del trend

Rispondi in JSON con questo formato:
{
  "hoursUntilPeak": <numero>,
  "confidenceScore": <0-100>,
  "actionRecommendation": "<stringa>",
  "evolutionForecast": "<descrizione dell'evoluzione prevista>"
}`;

  const userPrompt = `Trend: ${trendName}
Descrizione: ${trendDescription}

Dati Storici:
${historicalContext}

Predici il picco di interesse per questo trend e raccomanda quando pubblicare un articolo per massimizzare la viralità.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const output = response.choices[0]?.message?.content || "{}";

    // Parse JSON response
    let prediction;
    try {
      prediction = JSON.parse(output);
    } catch {
      // Fallback se il parsing JSON fallisce
      prediction = {
        hoursUntilPeak: 24,
        confidenceScore: 50,
        actionRecommendation: "Pubblica entro le prossime 24 ore",
        evolutionForecast: "Trend in crescita, picco previsto tra 24 ore",
      };
    }

    // Calcola i timestamp
    const now = new Date();
    const peakTime = new Date(now.getTime() + prediction.hoursUntilPeak * 60 * 60 * 1000);
    const recommendedActionTime = new Date(
      now.getTime() + Math.max(0, prediction.hoursUntilPeak - 2) * 60 * 60 * 1000
    );

    return {
      trendName,
      currentMomentum: 50, // Simulazione: momentum attuale
      predictedPeakTime: peakTime,
      hoursUntilPeak: prediction.hoursUntilPeak,
      confidenceScore: prediction.confidenceScore,
      recommendedActionTime,
      actionRecommendation: prediction.actionRecommendation,
      evolutionForecast: prediction.evolutionForecast,
    };
  } catch (error) {
    console.error("[Predictive Trend Analysis] Error:", error);
    // Fallback: previsione conservativa
    const now = new Date();
    const peakTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      trendName,
      currentMomentum: 30,
      predictedPeakTime: peakTime,
      hoursUntilPeak: 24,
      confidenceScore: 30,
      recommendedActionTime: new Date(now.getTime() + 22 * 60 * 60 * 1000),
      actionRecommendation: "Pubblica entro le prossime 24 ore (previsione conservativa)",
      evolutionForecast: "Trend in crescita, picco previsto tra 24 ore",
    };
  }
}

/**
 * Analizza più trend e ritorna le previsioni ordinate per urgenza.
 */
export async function predictMultipleTrends(
  trends: Array<{ name: string; description: string }>
): Promise<TrendPrediction[]> {
  const predictions: TrendPrediction[] = [];

  for (const trend of trends) {
    const prediction = await predictTrendPeak(trend.name, trend.description);
    predictions.push(prediction);
  }

  // Ordina per urgenza (trend che raggiungeranno il picco prima)
  predictions.sort((a, b) => a.hoursUntilPeak - b.hoursUntilPeak);

  return predictions;
}

/**
 * Determina se è il momento giusto per pubblicare un articolo basato sulla previsione del trend.
 */
export function shouldPublishNow(prediction: TrendPrediction): boolean {
  const now = new Date();
  const timeDifference = prediction.recommendedActionTime.getTime() - now.getTime();
  const hoursUntilAction = timeDifference / (1000 * 60 * 60);

  // Pubblica se siamo entro 2 ore dal momento consigliato
  return hoursUntilAction <= 2 && hoursUntilAction >= 0;
}

/**
 * Genera una strategia di pubblicazione basata sulla previsione del trend.
 */
export function generatePublicationStrategy(prediction: TrendPrediction): {
  strategy: string;
  urgency: "immediate" | "soon" | "scheduled" | "wait";
  recommendedTime: Date;
  reasoning: string;
} {
  const now = new Date();
  const hoursUntilAction = (prediction.recommendedActionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  let strategy: string;
  let urgency: "immediate" | "soon" | "scheduled" | "wait";
  let reasoning: string;

  if (hoursUntilAction <= 0) {
    strategy = "Pubblica Immediatamente";
    urgency = "immediate";
    reasoning = "Il momento ottimale è ADESSO. Pubblica senza ritardi.";
  } else if (hoursUntilAction <= 2) {
    strategy = "Pubblica Entro le Prossime 2 Ore";
    urgency = "soon";
    reasoning = "Sei nel momento critico. Pubblica al più presto per massimizzare la viralità.";
  } else if (hoursUntilAction <= 12) {
    strategy = "Pubblica Entro le Prossime 12 Ore";
    urgency = "scheduled";
    reasoning = `Pubblica tra ${Math.round(hoursUntilAction)} ore per coincidere con il picco previsto.`;
  } else {
    strategy = "Attendi e Monitora";
    urgency = "wait";
    reasoning = `Il trend non è ancora al picco. Attendi ${Math.round(hoursUntilAction)} ore prima di pubblicare.`;
  }

  return {
    strategy,
    urgency,
    recommendedTime: prediction.recommendedActionTime,
    reasoning,
  };
}

/**
 * Integrazione con l'Autopilota: Determina se generare un articolo basato sulla previsione del trend.
 */
export async function shouldGenerateArticleForTrend(
  trendName: string,
  trendDescription: string
): Promise<{
  shouldGenerate: boolean;
  prediction: TrendPrediction;
  strategy: ReturnType<typeof generatePublicationStrategy>;
}> {
  const prediction = await predictTrendPeak(trendName, trendDescription);
  const strategy = generatePublicationStrategy(prediction);

  // Genera l'articolo se la fiducia è alta e il trend sta per raggiungere il picco
  const shouldGenerate =
    prediction.confidenceScore >= 60 &&
    strategy.urgency !== "wait";

  return {
    shouldGenerate,
    prediction,
    strategy,
  };
}
