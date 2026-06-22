/**
 * AI Knowledge Graph Service
 * 
 * This service manages the creation, maintenance, and querying of
 * an AI-powered knowledge graph of educational concepts.
 */

import { db } from '../config/firebase';
import { doc, collection, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// API configuration
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Generate a knowledge graph for a subject or topic
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - Optional topic ID to narrow the scope
 * @returns {Promise<object>} - The generated knowledge graph
 */
export const generateKnowledgeGraph = async (subjectId, topicId = null) => {
  try {
    // 1. Get subject and topic data
    const subjectData = await getSubjectData(subjectId);
    const topicData = topicId ? await getTopicData(topicId) : null;
    
    // 2. Get existing concepts
    const existingConcepts = await getExistingConcepts(subjectId, topicId);
    
    // 3. Prepare the prompt for knowledge graph generation
    const prompt = prepareKnowledgeGraphPrompt(subjectData, topicData, existingConcepts);
    
    // 4. Call the AI API
    const graphData = await callAIAPI(prompt);
    
    // 5. Process and structure the knowledge graph
    const processedGraph = processKnowledgeGraph(graphData, subjectId, topicId);
    
    // 6. Save the knowledge graph
    const graphId = await saveKnowledgeGraph(processedGraph);
    
    // 7. Save individual concepts and relationships
    await saveConceptsAndRelationships(processedGraph);
    
    return {
      id: graphId,
      ...processedGraph
    };
  } catch (error) {
    console.error('Error generating knowledge graph:', error);
    throw error;
  }
};

/**
 * Get subject data
 * @param {string} subjectId - The subject ID
 * @returns {Promise<object>} - The subject data
 */
const getSubjectData = async (subjectId) => {
  try {
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
    
    if (!subjectDoc.exists()) {
      throw new Error('Subject not found');
    }
    
    return {
      id: subjectId,
      ...subjectDoc.data()
    };
  } catch (error) {
    console.error('Error getting subject data:', error);
    throw error;
  }
};

/**
 * Get topic data
 * @param {string} topicId - The topic ID
 * @returns {Promise<object>} - The topic data
 */
const getTopicData = async (topicId) => {
  try {
    const topicDoc = await getDoc(doc(db, 'topics', topicId));
    
    if (!topicDoc.exists()) {
      throw new Error('Topic not found');
    }
    
    return {
      id: topicId,
      ...topicDoc.data()
    };
  } catch (error) {
    console.error('Error getting topic data:', error);
    throw error;
  }
};

/**
 * Get existing concepts for a subject or topic
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - Optional topic ID
 * @returns {Promise<array>} - The existing concepts
 */
const getExistingConcepts = async (subjectId, topicId = null) => {
  try {
    let conceptsQuery;
    
    if (topicId) {
      conceptsQuery = query(
        collection(db, 'concepts'),
        where('topicId', '==', topicId)
      );
    } else {
      // Get topics for this subject
      const topicsQuery = query(
        collection(db, 'topics'),
        where('subjectId', '==', subjectId)
      );
      
      const topicsSnapshot = await getDocs(topicsQuery);
      const topicIds = topicsSnapshot.docs.map(doc => doc.id);
      
      if (topicIds.length === 0) {
        return [];
      }
      
      // Get concepts for these topics
      // Note: Firestore 'in' queries are limited to 10 values
      const batchSize = 10;
      let allConcepts = [];
      
      for (let i = 0; i < topicIds.length; i += batchSize) {
        const batchIds = topicIds.slice(i, i + batchSize);
        conceptsQuery = query(
          collection(db, 'concepts'),
          where('topicId', 'in', batchIds)
        );
        
        const batchSnapshot = await getDocs(conceptsQuery);
        allConcepts = [...allConcepts, ...batchSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))];
      }
      
      return allConcepts;
    }
    
    const conceptsSnapshot = await getDocs(conceptsQuery);
    
    return conceptsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting existing concepts:', error);
    return [];
  }
};

/**
 * Prepare the prompt for knowledge graph generation
 * @param {object} subjectData - The subject data
 * @param {object} topicData - Optional topic data
 * @param {array} existingConcepts - Existing concepts
 * @returns {object} - The prepared prompt
 */
