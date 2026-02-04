// backend/scripts/seedEventSuggestions.js
// Run this script to populate event and society name suggestions
// Usage: node scripts/seedEventSuggestions.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Define schemas inline (in case models aren't imported correctly)
const eventNameSuggestionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const societyNameSuggestionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Create models
const EventNameSuggestion = mongoose.model('EventNameSuggestion', eventNameSuggestionSchema);
const SocietyNameSuggestion = mongoose.model('SocietyNameSuggestion', societyNameSuggestionSchema);

// ============================================================================
// EVENT NAMES - Common events at Thapar University
// ============================================================================
const eventNames = [
  // Cultural Events
  'Fresher\'s Party',
  'Cultural Fest',
  'Annual Day',
  'Farewell Party',
  'Music Night',
  'Dance Competition',
  'Drama Competition',
  'Fashion Show',
  'Mehfil Night',
  'Open Mic',
  'Poetry Recitation',
  'Short Film Screening',
  'Stand-up Comedy Night',
  'Talent Show',
  'Battle of Bands',
  
  // Technical Events
  'Technical Fest',
  'Hackathon',
  'Coding Competition',
  'Workshop on AI/ML',
  'Workshop on Web Development',
  'Workshop on Mobile App Development',
  'Tech Talk',
  'Guest Lecture',
  'Seminars',
  'Conference',
  'Project Exhibition',
  'Innovation Challenge',
  'Robotics Competition',
  'Science Fair',
  'Paper Presentation',
  
  // Academic Events
  'Orientation Program',
  'Industrial Visit',
  'Mock Interview Session',
  'Career Counseling',
  'Placement Drive',
  'Alumni Meet',
  'Convocation',
  'Teacher\'s Day',
  'Founders Day',
  'Academic Excellence Awards',
  
  // Sports & Fitness
  'Sports Meet',
  'Cricket Tournament',
  'Football Tournament',
  'Basketball Tournament',
  'Badminton Tournament',
  'Table Tennis Championship',
  'Chess Competition',
  'Gaming Tournament',
  'E-Sports Championship',
  'Marathon',
  'Yoga Session',
  'Health Camp',
  'Fitness Workshop',
  
  // Social & Awareness
  'Blood Donation Camp',
  'Environmental Awareness Drive',
  'Tree Plantation Drive',
  'Charity Event',
  'Social Service Drive',
  'Awareness Campaign',
  'Cleanliness Drive',
  'Road Safety Awareness',
  
  // Competitions
  'Quiz Competition',
  'Debate Competition',
  'Photography Contest',
  'Art Exhibition',
  'Literary Fest',
  'Entrepreneurship Summit',
  'Business Plan Competition',
  'Case Study Competition',
  'Model United Nations',
  
  // Celebrations
  'Independence Day Celebration',
  'Republic Day Celebration',
  'Diwali Celebration',
  'Holi Celebration',
  'Christmas Celebration',
  'New Year Eve',
  'Lohri Celebration',
  
  // Miscellaneous
  'Food Festival',
  'College Festival',
  'Departmental Fest',
  'Networking Event',
  'Industry Connect',
  'Startup Expo',
  'Innovation Fair',
  'Technology Exhibition',
];

// ============================================================================
// SOCIETY NAMES - Societies and clubs at Thapar University
// ============================================================================
const societyNames = [
  // Technical Societies
  'IEEE Thapar',
  'CSI Thapar',
  'ACM Thapar',
  'Coding Blocks',
  'Google Developer Student Club',
  'Microsoft Learn Student Chapter',
  'Amazon Web Services Cloud Club',
  'Robotics Club',
  'Aero Club',
  'Automobile Club',
  'Electronics Society',
  'Computer Science Society',
  'Mechanical Engineering Society',
  'Civil Engineering Society',
  'Chemical Engineering Society',
  'Biotechnology Society',
  
  // Entrepreneurship & Business
  'E-Cell Thapar',
  'Enactus Thapar',
  'Entrepreneurship Cell',
  'Marketing Club',
  'Finance Club',
  'HR Club',
  'Consulting Club',
  'Investment Club',
  
  // Cultural Societies
  'Dance Society',
  'Music Society',
  'Drama Club',
  'Fine Arts Society',
  'Photography Club',
  'Cinematography Club',
  'Fashion Society',
  'Literary Society',
  'Debating Society',
  'Quizzing Club',
  'Poetry Club',
  
  // Social Service
  'NSS Thapar',
  'NCC Thapar',
  'Rotaract Club',
  'Social Service Society',
  'Environmental Club',
  'Nature Club',
  'Red Cross Society',
  
  // Sports & Fitness
  'Sports Committee',
  'Cricket Club',
  'Football Club',
  'Basketball Club',
  'Badminton Club',
  'Table Tennis Club',
  'Chess Club',
  'Yoga & Wellness Club',
  'Health & Fitness Club',
  'Adventure Club',
  'Trekking Club',
  
  // Special Interest
  'Gaming Club',
  'E-Sports Club',
  'Anime Club',
  'Movie Club',
  'Food Club',
  'Travel Club',
  'Astronomy Club',
  'Science Club',
  'Mathematics Club',
  'Innovation Club',
  
  // Departmental
  'Cultural Committee',
  'Technical Committee',
  'Fest Organizing Committee',
  'Event Management Team',
  'Student Council',
  'Placement Cell',
  'Training & Placement Cell',
];

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================
const seedSuggestions = async () => {
  try {
    console.log('🚀 Starting seed process...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!MONGO_URI) {
      throw new Error('❌ MONGO_URI not found in environment variables');
    }

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // Clear existing suggestions
    console.log('🗑️  Clearing existing suggestions...');
    await EventNameSuggestion.deleteMany({});
    await SocietyNameSuggestion.deleteMany({});
    console.log('✅ Cleared existing data\n');

    // Seed event names
    console.log('📝 Seeding event names...');
    const eventDocs = eventNames.map(name => ({
      name,
      usageCount: 0,
      lastUsed: new Date(),
    }));
    await EventNameSuggestion.insertMany(eventDocs);
    console.log(`✅ Successfully seeded ${eventNames.length} event names\n`);

    // Seed society names
    console.log('🏛️  Seeding society names...');
    const societyDocs = societyNames.map(name => ({
      name,
      usageCount: 0,
      lastUsed: new Date(),
    }));
    await SocietyNameSuggestion.insertMany(societyDocs);
    console.log(`✅ Successfully seeded ${societyNames.length} society names\n`);

    // Summary
    console.log('━'.repeat(60));
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('━'.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Event Names: ${eventNames.length}`);
    console.log(`   • Society Names: ${societyNames.length}`);
    console.log(`   • Total Entries: ${eventNames.length + societyNames.length}`);
    console.log('━'.repeat(60));
    console.log('\n✨ You can now use autocomplete in the Event Calendar!\n');

    // Close connection
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ SEEDING FAILED!\n');
    console.error('Error details:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    
    // Close connection on error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

// ============================================================================
// RUN THE SCRIPT
// ============================================================================
console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     EVENT CALENDAR - SUGGESTIONS SEED SCRIPT              ║');
console.log('║     Thapar University Hall Booking System                 ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('\n');

seedSuggestions();