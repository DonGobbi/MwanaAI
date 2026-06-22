/**
 * Test script for AI Knowledge Graph generation
 * 
 * This script demonstrates the functionality of the AI Knowledge Graph service
 * by generating a knowledge graph for a sample subject and topic.
 */

import { db } from '../config/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { subjects, mathTopics, biologyTopics, historyTopics, populateTestData } from '../utils/testData';
import { generateKnowledgeGraph, getKnowledgeGraph, getKnowledgeGraphsForSubject, getConceptsForSubject, getConceptRelationships } from '../services/aiKnowledgeGraphService';

// API configuration
// Using variables instead of trying to modify process.env which causes errors in browser
const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Main test function
 */
async function testKnowledgeGraphGeneration() {
  console.log('🧠 Starting AI Knowledge Graph Test...');
  
  try {
    // Step 1: Ensure test data exists
    console.log('Step 1: Checking for test data...');
    const subjectsQuery = query(collection(db, 'subjects'));
    const subjectsSnapshot = await getDocs(subjectsQuery);
    
    if (subjectsSnapshot.empty) {
      console.log('No test data found. Populating database with test data...');
      await populateTestData(db);
      console.log('Test data populated successfully!');
    } else {
      console.log(`Found ${subjectsSnapshot.size} subjects in the database.`);
    }
    
    // Step 2: Generate a knowledge graph for Algebra
    console.log('\nStep 2: Generating knowledge graph for Algebra...');
    const subjectId = 'subject-math-01';
    const topicId = 'topic-math-algebra-01';
    
    console.log(`Subject: ${subjects.find(s => s.id === subjectId).name}`);
    console.log(`Topic: ${mathTopics.find(t => t.id === topicId).name}`);
    
    console.log('Calling AI to generate knowledge graph...');
    const knowledgeGraph = await generateKnowledgeGraph(subjectId, topicId);
    console.log('Knowledge graph generated successfully!');
    console.log(`Graph ID: ${knowledgeGraph.id}`);
    console.log(`Number of concepts: ${knowledgeGraph.concepts.length}`);
    console.log(`Number of relationships: ${knowledgeGraph.relationships.length}`);
    
    // Step 3: Retrieve and display the generated graph
    console.log('\nStep 3: Retrieving the generated knowledge graph...');
    const retrievedGraph = await getKnowledgeGraph(knowledgeGraph.id);
    
    console.log('Knowledge Graph Summary:');
    console.log('------------------------');
    console.log(`Subject: ${subjects.find(s => s.id === retrievedGraph.subjectId).name}`);
    console.log(`Topic: ${mathTopics.find(t => t.id === retrievedGraph.topicId).name}`);
    console.log(`Created: ${retrievedGraph.createdAt}`);
    console.log(`Updated: ${retrievedGraph.updatedAt}`);
    
    // Step 4: Display concepts and relationships
    console.log('\nStep 4: Displaying concepts and relationships...');
    
    console.log('\nConcepts:');
    console.log('---------');
    retrievedGraph.concepts.forEach((concept, index) => {
      console.log(`${index + 1}. ${concept.name} (${concept.difficulty})`);
      console.log(`   ${concept.description}`);
      if (concept.prerequisites && concept.prerequisites.length > 0) {
        console.log(`   Prerequisites: ${concept.prerequisites.join(', ')}`);
      }
      console.log('');
    });
    
    console.log('\nRelationships:');
    console.log('-------------');
    retrievedGraph.relationships.forEach((rel, index) => {
      console.log(`${index + 1}. ${rel.source} ${rel.type} ${rel.target} (strength: ${rel.strength})`);
    });
    
    // Step 5: Retrieve concepts and relationships from the database
    console.log('\nStep 5: Retrieving concepts and relationships from the database...');
    
    const concepts = await getConceptsForSubject(subjectId, topicId);
    console.log(`Retrieved ${concepts.length} concepts from the database.`);
    
    const relationships = await getConceptRelationships(subjectId, topicId);
    console.log(`Retrieved ${relationships.length} relationships from the database.`);
    
    // Step 6: Generate a knowledge graph for another topic
    console.log('\nStep 6: Generating knowledge graph for Cell Biology...');
    const biologySubjectId = 'subject-biology-01';
    const biologyTopicId = 'topic-biology-cells-01';
    
    console.log(`Subject: ${subjects.find(s => s.id === biologySubjectId).name}`);
    console.log(`Topic: ${biologyTopics.find(t => t.id === biologyTopicId).name}`);
    
    console.log('Calling AI to generate knowledge graph...');
    const biologyGraph = await generateKnowledgeGraph(biologySubjectId, biologyTopicId);
    console.log('Knowledge graph generated successfully!');
    console.log(`Graph ID: ${biologyGraph.id}`);
    console.log(`Number of concepts: ${biologyGraph.concepts.length}`);
    console.log(`Number of relationships: ${biologyGraph.relationships.length}`);
    
    console.log('\n✅ AI Knowledge Graph Test completed successfully!');
    return {
      mathGraph: knowledgeGraph,
      biologyGraph: biologyGraph
    };
  } catch (error) {
    console.error('❌ Error during knowledge graph test:', error);
    throw error;
  }
}

// Execute the test
testKnowledgeGraphGeneration()
  .then(results => {
    console.log('Test execution completed with results:', results);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });

export default testKnowledgeGraphGeneration;