const prepareKnowledgeGraphPrompt = (subjectData, topicData, existingConcepts) => {
  const scope = topicData ? topicData.name : subjectData.name;
  
  // System message that defines the knowledge graph generation behavior
  const systemMessage = {
    role: "system",
    content: `You are an AI knowledge graph generator for MwanaAI, an educational platform. 
    Your task is to create a comprehensive knowledge graph of concepts for ${scope}.
    
    A knowledge graph consists of:
    1. Concepts (nodes) - Key ideas, terms, principles, or theories
    2. Relationships (edges) - How concepts connect to each other
    
    For each concept, provide:
    - Name: A concise title for the concept
    - Description: A clear, educational explanation
    - Difficulty: beginner, intermediate, or advanced
    - Prerequisites: Other concepts that should be understood first
    - Related concepts: Other concepts that are connected
    - Relationship types: How concepts are related (e.g., "is part of", "depends on", "leads to")
    
    Format your response as a structured JSON object with concepts and relationships.`
  };
  
  // Add existing concepts if available
  if (existingConcepts && existingConcepts.length > 0) {
    systemMessage.content += `\n\nExisting concepts to incorporate and expand upon:`;
    existingConcepts.slice(0, 20).forEach(concept => { // Limit to 20 to keep prompt size reasonable
      systemMessage.content += `\n- ${concept.name}: ${concept.description}`;
    });
  }
  
  // User message to trigger the generation
  const userMessage = {
    role: "user",
    content: `Please generate a knowledge graph for ${scope}. Include key concepts, their descriptions, and how they relate to each other. Format the response as JSON with concepts and relationships.`
  };
  
  // Combine everything into the final prompt
  return {
    messages: [
      systemMessage,
      userMessage
    ],
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  };
};

/**
 * Call the AI API with the prepared prompt
 * @param {object} prompt - The prepared prompt
 * @returns {Promise<string>} - The AI API response
 */
const callAIAPI = async (prompt) => {
  try {
    // For development/testing, return a mock response if no API key is available
    if (!API_KEY) {
      console.warn('No API key found, using mock response');
      return getMockKnowledgeGraph(prompt.messages[0].content);
    }
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: prompt.messages,
        temperature: prompt.temperature,
        max_tokens: prompt.max_tokens,
        top_p: prompt.top_p,
        frequency_penalty: prompt.frequency_penalty,
        presence_penalty: prompt.presence_penalty
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling AI API:', error);
    return getMockKnowledgeGraph(prompt.messages[0].content);
  }
};

/**
 * Process and structure the knowledge graph
 * @param {string} graphData - The raw graph data from AI
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - Optional topic ID
 * @returns {object} - The processed knowledge graph
 */
