import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || '',
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/identify-rock', async (req, res) => {
    try {
      const { image, imageUri, context, location, formation } = req.body;

      if (!image && !imageUri) {
        return res.status(400).json({ error: 'No image provided' });
      }

      const imageContent = image 
        ? { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${image}` } }
        : { type: 'image_url' as const, image_url: { url: imageUri } };

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: context },
              imageContent,
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const rawResponse = response.choices[0]?.message?.content || '';
      
      let result;
      try {
        result = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        return res.status(500).json({ 
          error: 'Failed to parse AI response',
          raw_response: rawResponse 
        });
      }

      const normalizedResult = {
        rock_name: result.rock_name || 'Unknown Rock',
        rock_type: result.rock_type || 'Unknown',
        confidence_score: typeof result.confidence_score === 'number' 
          ? result.confidence_score 
          : parseFloat(result.confidence_score) || 0.5,
        description: result.description || 'No description available',
        origin: result.origin || 'Origin unknown',
        formation_process: result.formation_process || result.formation || 'Formation process unknown',
        cool_fact: result.cool_fact || 'No fun fact available',
        minerals: Array.isArray(result.minerals) ? result.minerals : [],
        hardness: result.hardness || 'Unknown',
        uses: Array.isArray(result.uses) ? result.uses : [],
        why_here: result.why_here || 'Location context not available',
        what_else: Array.isArray(result.what_else) ? result.what_else : [],
      };

      res.json({ 
        success: true, 
        result: normalizedResult,
        raw_response: rawResponse,
      });
    } catch (error) {
      console.error('Rock identification error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Identification failed' 
      });
    }
  });

  app.post('/api/feedback', async (req, res) => {
    try {
      const { identification_id, feedback } = req.body;

      if (!identification_id || !feedback) {
        return res.status(400).json({ error: 'Identification ID and feedback are required' });
      }

      const validFeedback = ['correct', 'incorrect', 'unsure'];
      if (!validFeedback.includes(feedback)) {
        return res.status(400).json({ error: 'Invalid feedback value' });
      }

      res.json({ 
        success: true, 
        message: 'Feedback recorded',
        identification_id,
        feedback,
      });
    } catch (error) {
      console.error('Feedback error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to save feedback' 
      });
    }
  });

  app.post('/api/identify-rock-v2', async (req, res) => {
    try {
      const { image, imageUri, location, formation, attemptNumber, isPro } = req.body;

      if (!image && !imageUri) {
        return res.status(400).json({ error: 'No image provided' });
      }

      const imageContent = image 
        ? { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${image}` } }
        : { type: 'image_url' as const, image_url: { url: imageUri } };

      let validFormations: string[] = [];
      let validRockTypes: string[] = [];
      let macrostratData: any = null;

      if (location) {
        try {
          const macrostratUrl = `https://macrostrat.org/api/v2/units?lat=${location.latitude}&lng=${location.longitude}&response=long`;
          const macrostratResponse = await fetch(macrostratUrl);
          if (macrostratResponse.ok) {
            macrostratData = await macrostratResponse.json();
            if (macrostratData?.success?.data?.length > 0) {
              const units = macrostratData.success.data;
              validFormations = [...new Set(units.map((u: any) => u.strat_name_long || u.unit_name).filter(Boolean))] as string[];
              
              const lithologies = units.flatMap((u: any) => {
                if (Array.isArray(u.lith)) {
                  return u.lith.map((l: any) => l.name || l.lith || l);
                }
                if (typeof u.lith === 'string') return [u.lith];
                return [];
              });
              validRockTypes = [...new Set(lithologies.filter(Boolean))] as string[];
            }
          }
        } catch (macroError) {
          console.error('Macrostrat query failed:', macroError);
        }
      }

      let contextPrompt = `You are an expert field geologist with decades of experience identifying rocks in real-world conditions. Analyze this rock image carefully.

SCENE UNDERSTANDING:
This photo was taken in the field by a non-geologist using a mobile phone. The rock may appear in ANY of these common scenarios:
- **Ground shot (looking down)**: Rock lying on the ground, partially embedded in soil, surrounded by dirt/gravel/vegetation. Focus on visible exposed surfaces - color, texture, grain size, any visible layering or crystal structure.
- **Hand specimen**: Rock held in someone's hand or placed on a surface. Use the hand/fingers for scale reference.
- **Outcrop/cliff face**: Rock formation seen from a distance. Look at layering, bedding planes, jointing patterns, overall color and weathering.
- **Embedded in ground**: Only part of the rock is visible. Identify based on what IS visible - don't penalize partial views.
- **Wet or dirty**: Surface may be wet (which changes color), covered in dust/soil/lichen, or weathered. Account for how weathering and moisture alter appearance vs fresh surfaces.
- **Multiple rocks**: If several rocks are visible, identify the dominant/central one.

FIELD PHOTOGRAPHY CHALLENGES - Account for these:
- Outdoor lighting varies (harsh sun, shadows, overcast) and affects perceived color
- Phone cameras may auto-adjust white balance, making colors slightly off
- Rocks often look different wet vs dry (darker when wet, textures more visible)
- Weathered surfaces can mask the true rock type - look for any fresh breaks or exposed faces
- Scale can be hard to judge without a reference object
- Soil, lichen, moss, or mineral staining on surfaces is normal and should not confuse identification

CRITICAL: Your identification MUST be constrained to geologically valid options for this location.`;

      if (location) {
        contextPrompt += `\n\nLocation: ${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°W${location.elevation ? `, Elevation: ${Math.round(location.elevation)}m` : ''}`;
      }

      if (validFormations.length > 0) {
        if (isPro) {
          contextPrompt += `\n\n**IMPORTANT LOCATION CONSTRAINT (Pro Tier):**
The only rock formations known to exist at this GPS location are:
${validFormations.map(f => `- ${f}`).join('\n')}

You MUST identify this rock as one of these specific formations. Do NOT suggest any rock type not on this list. If you cannot determine which formation it is, choose the most likely one based on visual characteristics and explain your reasoning.`;
        } else {
          contextPrompt += `\n\n**IMPORTANT LOCATION CONSTRAINT (Free Tier):**
The known rock types at this location are: ${validRockTypes.join(', ') || 'various sedimentary and igneous rocks'}.
Identify the general rock type (e.g., "Limestone", "Sandstone", "Granite") rather than specific formation names.`;
        }
      }

      if (formation) {
        contextPrompt += `\n\nGeological context: ${formation.name} formation (${formation.age}), ${formation.rock_type}, lithology: ${formation.lithology}`;
      }

      contextPrompt += `\n\nIMAGE QUALITY ASSESSMENT:
First, determine what you CAN see, even in imperfect conditions. Many field photos are good enough for identification even if they aren't studio-quality. If you can make a reasonable identification, do so.

If the image truly prevents identification, provide SPECIFIC, ACTIONABLE guidance tailored to the photo scenario:
- Ground rock: "Try brushing off loose dirt to expose the surface texture" or "Pour a little water on it to reveal the grain pattern"
- Too far away: "Move closer so the rock fills most of the frame - about 1-2 feet away"
- Too close: "Step back a few feet to show the full rock and surrounding context"
- Bad lighting: "Rotate so the sun is behind you, lighting the rock face evenly"
- Partially buried: "Try to find a loose piece nearby, or photograph the exposed face at an angle"
- Wet/reflective: "The wet surface is causing glare - try a slightly different angle or wait for it to dry"

Respond in this exact JSON format:
{
  "rock_name": "${isPro ? 'Specific formation name from the list above' : 'General rock type (e.g., Limestone, Granite)'}",
  "rock_type": "Igneous, Sedimentary, or Metamorphic",
  "confidence_score": 0.85,
  "scene_type": "ground_shot | hand_specimen | outcrop | embedded | close_up | distant",
  "uncertainty_reason": null or one of: "blur", "texture", "distance", "lighting", "angle", "obstruction", "weathering",
  "rephoto_guidance": "Specific actionable tip based on the scene_type and what would most improve the identification, or null if confidence is high enough",
  "description": "Brief description of the rock's appearance as seen in the image, noting any field conditions affecting the view",
  "origin": "How this rock formed geologically",
  "formation_process": "Detailed formation process",
  "cool_fact": "An interesting fact about this rock",
  "minerals": ["List", "of", "minerals"],
  "hardness": "Mohs scale rating",
  "uses": ["Common", "uses"],
  "why_here": "Why this rock is found at this location",
  "what_else": ["Other", "rocks", "you", "might", "find", "nearby"]${isPro && validFormations.length > 0 ? `,
  "matched_formation": "The specific formation name from the valid list that you identified"` : ''}
}

CONFIDENCE RULES:
- Set confidence_score >= 0.75 if you can clearly identify the rock AND it matches location constraints
- Set confidence_score 0.50-0.74 if identification is likely but not certain (partial view, weathering, etc.)
- Set confidence_score 0.35-0.49 if you have a best guess but conditions make it hard - still provide your best identification AND helpful rephoto_guidance
- Set confidence_score < 0.35 ONLY if the image truly shows nothing identifiable - ALWAYS provide rephoto_guidance
- IMPORTANT: Don't be overly cautious. A partially visible, dirty, or weathered rock in the field is NORMAL. If you can make a reasonable identification, do so with moderate-to-high confidence.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: contextPrompt },
              imageContent,
            ],
          },
        ],
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const rawResponse = response.choices[0]?.message?.content || '';
      
      let result;
      try {
        result = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        return res.status(500).json({ 
          error: 'Failed to parse AI response',
          raw_response: rawResponse 
        });
      }

      const normalizedResult = {
        rock_name: result.rock_name || 'Unknown Rock',
        rock_type: result.rock_type || 'Unknown',
        confidence_score: typeof result.confidence_score === 'number' 
          ? result.confidence_score 
          : parseFloat(result.confidence_score) || 0.5,
        scene_type: result.scene_type || 'unknown',
        uncertainty_reason: result.uncertainty_reason || null,
        rephoto_guidance: result.rephoto_guidance || null,
        description: result.description || 'No description available',
        origin: result.origin || 'Origin unknown',
        formation_process: result.formation_process || 'Formation process unknown',
        cool_fact: result.cool_fact || 'No fun fact available',
        minerals: Array.isArray(result.minerals) ? result.minerals : [],
        hardness: result.hardness || 'Unknown',
        uses: Array.isArray(result.uses) ? result.uses : [],
        why_here: result.why_here || null,
        what_else: Array.isArray(result.what_else) ? result.what_else : [],
        matched_formation: result.matched_formation || null,
        location_constrained: validFormations.length > 0,
        valid_formations: isPro ? validFormations : undefined,
      };

      res.json({ 
        success: true, 
        result: normalizedResult,
        attemptNumber,
        locationData: macrostratData ? {
          formationsCount: validFormations.length,
          rockTypesCount: validRockTypes.length,
        } : null,
      });
    } catch (error) {
      console.error('Rock identification v2 error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Identification failed' 
      });
    }
  });

  app.post('/api/verify-identification', async (req, res) => {
    try {
      const { image, imageUri, primaryIdentification, primaryRockType, location } = req.body;

      if (!image && !imageUri) {
        return res.status(400).json({ error: 'No image provided' });
      }

      const verificationPrompt = `You are an expert field geologist providing an independent rock identification for verification.
