import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { getApiUrl } from '@/lib/query-client';

export interface RockIdentificationResult {
  rock_name: string;
  rock_type: string;
  confidence_score: number;
  description: string;
  origin: string;
  formation_process: string;
  cool_fact: string;
  minerals: string[];
  hardness: string;
  uses: string[];
  why_here?: string;
  what_else?: string[];
}

export interface DeepDiveContent {
  level: number;
  title: string;
  content: string;
}

export interface DeepDiveResponse {
  success: boolean;
  levels?: DeepDiveContent[];
  error?: string;
}

export interface OpenAIVisionResponse {
  success: boolean;
  result?: RockIdentificationResult;
  error?: string;
  raw_response?: string;
}

class OpenAIService {
  private static instance: OpenAIService;

  private constructor() {}

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async identifyRock(
    imageUri: string,
    locationData?: {
      latitude: number;
      longitude: number;
      elevation?: number | null;
    },
    bedrockFormation?: {
      name: string;
      age: string;
      rock_type: string;
      lithology: string;
    }
  ): Promise<OpenAIVisionResponse> {
    try {
      let base64Image: string | null = null;

      if (Platform.OS !== 'web') {
        const imageData = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });
        base64Image = imageData;
      }

      const contextPrompt = this.buildContextPrompt(locationData, bedrockFormation);

      const response = await fetch(new URL('/api/identify-rock', getApiUrl()).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          imageUri: Platform.OS === 'web' ? imageUri : undefined,
          context: contextPrompt,
          location: locationData,
          formation: bedrockFormation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        result: data.result,
        raw_response: data.raw_response,
      };
    } catch (error) {
      console.error('OpenAI identification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildContextPrompt(
    location?: { latitude: number; longitude: number; elevation?: number | null },
    formation?: { name: string; age: string; rock_type: string; lithology: string }
  ): string {
    let context = `You are an expert geologist helping identify rocks and minerals. Analyze the provided image carefully.`;

    if (location) {
      context += `\n\nLocation context:
- Coordinates: ${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°W
- Elevation: ${location.elevation ? `${Math.round(location.elevation)} meters` : 'Unknown'}`;
    }

    if (formation) {
      context += `\n\nGeological context from USGS data:
- Formation: ${formation.name}
- Age: ${formation.age}
- Dominant Rock Type: ${formation.rock_type}
- Lithology: ${formation.lithology}

This geological context should help narrow down the identification. Rocks commonly found in ${formation.rock_type} formations of ${formation.age} age are more likely.`;
    }

    context += `\n\nProvide your identification in the following JSON format:
{
  "rock_name": "Common name of the rock",
  "rock_type": "Igneous, Sedimentary, or Metamorphic",
  "confidence_score": 0.85,
  "description": "Brief description of the rock's appearance and key identifying features",
  "origin": "How this rock formed geologically",
  "formation_process": "Detailed explanation of the formation process",
  "cool_fact": "An interesting fact about this rock type",
  "minerals": ["List", "of", "minerals"],
  "hardness": "Mohs scale rating and description",
  "uses": ["Common", "uses"],
  "why_here": "Explain why this specific rock is found at this location based on geological formation and tectonic history (2-3 sentences)",
  "what_else": ["List", "of", "3-5 other rocks", "likely found nearby"]
}

Be precise and scientific in your identification. If you're uncertain, reflect that in the confidence score.
For "why_here", explain the connection between this rock and the local geology - why would someone find this rock at these coordinates?
For "what_else", suggest 3-5 other rocks commonly found in the same geological formation or area.`;

    return context;
  }

  async generateDeepDive(
    rockName: string,
    rockType: string,
    existingInfo: {
      description?: string;
      origin?: string;
      formation?: string;
      cool_fact?: string;
      minerals?: string[];
      hardness?: string;
      uses?: string[];
    },
    bedrockFormation?: {
      name: string;
      age: string;
      rock_type: string;
    }
  ): Promise<DeepDiveResponse> {
    try {
      const response = await fetch(new URL('/api/deep-dive', getApiUrl()).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rockName,
          rockType,
          existingInfo,
          bedrockFormation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        levels: data.levels,
      };
    } catch (error) {
      console.error('Deep dive generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const openaiService = OpenAIService.getInstance();
export default openaiService;