const processKnowledgeGraph = (graphData, subjectId, topicId = null) => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = graphData.match(/```json\n([\s\S]*?)\n```/) || 
                     graphData.match(/```\n([\s\S]*?)\n```/) ||
                     graphData.match(/{[\s\S]*}/);
    
    let parsedData;
    
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      throw new Error('Could not extract JSON from response');
    }
    
    // Ensure the parsed data has the expected structure
    if (!parsedData.concepts || !Array.isArray(parsedData.concepts)) {
      throw new Error('Invalid knowledge graph structure: missing concepts array');
    }
    
    if (!parsedData.relationships || !Array.isArray(parsedData.relationships)) {
      // Create empty relationships array if missing
      parsedData.relationships = [];
    }
    
    // Add metadata
    return {
      subjectId,
      topicId,
      concepts: parsedData.concepts,
      relationships: parsedData.relationships,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing knowledge graph:', error);
    
    // Return a minimal valid structure
    return {
      subjectId,
      topicId,
      concepts: [],
      relationships: [],
      error: error.message,
      rawData: graphData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
};

/**
 * Save the knowledge graph to the database
 * @param {object} processedGraph - The processed knowledge graph
 * @returns {Promise<string>} - The graph ID
 */
const saveKnowledgeGraph = async (processedGraph) => {
  try {
    const graphRef = await addDoc(collection(db, 'knowledgeGraphs'), {
      ...processedGraph,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return graphRef.id;
  } catch (error) {
    console.error('Error saving knowledge graph:', error);
    throw error;
  }
};

/**
 * Save individual concepts and relationships to the database
 * @param {object} processedGraph - The processed knowledge graph
 * @returns {Promise<void>}
 */
const saveConceptsAndRelationships = async (processedGraph) => {
  try {
    const { subjectId, topicId, concepts, relationships } = processedGraph;
    
    // Map to store concept IDs by name for relationship creation
    const conceptIdMap = {};
    
    // Save or update concepts
    for (const concept of concepts) {
      // Check if concept already exists
      const conceptQuery = query(
        collection(db, 'concepts'),
        where('name', '==', concept.name),
        where('subjectId', '==', subjectId),
        limit(1)
      );
      
      const conceptSnapshot = await getDocs(conceptQuery);
      
      let conceptId;
      
      if (conceptSnapshot.empty) {
        // Create new concept
        const conceptRef = await addDoc(collection(db, 'concepts'), {
          name: concept.name,
          description: concept.description,
          difficulty: concept.difficulty || 'intermediate',
          subjectId,
          topicId: topicId || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        conceptId = conceptRef.id;
      } else {
        // Update existing concept
        const existingConcept = conceptSnapshot.docs[0];
        conceptId = existingConcept.id;
        
        await updateDoc(doc(db, 'concepts', conceptId), {
          description: concept.description,
          difficulty: concept.difficulty || existingConcept.data().difficulty || 'intermediate',
          updatedAt: serverTimestamp()
        });
      }
      
      // Store the concept ID for relationship creation
      conceptIdMap[concept.name] = conceptId;
    }
    
    // Save relationships
    for (const relationship of relationships) {
      const sourceId = conceptIdMap[relationship.source];
      const targetId = conceptIdMap[relationship.target];
      
      if (!sourceId || !targetId) {
        console.warn('Could not find concept IDs for relationship:', relationship);
        continue;
      }
      
      // Check if relationship already exists
      const relationshipQuery = query(
        collection(db, 'conceptRelationships'),
        where('sourceId', '==', sourceId),
        where('targetId', '==', targetId),
        limit(1)
      );
      
      const relationshipSnapshot = await getDocs(relationshipQuery);
      
      if (relationshipSnapshot.empty) {
        // Create new relationship
        await addDoc(collection(db, 'conceptRelationships'), {
          sourceId,
          targetId,
          type: relationship.type || 'related',
          strength: relationship.strength || 1,
          subjectId,
          topicId: topicId || null,
          createdAt: serverTimestamp()
        });
      } else {
        // Update existing relationship
        const existingRelationship = relationshipSnapshot.docs[0];
        
        await updateDoc(doc(db, 'conceptRelationships', existingRelationship.id), {
          type: relationship.type || existingRelationship.data().type || 'related',
          strength: relationship.strength || existingRelationship.data().strength || 1,
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error saving concepts and relationships:', error);
    throw error;
  }
};

/**
 * Get mock knowledge graph for development/testing
 * @param {string} prompt - The prompt content
 * @returns {string} - Mock knowledge graph
 */
const getMockKnowledgeGraph = (prompt) => {
  // Check if the prompt contains specific subjects
  if (prompt.includes('photosynthesis') || prompt.includes('biology')) {
    return `
\`\`\`json
{
  "concepts": [
    {
      "name": "Photosynthesis",
      "description": "The process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll.",
      "difficulty": "intermediate",
      "prerequisites": ["Chlorophyll", "Cellular Respiration"]
    },
    {
      "name": "Chlorophyll",
      "description": "A green pigment found in plants that absorbs light energy for photosynthesis.",
      "difficulty": "beginner",
      "prerequisites": []
    },
    {
      "name": "Light-Dependent Reactions",
      "description": "The first stage of photosynthesis where light energy is converted to chemical energy.",
      "difficulty": "advanced",
      "prerequisites": ["Photosynthesis", "Chlorophyll"]
    },
    {
      "name": "Calvin Cycle",
      "description": "The second stage of photosynthesis where carbon dioxide is converted into glucose.",
      "difficulty": "advanced",
      "prerequisites": ["Photosynthesis", "Light-Dependent Reactions"]
    },
    {
      "name": "Cellular Respiration",
      "description": "The process by which cells convert glucose into energy in the form of ATP.",
      "difficulty": "intermediate",
      "prerequisites": []
    }
  ],
  "relationships": [
    {
      "source": "Chlorophyll",
      "target": "Photosynthesis",
      "type": "enables",
      "strength": 0.9
    },
    {
      "source": "Photosynthesis",
      "target": "Light-Dependent Reactions",
      "type": "includes",
      "strength": 1.0
    },
    {
      "source": "Photosynthesis",
      "target": "Calvin Cycle",
      "type": "includes",
      "strength": 1.0
    },
    {
      "source": "Light-Dependent Reactions",
      "target": "Calvin Cycle",
      "type": "precedes",
      "strength": 0.8
    },
    {
      "source": "Photosynthesis",
      "target": "Cellular Respiration",
      "type": "opposite of",
      "strength": 0.7
    }
  ]
}
\`\`\`
    `;
  }
  
  if (prompt.includes('algebra') || prompt.includes('mathematics')) {
    return `
\`\`\`json
{
  "concepts": [
    {
      "name": "Variable",
      "description": "A symbol (usually a letter) that represents an unknown value.",
      "difficulty": "beginner",
      "prerequisites": []
    },
    {
      "name": "Expression",
      "description": "A combination of variables, numbers, and operations that represents a value.",
      "difficulty": "beginner",
      "prerequisites": ["Variable"]
    },
    {
      "name": "Equation",
      "description": "A statement that two expressions are equal.",
      "difficulty": "beginner",
      "prerequisites": ["Expression"]
    },
    {
      "name": "Linear Equation",
      "description": "An equation where the variable has an exponent of 1.",
      "difficulty": "intermediate",
      "prerequisites": ["Equation"]
    },
    {
      "name": "Quadratic Equation",
      "description": "An equation where the highest exponent of the variable is 2.",
      "difficulty": "intermediate",
      "prerequisites": ["Equation"]
    },
    {
      "name": "Factoring",
      "description": "The process of finding expressions that can be multiplied to give a specific expression.",
      "difficulty": "intermediate",
      "prerequisites": ["Expression"]
    },
    {
      "name": "Quadratic Formula",
      "description": "A formula used to solve quadratic equations: x = (-b ± √(b² - 4ac)) / 2a.",
      "difficulty": "advanced",
      "prerequisites": ["Quadratic Equation"]
    }
  ],
  "relationships": [
    {
      "source": "Variable",
      "target": "Expression",
      "type": "component of",
      "strength": 0.9
    },
    {
      "source": "Expression",
      "target": "Equation",
      "type": "component of",
      "strength": 0.9
    },
    {
      "source": "Equation",
      "target": "Linear Equation",
      "type": "generalizes",
      "strength": 0.8
    },
    {
      "source": "Equation",
      "target": "Quadratic Equation",
      "type": "generalizes",
      "strength": 0.8
    },
    {
      "source": "Factoring",
      "target": "Quadratic Equation",
      "type": "solves",
      "strength": 0.7
    },
    {
      "source": "Quadratic Formula",
      "target": "Quadratic Equation",
      "type": "solves",
      "strength": 1.0
    }
  ]
}
\`\`\`
    `;
  }
  
  // Default mock response for other subjects
  return `
\`\`\`json
{
  "concepts": [
    {
      "name": "Concept 1",
      "description": "Description of the first key concept in this subject.",
      "difficulty": "beginner",
      "prerequisites": []
    },
    {
      "name": "Concept 2",
      "description": "Description of the second key concept in this subject.",
      "difficulty": "beginner",
      "prerequisites": ["Concept 1"]
    },
    {
      "name": "Concept 3",
      "description": "Description of the third key concept in this subject.",
      "difficulty": "intermediate",
      "prerequisites": ["Concept 1", "Concept 2"]
    },
    {
      "name": "Concept 4",
      "description": "Description of the fourth key concept in this subject.",
      "difficulty": "intermediate",
      "prerequisites": ["Concept 2"]
    },
    {
      "name": "Concept 5",
      "description": "Description of the fifth key concept in this subject.",
      "difficulty": "advanced",
      "prerequisites": ["Concept 3", "Concept 4"]
    }
  ],
  "relationships": [
    {
      "source": "Concept 1",
      "target": "Concept 2",
      "type": "leads to",
      "strength": 0.8
    },
    {
      "source": "Concept 1",
      "target": "Concept 3",
      "type": "supports",
      "strength": 0.6
    },
    {
      "source": "Concept 2",
      "target": "Concept 3",
      "type": "supports",
      "strength": 0.9
    },
    {
      "source": "Concept 2",
      "target": "Concept 4",
      "type": "leads to",
      "strength": 0.7
    },
    {
      "source": "Concept 3",
      "target": "Concept 5",
      "type": "prerequisite for",
      "strength": 1.0
    },
    {
      "source": "Concept 4",
      "target": "Concept 5",
      "type": "prerequisite for",
      "strength": 1.0
    }
  ]
}
\`\`\`
  `;
};

/**
 * Get a knowledge graph by ID
 * @param {string} graphId - The knowledge graph ID
 * @returns {Promise<object>} - The knowledge graph
 */
export const getKnowledgeGraph = async (graphId) => {
  try {
    const graphDoc = await getDoc(doc(db, 'knowledgeGraphs', graphId));
    
    if (!graphDoc.exists()) {
      throw new Error('Knowledge graph not found');
    }
    
    return {
      id: graphId,
      ...graphDoc.data(),
      createdAt: graphDoc.data().createdAt ? new Date(graphDoc.data().createdAt.toMillis()) : new Date(),
      updatedAt: graphDoc.data().updatedAt ? new Date(graphDoc.data().updatedAt.toMillis()) : new Date()
    };
  } catch (error) {
    console.error('Error getting knowledge graph:', error);
    throw error;
  }
};

/**
 * Get knowledge graphs for a subject or topic
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - Optional topic ID
 * @returns {Promise<array>} - The knowledge graphs
 */
export const getKnowledgeGraphsForSubject = async (subjectId, topicId = null) => {
  try {
    let graphsQuery;
    
    if (topicId) {
      graphsQuery = query(
        collection(db, 'knowledgeGraphs'),
        where('subjectId', '==', subjectId),
        where('topicId', '==', topicId),
        orderBy('createdAt', 'desc')
      );
    } else {
      graphsQuery = query(
        collection(db, 'knowledgeGraphs'),
        where('subjectId', '==', subjectId),
        orderBy('createdAt', 'desc')
      );
    }
    
    const graphsSnapshot = await getDocs(graphsQuery);
    
    return graphsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date(),
      updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting knowledge graphs for subject:', error);
    throw error;
  }
};

/**
 * Get concepts for a subject or topic
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - Optional topic ID
 * @returns {Promise<array>} - The concepts
 */
export const getConceptsForSubject = async (subjectId, topicId = null) => {
  try {
    let conceptsQuery;
    
    if (topicId) {
      conceptsQuery = query(
        collection(db, 'concepts'),
        where('subjectId', '==', subjectId),
        where('topicId', '==', topicId)
      );
    } else {
      conceptsQuery = query(
        collection(db, 'concepts'),
        where('subjectId', '==', subjectId)
      );
    }
    
    const conceptsSnapshot = await getDocs(conceptsQuery);
    
    return conceptsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date(),
      updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting concepts for subject:', error);
    throw error;
  }
};

/**
 * Get relationships between concepts
 * @param {string} subjectId - The subject ID
 * @param {string} topicId - Optional topic ID
 * @returns {Promise<array>} - The relationships
 */
export const getConceptRelationships = async (subjectId, topicId = null) => {
  try {
    let relationshipsQuery;
    
    if (topicId) {
      relationshipsQuery = query(
        collection(db, 'conceptRelationships'),
        where('subjectId', '==', subjectId),
        where('topicId', '==', topicId)
      );
    } else {
      relationshipsQuery = query(
        collection(db, 'conceptRelationships'),
        where('subjectId', '==', subjectId)
      );
    }
    
    const relationshipsSnapshot = await getDocs(relationshipsQuery);
    
    return relationshipsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date()
    }));
  } catch (error) {
    console.error('Error getting concept relationships:', error);
    throw error;
  }
};