${location ? `Location: ${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°W` : ''}

Analyze this field photograph of a geological feature. The photo may show a rock on the ground, in someone's hand, as an outcrop, partially buried, wet, dirty, or weathered - these are all normal field conditions. Focus on identifiable features like texture, grain size, color, layering, crystal structure, and fracture patterns even if the rock isn't in pristine condition.

Identify the primary rock formation visible. Be specific and accurate.

Respond ONLY in valid JSON format:
{
  "secondary_identification": "The rock name you identify",
  "secondary_rock_type": "Igneous, Sedimentary, or Metamorphic",
  "confidence": 0.85,
  "reasoning": "Brief explanation of your identification, noting which visible features led to your conclusion"
}`;

      let geminiResult;
      
      try {
        const imageData = image || imageUri;
        const imageBase64 = image ? image : null;
        
        const geminiResponse = await gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: verificationPrompt },
                imageBase64 ? {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                  }
                } : { text: `[Image URL: ${imageUri}]` },
              ],
            },
          ],
        });

        const rawText = geminiResponse.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          geminiResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in Gemini response');
        }
      } catch (geminiError) {
        console.error('Gemini verification error:', geminiError);
        return res.status(500).json({ error: 'Secondary AI verification failed' });
      }

      const secondaryId = (geminiResult.secondary_identification || '').toLowerCase().trim();
      const primaryId = (primaryIdentification || '').toLowerCase().trim();
      
      const agreement = secondaryId.includes(primaryId) || 
                        primaryId.includes(secondaryId) ||
                        secondaryId === primaryId;

      res.json({ 
        success: true,
        secondary_identification: geminiResult.secondary_identification || 'Unknown',
        secondary_rock_type: geminiResult.secondary_rock_type || 'Unknown',
        agreement,
        agreement_reason: geminiResult.reasoning || '',
        confidence: geminiResult.confidence || 0.7,
        alternative_suggestion: agreement ? null : geminiResult.secondary_identification,
        verification_model: 'gemini',
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Verification failed' 
      });
    }
  });

  app.post('/api/debug-report', async (req, res) => {
    try {
      const { description, actions, location, deviceInfo, screenshot, photo } = req.body;

      console.log('=== DEBUG REPORT RECEIVED ===');
      console.log('Description:', description);
      console.log('Location:', location);
      console.log('Device:', deviceInfo);
      console.log('Actions:', actions);
      console.log('Has Photo:', !!photo);
      console.log('Has Screenshot:', !!screenshot);
      console.log('============================');

      res.json({ 
        success: true,
        message: 'Debug report received',
        reportId: `DBG-${Date.now()}`,
      });
    } catch (error) {
      console.error('Debug report error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to submit debug report' 
      });
    }
  });

  app.post('/api/generate-debug-prompt', async (req, res) => {
    try {
      const { screenshot, userNotes, debugData } = req.body;

      if (!userNotes) {
        return res.status(400).json({ error: 'User notes are required' });
      }

      const debugContext = debugData ? `
