// Script to add sample subjects to Firebase
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Sample subjects for educational platform
const sampleSubjects = [
  { name: 'Mathematics', description: 'Study of numbers, quantities, and shapes', icon: 'calculator' },
  { name: 'English', description: 'Language arts and literature', icon: 'book' },
  { name: 'Biology', description: 'Study of living organisms', icon: 'microscope' },
  { name: 'Chemistry', description: 'Study of matter and its properties', icon: 'flask' },
  { name: 'Physics', description: 'Study of matter, energy, and their interactions', icon: 'atom' },
  { name: 'History', description: 'Study of past events', icon: 'clock' },
  { name: 'Geography', description: 'Study of places and environments', icon: 'globe' },
  { name: 'Computer Science', description: 'Study of computers and computational systems', icon: 'computer' },
  { name: 'Art', description: 'Visual and performing arts', icon: 'palette' },
  { name: 'Music', description: 'Study of sound and musical composition', icon: 'music' }
];

// Function to add subjects to Firebase
export const addSampleSubjects = async () => {
  try {
    console.log('Starting to add sample subjects...');
    const subjectsCollection = collection(db, 'subjects');
    
    // Check existing subjects to avoid duplicates
    const existingSubjectsSnapshot = await getDocs(subjectsCollection);
    const existingSubjects = existingSubjectsSnapshot.docs.map(doc => doc.data().name);
    
    let addedCount = 0;
    
    // Add each subject if it doesn't already exist
    for (const subject of sampleSubjects) {
      if (!existingSubjects.includes(subject.name)) {
        await addDoc(subjectsCollection, {
          ...subject,
          createdAt: new Date()
        });
        addedCount++;
        console.log(`Added subject: ${subject.name}`);
      } else {
        console.log(`Subject already exists: ${subject.name}`);
      }
    }
    
    console.log(`Completed! Added ${addedCount} new subjects.`);
    return addedCount;
  } catch (error) {
    console.error('Error adding sample subjects:', error);
    throw error;
  }
};

export default addSampleSubjects;