Technical Debug Data:
- Device: ${debugData.deviceInfo?.deviceName || 'Unknown'} (${debugData.deviceInfo?.os || 'Unknown'} ${debugData.deviceInfo?.osVersion || ''})
- App Version: ${debugData.deviceInfo?.appVersion || 'Unknown'}
- Location: ${debugData.location ? `${debugData.location.latitude.toFixed(4)}, ${debugData.location.longitude.toFixed(4)}` : 'Not available'}
- Recent Actions: ${debugData.actions?.map((a: any) => a.action).join(' -> ') || 'None recorded'}
` : '';

      const metaPrompt = `You are an expert React Native developer tasked with writing a bug fix prompt for another developer. Based on the provided annotated screenshot, user notes, and technical debug data, generate a concise, actionable Replit prompt in Markdown.

The prompt should:
1. Start with a one-sentence summary of the issue
2. Clearly identify the problem based on the visual evidence and user description
3. Suggest a specific code-level solution
4. Be direct and specific in your suggested fix

User's Description of the Issue:
"${userNotes}"

${debugContext}

${screenshot ? 'An annotated screenshot has been provided showing the visual issue.' : 'No screenshot was provided.'}

Generate a developer-ready bug fix prompt in Markdown format. Focus on actionable fixes that can be implemented immediately.`;

      const messages: any[] = [{ role: 'user', content: [] }];

      if (screenshot) {
        messages[0].content.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${screenshot}` }
        });
      }

      messages[0].content.push({
        type: 'text',
        text: metaPrompt
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000,
      });

      const generatedPrompt = response.choices[0]?.message?.content || '';

      res.json({
        success: true,
        prompt: generatedPrompt,
      });
    } catch (error) {
      console.error('Generate debug prompt error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate prompt'
      });
    }
  });

  app.post('/api/send-debug-sms', async (req, res) => {
    try {
      const { phoneNumber, promptText } = req.body;

      if (!phoneNumber || !promptText) {
        return res.status(400).json({ error: 'Phone number and prompt text are required' });
      }

      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        return res.status(501).json({ 
          error: 'SMS service not configured',
          message: 'Twilio credentials are not set up. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment secrets.'
        });
      }

      const truncatedPrompt = promptText.length > 1500 
        ? promptText.substring(0, 1500) + '... [truncated]' 
        : promptText;

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioPhoneNumber,
          Body: `GeoID Pro Debug Prompt:\n\n${truncatedPrompt}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send SMS');
      }

      const data = await response.json();

      res.json({
        success: true,
        messageId: data.sid,
      });
    } catch (error) {
      console.error('Send SMS error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to send SMS'
      });
    }
  });

  app.post('/api/generate-formation-fact', async (req, res) => {
    try {
      const { formationName, ageRange, environment, lithology, minMa, maxMa } = req.body;

      if (!formationName) {
        return res.status(400).json({ error: 'Formation name is required' });
      }

      const generatorPrompt = `You are a geology expert writing for a layperson. Given the following data for a geological formation:
- Formation: ${formationName}
- Age: ${ageRange || `${minMa || 0} - ${maxMa || 0} million years ago`}
- Environment: ${environment || 'Unknown depositional environment'}
- Lithology: ${lithology || 'Mixed rock types'}

Generate ONE fascinating, easy-to-understand fact about what the world was like during that time and in that specific environment. Be creative but STRICTLY stick to the data provided. Do NOT mention animals or climates that would not have existed at that time or in that environment.

Respond in JSON format:
{
  "fact": "Your fascinating fact here (2-3 sentences max)",
  "read_more": "A longer explanation (3-4 sentences) providing more context about how this formation was created and what evidence we can see today"
}`;

      const generatorResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: generatorPrompt }],
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const generatorResult = JSON.parse(generatorResponse.choices[0]?.message?.content || '{}');
      const generatedFact = generatorResult.fact || '';
      const readMore = generatorResult.read_more || '';

      const validatorPrompt = `You are a geological fact-checker. Your ONLY job is to validate the following statement for geological and chronological accuracy.

Context:
- Formation: ${formationName}
- Age: ${ageRange || `${minMa || 0} - ${maxMa || 0} million years ago`}
- Environment: ${environment || 'Unknown'}

Statement to verify:
"${generatedFact}"

Check specifically for:
1. Anachronistic claims (animals/plants that didn't exist at that time)
2. Geographic impossibilities (polar animals in tropical settings)
3. Geological inaccuracies (wrong formation processes)

Respond in JSON format:
{
  "verdict": "PLAUSIBLE" or "IMPLAUSIBLE",
  "issue": null or "brief explanation of the problem",
  "correction": null or "corrected version of the fact if implausible"
}`;

      const validatorResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: validatorPrompt }],
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const validatorResult = JSON.parse(validatorResponse.choices[0]?.message?.content || '{}');
      
      let finalFact = generatedFact;
      let wasValidated = true;
      
      if (validatorResult.verdict === 'IMPLAUSIBLE' && validatorResult.correction) {
        finalFact = validatorResult.correction;
        wasValidated = false;
      }

      res.json({
        success: true,
        fact: finalFact,
        readMore: readMore,
        validated: wasValidated,
        validationNote: validatorResult.issue || null,
      });
    } catch (error) {
      console.error('Formation fact generation error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Fact generation failed',
      });
    }
  });

  app.post('/api/deep-dive', async (req, res) => {
    try {
      const { rockName, rockType, existingInfo, bedrockFormation } = req.body;

      if (!rockName) {
        return res.status(400).json({ error: 'Rock name is required' });
      }

      let contextInfo = '';
      if (bedrockFormation) {
        contextInfo = `\nGeological context: Found in ${bedrockFormation.name} formation (${bedrockFormation.age}), predominantly ${bedrockFormation.rock_type}.`;
      }
      if (existingInfo?.minerals?.length) {
        contextInfo += `\nKnown minerals: ${existingInfo.minerals.join(', ')}.`;
      }
      if (existingInfo?.hardness) {
        contextInfo += `\nHardness: ${existingInfo.hardness}.`;
      }

      const prompt = `You are an expert geologist providing educational deep-dive content about ${rockName} (${rockType}).${contextInfo}

Generate educational content structured in 4 progressive levels, each building on the previous:

1. SUMMARY (2-3 sentences): Quick overview - what is this rock, main characteristics, and why it's notable.

2. DETAILS (4-5 sentences): Technical deep-dive - mineral composition, crystal structure, formation conditions (temperature, pressure), and physical properties.

3. CONTEXT (4-5 sentences): Geological and historical context - where this rock is commonly found globally, its role in Earth's geological history, and its relationship to tectonic or volcanic processes.

4. FUN FACTS (3-4 sentences): Engaging facts - unusual uses, famous specimens, cultural significance, or surprising scientific discoveries related to this rock.

Respond in this exact JSON format:
{
  "levels": [
    { "level": 1, "title": "Summary", "content": "..." },
    { "level": 2, "title": "Details", "content": "..." },
    { "level": 3, "title": "Context", "content": "..." },
    { "level": 4, "title": "Fun Facts", "content": "..." }
  ]
}

Make each level engaging, educational, and progressively more detailed. Use accessible language that geology enthusiasts can understand.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const rawResponse = response.choices[0]?.message?.content || '';
      
      let result;
      try {
        result = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('Failed to parse deep dive response:', parseError);
        return res.status(500).json({ 
          error: 'Failed to parse AI response',
          raw_response: rawResponse 
        });
      }

      res.json({ 
        success: true, 
        levels: result.levels || [],
      });
    } catch (error) {
      console.error('Deep dive generation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Deep dive generation failed' 
      });
    }
  });

  app.get('/api/cache-region-data', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
      }

      const macrostratUrl = `https://macrostrat.org/api/v2/units?lat=${lat}&lng=${lng}&response=long`;
      const macrostratResponse = await fetch(macrostratUrl);

      if (!macrostratResponse.ok) {
        return res.status(502).json({ error: 'Failed to fetch geological data from Macrostrat' });
      }

      const macrostratData = await macrostratResponse.json();
      const units = macrostratData?.success?.data || [];

      if (units.length === 0) {
        return res.json({
          success: true,
          formations: [],
          columnName: 'Unknown Region',
          rockTypes: [],
        });
      }

      const columnName = units[0]?.col_name || units[0]?.strat_name_long || 'Local Column';

      const formations = units.map((unit: any) => {
        const lithString = typeof unit.lith === 'string' ? unit.lith :
          Array.isArray(unit.lith) ? unit.lith.map((l: any) => l.name || l.lith || l).join(', ') : 'Unknown';
        const environString = typeof unit.environ === 'string' ? unit.environ :
          Array.isArray(unit.environ) ? unit.environ.map((e: any) => e.name || e).join(', ') : 'Unknown';
        const lithLower = lithString.toLowerCase();

        const inferRockType = (lith: string): string => {
          const l = lith.toLowerCase();
          const sed = ['limestone', 'sandstone', 'shale', 'dolomite', 'chalk', 'mudstone', 'conglomerate', 'siltstone'];
          const ign = ['granite', 'basalt', 'rhyolite', 'andesite', 'diorite', 'gabbro', 'volcanic'];
          const met = ['marble', 'slate', 'gneiss', 'schist', 'quartzite', 'phyllite'];
          for (const r of sed) { if (l.includes(r)) return 'Sedimentary'; }
          for (const r of ign) { if (l.includes(r)) return 'Igneous'; }
          for (const r of met) { if (l.includes(r)) return 'Metamorphic'; }
          return 'Sedimentary';
        };

        const getVisualCharacteristics = (lith: string): string[] => {
          if (lith.includes('limestone')) return ['Light gray to tan color', 'Fine-grained texture', 'May contain fossils', 'Fizzes with acid'];
          if (lith.includes('sandstone')) return ['Sandy texture', 'Gritty feel', 'Visible grain structure', 'Red, tan, or white color'];
          if (lith.includes('shale')) return ['Thin layered sheets', 'Dark gray to black', 'Soft and flaky', 'Earthy smell when wet'];
          if (lith.includes('granite')) return ['Speckled appearance', 'Coarse crystals visible', 'Pink, gray, or white', 'Hard and durable'];
          if (lith.includes('basalt')) return ['Dark gray to black', 'Fine-grained', 'May have small holes (vesicles)', 'Dense and heavy'];
          if (lith.includes('marble')) return ['Crystalline texture', 'White or colored', 'Smooth when polished', 'Fizzes with acid'];
          if (lith.includes('dolomite')) return ['Similar to limestone', 'Slightly harder', 'Tan to light gray', 'Reacts slowly with acid'];
          return ['Variable appearance', 'Examine color and texture', 'Check grain size', 'Note any layering'];
        };

        const getKeyIdentifiers = (lith: string): string[] => {
          if (lith.includes('limestone')) return ['Acid test (fizzes with HCl)', 'Fossil presence', 'Hardness ~3-4'];
          if (lith.includes('sandstone')) return ['Gritty texture', 'Visible sand grains', 'Variable hardness'];
          if (lith.includes('shale')) return ['Fissile layering', 'Soft (scratches with nail)', 'Clay composition'];
          if (lith.includes('granite')) return ['Interlocking crystals', 'Contains quartz, feldspar, mica', 'Hardness 6-7'];
          if (lith.includes('basalt')) return ['Very dark color', 'Fine-grained or glassy', 'May be vesicular'];
          return ['Examine crystal structure', 'Test hardness', 'Check for layering'];
        };

        const inferMinerals = (lith: string): string[] => {
          if (lith.includes('limestone') || lith.includes('chalk')) return ['Calcite', 'Aragonite'];
          if (lith.includes('sandstone')) return ['Quartz', 'Feldspar', 'Iron oxides'];
          if (lith.includes('granite')) return ['Quartz', 'Feldspar', 'Mica', 'Hornblende'];
          if (lith.includes('basalt')) return ['Plagioclase', 'Pyroxene', 'Olivine'];
          if (lith.includes('shale')) return ['Clay minerals', 'Quartz', 'Calcite'];
          return ['Various minerals'];
        };

        const inferHardness = (lith: string): string => {
          if (lith.includes('granite') || lith.includes('quartzite')) return '6-7 (Hard)';
          if (lith.includes('limestone') || lith.includes('marble')) return '3-4 (Medium)';
          if (lith.includes('shale') || lith.includes('chalk')) return '2-3 (Soft)';
          if (lith.includes('sandstone')) return '6-7 (Hard, varies)';
          return 'Variable';
        };

        const inferUses = (lith: string): string[] => {
          if (lith.includes('limestone')) return ['Building stone', 'Cement production', 'Agricultural lime'];
          if (lith.includes('granite')) return ['Countertops', 'Monuments', 'Building facades'];
          if (lith.includes('sandstone')) return ['Building stone', 'Paving', 'Glassmaking'];
          if (lith.includes('marble')) return ['Sculpture', 'Flooring', 'Countertops'];
          return ['Construction materials'];
        };

        const getGeologicPeriod = (age: number): string => {
          if (age < 2.58) return 'Quaternary';
          if (age < 23.03) return 'Neogene';
          if (age < 66) return 'Paleogene';
          if (age < 145) return 'Cretaceous';
          if (age < 201.3) return 'Jurassic';
          if (age < 251.9) return 'Triassic';
          if (age < 298.9) return 'Permian';
          if (age < 358.9) return 'Carboniferous';
          if (age < 419.2) return 'Devonian';
          if (age < 443.8) return 'Silurian';
          if (age < 485.4) return 'Ordovician';
          if (age < 538.8) return 'Cambrian';
          return 'Precambrian';
        };

        return {
          name: unit.unit_name || unit.strat_name_long || 'Unknown',
          rockType: inferRockType(lithString),
          lithology: lithString,
          age: `${unit.t_age || 0} - ${unit.b_age || 0} Ma`,
          period: getGeologicPeriod(unit.t_age || 0),
          environment: environString,
          color: unit.color || '#808080',
          description: `${unit.strat_name_long || unit.unit_name || 'Unknown'} formation from the ${getGeologicPeriod(unit.t_age || 0)} period.`,
          visualCharacteristics: getVisualCharacteristics(lithLower),
          keyIdentifiers: getKeyIdentifiers(lithLower),
          minerals: inferMinerals(lithLower),
          hardness: inferHardness(lithLower),
          commonUses: inferUses(lithLower),
        };
      });

      const rockTypes = [...new Set(formations.map((f: any) => f.rockType))] as string[];

      res.json({
        success: true,
        formations,
        columnName,
        rockTypes,
      });
    } catch (error) {
      console.error('Cache region data error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch region data',
      });
    }
  });

  app.get('/api/geological-features', async (req, res) => {
    try {
      const { minLat, minLng, maxLat, maxLng, lat, lng, radius, zoom } = req.query;

      let south: number, west: number, north: number, east: number;

      if (minLat && minLng && maxLat && maxLng) {
        south = parseFloat(minLat as string);
        west = parseFloat(minLng as string);
        north = parseFloat(maxLat as string);
        east = parseFloat(maxLng as string);
      } else if (lat && lng) {
        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);
        const radiusDeg = parseFloat((radius as string) || '0.5');
        south = latitude - radiusDeg;
        west = longitude - radiusDeg;
        north = latitude + radiusDeg;
        east = longitude + radiusDeg;
      } else {
        return res.status(400).json({ error: 'Provide viewport bounds (minLat,minLng,maxLat,maxLng) or center (lat,lng)' });
      }

      if ([south, west, north, east].some(isNaN)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      const zoomLevel = zoom ? parseInt(zoom as string) : 10;
      const centerLat = (south + north) / 2;
      const centerLng = (west + east) / 2;
      const bboxStr = `${west},${south},${east},${north}`;

      const faultColorMap: Record<number, { color: string; type: string; label: string }> = {
        1: { color: '#CC3333', type: 'normal_fault', label: 'Fault' },
        2: { color: '#CC3333', type: 'normal_fault', label: 'Fault' },
        3: { color: '#E65100', type: 'thrust_fault', label: 'Thrust Fault' },
        4: { color: '#7B1FA2', type: 'strike_slip_fault', label: 'Strike-Slip Fault' },
        5: { color: '#CC3333', type: 'normal_fault', label: 'Concealed Fault' },
        6: { color: '#9E9E9E', type: 'normal_fault', label: 'Inferred Fault' },
      };

      const deriveAgeStatus = (symbology: string): { ageStatus: string; ageDescription: string; ageMa: string } => {
        const s = (symbology || '').toLowerCase();
        if (s.includes('historic') || s.includes('latest quaternary')) {
          return { ageStatus: 'Active', ageDescription: 'Historic to latest Quaternary (<15 ka)', ageMa: '<0.015' };
        }
        if (s.includes('late quaternary')) {
          return { ageStatus: 'Potentially Active', ageDescription: 'Late Quaternary (<130 ka)', ageMa: '<0.13' };
        }
        if (s.includes('mid quaternary')) {
          return { ageStatus: 'Potentially Active', ageDescription: 'Mid Quaternary (<750 ka)', ageMa: '<0.75' };
        }
        if (s.includes('quaternary')) {
          return { ageStatus: 'Potentially Active', ageDescription: 'Quaternary (<2.6 Ma)', ageMa: '<2.6' };
        }
        return { ageStatus: 'Inactive', ageDescription: 'Pre-Quaternary (>2.6 Ma)', ageMa: '>2.6' };
      };

      const ageStatusColor = (ageStatus: string): string => {
        if (ageStatus === 'Active') return '#CC3333';
        if (ageStatus === 'Potentially Active') return '#E65100';
        return '#888888';
      };

      const getCentroid = (coordinates: Array<{ latitude: number; longitude: number }>) => {
        const sumLat = coordinates.reduce((s, c) => s + c.latitude, 0);
        const sumLng = coordinates.reduce((s, c) => s + c.longitude, 0);
        return { latitude: sumLat / coordinates.length, longitude: sumLng / coordinates.length };
      };

      const usgsPromise = (async () => {
        try {
          const url = `https://earthquake.usgs.gov/arcgis/rest/services/haz/Qfaults/MapServer/21/query?where=1%3D1&geometryType=esriGeometryEnvelope&geometry=${encodeURIComponent(bboxStr)}&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=fault_name,age,slip_sense,dip_direction,slip_rate,symbology,fault_url,archive_pdf&f=geojson&resultRecordCount=200`;
          const resp = await Promise.race([
            fetch(url),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('USGS timeout')), 12000))
          ]);
          if (!resp.ok) return [];

          const data = await resp.json();
          if (data?.error) {
            console.log('USGS query error:', data.error.message);
            return [];
          }
          const geoFeatures = data?.features || [];

          return geoFeatures.map((f: any, idx: number) => {
            const props = f.properties || {};
            const geom = f.geometry;

            let coordinates: Array<{ latitude: number; longitude: number }> = [];
            if (geom?.type === 'LineString' && geom.coordinates) {
              coordinates = geom.coordinates.map((c: number[]) => ({
                latitude: c[1],
                longitude: c[0],
              }));
            } else if (geom?.type === 'MultiLineString' && geom.coordinates) {
              coordinates = geom.coordinates[0]?.map((c: number[]) => ({
                latitude: c[1],
                longitude: c[0],
              })) || [];
            }

            if (coordinates.length < 2) return null;

            const slipSense = (props.slip_sense || '').toLowerCase();
            let featureType = 'normal_fault';
            if (slipSense.includes('thrust') || slipSense.includes('reverse')) {
              featureType = 'thrust_fault';
            } else if (slipSense.includes('strike') || slipSense.includes('lateral')) {
              featureType = 'strike_slip_fault';
            }

            const ageMeta = deriveAgeStatus(props.symbology || props.age || '');
            const color = ageStatusColor(ageMeta.ageStatus);

            return {
              id: `usgs-qfault-${idx}`,
              name: props.fault_name || 'Quaternary Fault',
              featureType,
              description: `${props.fault_name || 'Unnamed fault'}. Age: ${props.age || 'Unknown'}. Slip rate: ${props.slip_rate || 'Unknown'}.`,
              coordinates,
              properties: {
                source: 'USGS Quaternary Faults',
                age: props.age,
                faultType: props.slip_sense,
                dipDirection: props.dip_direction,
                slipRate: props.slip_rate,
                symbology: props.symbology,
                fault_url: props.fault_url,
                ageStatus: ageMeta.ageStatus,
                ageDescription: ageMeta.ageDescription,
                ageMa: ageMeta.ageMa,
                vertexCount: coordinates.length,
              },
              color,
              strokeWidth: 2,
            };
          }).filter(Boolean);
        } catch (e) {
          console.log('USGS Qfaults fetch error:', e);
          return [];
        }
      })();

      const tnrisPromise = (async () => {
        try {
          const url = `https://feature.tnris.org/arcgis/rest/services/Geologic_Database/GeologicDatabaseofTexas/MapServer/3/query?where=1%3D1&geometryType=esriGeometryEnvelope&geometry=${encodeURIComponent(bboxStr)}&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=objectid,fault_cd,beg_origin_cd&f=geojson&resultRecordCount=500`;
          const resp = await Promise.race([
            fetch(url),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('TNRIS timeout')), 12000))
          ]);
          if (!resp.ok) return [];

          const data = await resp.json();
          const geoFeatures = data?.features || [];

          return geoFeatures.map((f: any, idx: number) => {
            const props = f.properties || {};
            const faultCd = props.fault_cd || 2;
            const faultInfo = faultColorMap[faultCd] || faultColorMap[2];
            const geom = f.geometry;

            let coordinates: Array<{ latitude: number; longitude: number }> = [];
            if (geom?.type === 'LineString' && geom.coordinates) {
              coordinates = geom.coordinates.map((c: number[]) => ({
                latitude: c[1],
                longitude: c[0],
              }));
            } else if (geom?.type === 'MultiLineString' && geom.coordinates) {
              coordinates = geom.coordinates[0]?.map((c: number[]) => ({
                latitude: c[1],
                longitude: c[0],
              })) || [];
            }

            if (coordinates.length < 2) return null;

            return {
              id: `tnris-fault-${props.objectid || idx}`,
              name: `${faultInfo.label}`,
              featureType: faultInfo.type,
              description: `Geological fault trace from the Texas Bureau of Economic Geology (BEG). Mapped at 1:250,000 scale. Origin: ${props.beg_origin_cd || 'Unknown'}.`,
              coordinates,
              properties: {
                source: 'TNRIS/BEG',
                faultCode: faultCd,
                originCode: props.beg_origin_cd,
                scale: '1:250,000',
                ageStatus: 'Inactive',
                ageDescription: 'Pre-Quaternary (>2.6 Ma)',
                ageMa: '>2.6',
                vertexCount: coordinates.length,
              },
              color: faultInfo.color,
              strokeWidth: 2,
            };
          }).filter(Boolean);
        } catch (e) {
          console.log('TNRIS fault fetch error:', e);
          return [];
        }
      })();

      const macrostratPromise = (async () => {
        try {
          const url = `https://macrostrat.org/api/v2/geologic_units/map?lat=${centerLat}&lng=${centerLng}&format=geojson_bare`;
          const resp = await Promise.race([
            fetch(url),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Macrostrat timeout')), 12000))
          ]);
          if (!resp.ok) return [];

          const data = await resp.json();
          const formations = Array.isArray(data) ? data : (data?.features || []);
          return formations.map((f: any) => {
            const props = f.properties || f;
            return {
              name: props.unit_name || props.strat_name || 'Unknown Formation',
              age: props.best_age_bottom ? `${props.best_age_bottom} - ${props.best_age_top} Ma` : (props.age || 'Unknown'),
              lithology: props.lith || props.lithology || 'Unknown',
              environment: props.environ || props.environment || 'Unknown',
              source: 'Macrostrat',
            };
          });
        } catch (e) {
          console.log('Macrostrat enrichment error:', e);
          return [];
        }
      })();

      const [usgsResults, tnrisResults, macrostratFormations] = await Promise.all([usgsPromise, tnrisPromise, macrostratPromise]);

      const usgsCentroids = usgsResults.map((f: any) => getCentroid(f.coordinates));
      const deduplicatedTnris = tnrisResults.filter((tf: any) => {
        const tc = getCentroid(tf.coordinates);
        return !usgsCentroids.some((uc: any) =>
          Math.abs(tc.latitude - uc.latitude) < 0.005 && Math.abs(tc.longitude - uc.longitude) < 0.005
        );
      });

      const features: any[] = [...usgsResults, ...deduplicatedTnris];

      console.log(`Geological features: ${usgsResults.length} USGS (primary), ${deduplicatedTnris.length}/${tnrisResults.length} TNRIS (deduped), ${macrostratFormations.length} Macrostrat formations for bbox [${south.toFixed(2)},${west.toFixed(2)},${north.toFixed(2)},${east.toFixed(2)}]`);

      res.json({
        success: true,
        features,
        formations: macrostratFormations,
        sources: {
          usgs_quaternary: usgsResults.length,
          tnris: deduplicatedTnris.length,
          macrostrat_formations: macrostratFormations.length,
          total: features.length,
        },
      });
    } catch (error) {
      console.error('Geological features error:', error);
      res.status(500).json({ error: 'Failed to fetch geological features' });
    }
  });

  app.post('/api/fault-deep-dive', async (req, res) => {
    try {
      const { faultName, faultProperties, userLat, userLng, macrostratContext } = req.body;

      if (!faultName) {
        return res.status(400).json({ error: 'Fault name is required' });
      }

      let macrostratInfo = '';
      if (macrostratContext && Array.isArray(macrostratContext) && macrostratContext.length > 0) {
        macrostratInfo = `\n\nMACROSTRAT FORMATION CONTEXT (nearby geological formations):\n${macrostratContext.map((f: any) => `- ${f.name}: Age ${f.age}, Lithology: ${f.lithology}, Environment: ${f.environment}`).join('\n')}`;
      }

      const prompt = `You are a geology educator writing for a curious non-expert. Create engaging, richly detailed educational content about the ${faultName}.

FAULT DATA:
${JSON.stringify(faultProperties, null, 2)}
${userLat && userLng ? `User location: ${userLat.toFixed(4)}°N, ${userLng.toFixed(4)}°W` : ''}${macrostratInfo}

Write content in this exact JSON format:
{
  "whatHappened": "2-3 paragraphs explaining the geological story of this fault in plain language. Tell it like a narrative - what forces were at work, what the landscape looked like millions of years ago, how it changed over time. Use everyday analogies (stretching taffy, cracking ice, etc). If Macrostrat formation context is available, weave in how the surrounding rock formations relate to the fault's story.",
  "landscape": "How this fault shapes the visible landscape today. Describe elevation changes, escarpments, valleys, or ridgelines that a person standing nearby would notice. Mention specific landforms if applicable.",
  "weather": "How the geology created by this fault affects local weather patterns. Include rain shadow effects, temperature differences across the fault line, how elevation changes affect precipitation, fog patterns, or wind corridors.",
  "ecosystems": "Ecological transitions caused by this fault. Describe specific plant and animal communities on each side - name actual species when possible. Explain how soil differences, water availability, and elevation changes create distinct ecological zones.",
  "water": "How this fault affects water systems - aquifers, springs, rivers, wells, and groundwater flow. Many faults are critically important for water supply. Explain whether the fault acts as a barrier or conduit for groundwater.",
  "funFacts": [
    "A surprising fact most people don't know - something that would make someone say 'wow, really?'",
    "A practical fact about how this fault affects daily life (water supply, building foundations, springs, caves, agriculture)",
    "A historical or cultural connection to the fault (Native American trails, city placement, famous landmarks, fossil discoveries)"
  ],
  "sources": "USGS, Macrostrat, BEG"
}

IMPORTANT: Write for someone who has ZERO geology background. Use vivid comparisons and storytelling. Avoid jargon. Make it feel like a fascinating documentary, not a textbook. Each section should be substantive - 2-4 sentences minimum.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const rawText = response.choices[0]?.message?.content || '';
      let result;
      try {
        result = JSON.parse(rawText);
      } catch {
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }

      res.json({ success: true, content: result });
    } catch (error) {
      console.error('Fault deep dive error:', error);
      res.status(500).json({ error: 'Failed to generate fault content' });
    }
  });

  app.get('/api/explore-pois', async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusKm = parseFloat((radius as string) || '50');

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      const degreeSpan = radiusKm / 111;
      const pois: any[] = [];

      const pbdbPromise = (async () => {
        try {
          const pbdbUrl = `https://paleobiodb.org/data1.2/colls/list.json?lngmin=${longitude - degreeSpan}&lngmax=${longitude + degreeSpan}&latmin=${latitude - degreeSpan}&latmax=${latitude + degreeSpan}&show=coords,loc,time,strat&limit=60`;
          const resp = await Promise.race([
            fetch(pbdbUrl),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
          ]);
          if (!resp.ok) return [];
          const data = await resp.json();
          const records = data.records || [];
          return records.map((r: any) => ({
            id: `pbdb-${r.oid}`,
            name: r.nam || 'Fossil Collection',
            description: `${r.oei ? r.oei + ' period' : 'Unknown age'}${r.env ? ' - ' + r.env + ' environment' : ''}${r.phl ? '. Taxa: ' + r.phl : ''}`,
            latitude: r.lat,
            longitude: r.lng,
            type: 'fossil_site',
            rockType: r.lth || undefined,
            age: r.oei || undefined,
            period: r.oei || undefined,
            color: '#8B6F47',
            source: 'PBDB',
          }));
        } catch (e) {
          console.log('PBDB fetch error:', e);
          return [];
        }
      })();

      const macrostratColumnsPromise = (async () => {
        try {
          const colUrl = `https://macrostrat.org/api/v2/columns?lat=${latitude}&lng=${longitude}&adjacents=true&response=long`;
          const resp = await Promise.race([
            fetch(colUrl),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
          ]);
          if (!resp.ok) return [];
          const data = await resp.json();
          const columns = data?.success?.data || [];
          const results: any[] = [];
          for (const col of columns) {
            if (col.lat && col.lng) {
              results.push({
                id: `macrocol-${col.col_id}`,
                name: col.col_name || 'Geological Column',
                description: `Stratigraphic column: ${col.col_group || 'Regional group'}. ${col.col_area ? Math.round(Number(col.col_area)) + ' sq km area' : ''}`,
                latitude: col.lat,
                longitude: col.lng,
                type: 'formation',
                rockType: undefined,
                age: undefined,
                period: col.col_group || undefined,
                color: '#E07856',
                source: 'Macrostrat',
              });
            }
          }
          return results;
        } catch (e) {
          console.log('Macrostrat columns error:', e);
          return [];
        }
      })();

      const macrostratUnitsPromise = (async () => {
        try {
          const unitsUrl = `https://macrostrat.org/api/v2/units?lat=${latitude}&lng=${longitude}&adjacents=true&response=long`;
          const resp = await Promise.race([
            fetch(unitsUrl),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
          ]);
          if (!resp.ok) return [];
          const data = await resp.json();
          const units = data?.success?.data || [];

          const getGeologicPeriod = (age: number): string => {
            if (age < 2.58) return 'Quaternary';
            if (age < 23.03) return 'Miocene';
            if (age < 66) return 'Paleogene';
            if (age < 145) return 'Cretaceous';
            if (age < 201.3) return 'Jurassic';
            if (age < 251.9) return 'Triassic';
            if (age < 298.9) return 'Permian';
            if (age < 358.9) return 'Carboniferous';
            if (age < 419.2) return 'Devonian';
            if (age < 443.8) return 'Silurian';
            if (age < 485.4) return 'Ordovician';
            if (age < 538.8) return 'Cambrian';
            return 'Precambrian';
          };

          const formatLith = (lith: any): string => {
            if (!lith) return 'Unknown';
            if (typeof lith === 'string') return lith;
            if (Array.isArray(lith)) return lith.map((l: any) => l.name || l.lith || l).join(', ');
            return 'Mixed';
          };

          const seen = new Set<string>();
          const results: any[] = [];
          for (const unit of units) {
            const name = unit.strat_name_long || unit.unit_name || 'Unknown Unit';
            if (seen.has(name)) continue;
            seen.add(name);

            const hasCollections = (unit.pbdb_collections || 0) > 0;
            let poiType: string = 'formation';
            if (hasCollections) poiType = 'fossil_site';
            else if (unit.max_thick > 200) poiType = 'outcrop';

            const lithStr = formatLith(unit.lith);
            const period = getGeologicPeriod(unit.t_age || 0);
            const offsetLat = latitude + (Math.random() - 0.5) * 0.12;
            const offsetLng = longitude + (Math.random() - 0.5) * 0.12;

            results.push({
              id: `unit-${unit.unit_id}`,
              name,
              description: `${lithStr} formation from the ${period}. Thickness: ${unit.max_thick || 0}m${hasCollections ? `. ${unit.pbdb_collections} fossil collections recorded.` : ''}`,
              latitude: offsetLat,
              longitude: offsetLng,
              type: poiType,
              rockType: lithStr,
              age: unit.t_age ? `${unit.t_age.toFixed(1)} Ma` : undefined,
              period,
              color: unit.color || '#808080',
              source: 'Macrostrat',
            });
          }
          return results;
        } catch (e) {
          console.log('Macrostrat units error:', e);
          return [];
        }
      })();

      const mineralPromise = (async () => {
        try {
          const mrdsUrl = `https://mrdata.usgs.gov/mrds/map-us.html?bbox=${longitude - degreeSpan},${latitude - degreeSpan},${longitude + degreeSpan},${latitude + degreeSpan}&f=json`;
          const resp = await Promise.race([
            fetch(`https://mrdata.usgs.gov/general/map-us.php?url=mrds&bbox=${longitude - degreeSpan},${latitude - degreeSpan},${longitude + degreeSpan},${latitude + degreeSpan}`),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
          ]);
          return [];
        } catch (e) {
          return [];
        }
      })();

      const [pbdbResults, columnsResults, unitsResults, mineralResults] = await Promise.all([
        pbdbPromise,
        macrostratColumnsPromise,
        macrostratUnitsPromise,
        mineralPromise,
      ]);

      pois.push(...pbdbResults, ...columnsResults, ...unitsResults, ...mineralResults);

      const uniquePois = new Map<string, any>();
      for (const poi of pois) {
        uniquePois.set(poi.id, poi);
      }

      const finalPois = Array.from(uniquePois.values());

      res.json({
        success: true,
        pois: finalPois,
        sources: {
          pbdb: pbdbResults.length,
          macrostrat_columns: columnsResults.length,
          macrostrat_units: unitsResults.length,
          usgs_minerals: mineralResults.length,
          total: finalPois.length,
        },
      });
    } catch (error) {
      console.error('Explore POIs error:', error);
      res.status(500).json({ error: 'Failed to fetch geological POIs' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

