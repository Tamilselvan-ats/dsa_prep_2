import { pgTable, text, timestamp, integer, real, boolean, jsonb, serial, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard', 'expert', 'ct_killer']);
export const questionTypeEnum = pgEnum('question_type', ['mcq', 'short_2', 'short_3', 'short_5', 'long_7', 'long_8', 'long_9', 'long_10', 'long_13', 'long_15', 'hots', 'viva', 'coding']);
export const unitEnum = pgEnum('unit', ['unit3', 'unit4']);
export const rankEnum = pgEnum('rank', ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend']);
export const aiProviderEnum = pgEnum('ai_provider', ['gemini', 'openrouter', 'groq', 'together', 'ollama']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  rank: rankEnum('rank').default('bronze'),
  xp: integer('xp').default(0),
  level: integer('level').default(1),
  streak: integer('streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastActiveAt: timestamp('last_active_at'),
  preferredAiProvider: aiProviderEnum('preferred_ai_provider').default('gemini'),
  aiConfig: jsonb('ai_config'), // { provider, model, apiKey, etc. }
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Topics table
export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  unit: unitEnum('unit').notNull(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  parentId: integer('parent_id'),
  order: integer('order').default(0),
  iconName: text('icon_name'),
  tags: jsonb('tags').$type<string[]>().default([]),
});

// User Topic Mastery
export const userTopicMastery = pgTable('user_topic_mastery', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  topicId: integer('topic_id').references(() => topics.id).notNull(),
  learningScore: real('learning_score').default(0),    // 0-100: from AI tutor sessions
  practiceScore: real('practice_score').default(0),    // 0-100: from practice questions
  revisionScore: real('revision_score').default(0),    // 0-100: spaced repetition
  mockTestScore: real('mock_test_score').default(0),   // 0-100: from mock tests
  confidenceScore: real('confidence_score').default(0),// 0-100: self-reported + AI assessed
  masteryScore: real('mastery_score').default(0),      // weighted composite
  practiceCount: integer('practice_count').default(0),
  correctCount: integer('correct_count').default(0),
  lastStudiedAt: timestamp('last_studied_at'),
  nextRevisionAt: timestamp('next_revision_at'),
  revisionInterval: integer('revision_interval').default(1), // days
  easeFactor: real('ease_factor').default(2.5), // SM-2 algorithm
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Questions table
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: integer('topic_id').references(() => topics.id),
  unit: unitEnum('unit').notNull(),
  type: questionTypeEnum('type').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  question: text('question').notNull(),
  options: jsonb('options').$type<string[]>(), // for MCQ
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  wrongOptionsExplanation: jsonb('wrong_options_explanation').$type<Record<string, string>>(),
  modelAnswer: text('model_answer'),
  keywords: jsonb('keywords').$type<string[]>().default([]),
  memoryTricks: text('memory_tricks'),
  examinerExpectedPoints: jsonb('examiner_expected_points').$type<string[]>().default([]),
  commonMistakes: jsonb('common_mistakes').$type<string[]>().default([]),
  marksDistribution: jsonb('marks_distribution'),
  tags: jsonb('tags').$type<string[]>().default([]),
  isAiGenerated: boolean('is_ai_generated').default(true),
  qualityScore: real('quality_score').default(0),
  isValidated: boolean('is_validated').default(false),
  timesSeen: integer('times_seen').default(0),
  timesCorrect: integer('times_correct').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// User Question Attempts
export const questionAttempts = pgTable('question_attempts', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  questionId: uuid('question_id').references(() => questions.id).notNull(),
  userAnswer: text('user_answer'),
  isCorrect: boolean('is_correct'),
  timeTaken: integer('time_taken'), // seconds
  xpEarned: integer('xp_earned').default(0),
  aiEvaluation: jsonb('ai_evaluation'), // { score, feedback, marksAwarded, improvements }
  attemptedAt: timestamp('attempted_at').defaultNow(),
});

// Exams table
export const exams = pgTable('exams', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  pattern: text('pattern').notNull(), // A, B, C, D, E (custom)
  unit: unitEnum('unit'),
  questions: jsonb('questions').$type<string[]>().notNull(), // question IDs
  timeLimitMinutes: integer('time_limit_minutes').default(60),
  status: text('status').default('pending'), // pending, active, completed
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalScore: real('total_score'),
  maxScore: real('max_score'),
  percentile: real('percentile'),
  analytics: jsonb('analytics'), // detailed breakdown
  createdAt: timestamp('created_at').defaultNow(),
});

// AI Conversations
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  topicId: integer('topic_id').references(() => topics.id),
  mode: text('mode').notNull(), // beginner, intermediate, ct_exam, viva, last_minute, professor
  title: text('title'),
  messages: jsonb('messages').$type<Array<{role: string; content: string; timestamp: string}>>().default([]),
  aiProvider: aiProviderEnum('ai_provider').default('gemini'),
  model: text('model'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Study Plans
export const studyPlans = pgTable('study_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  daysUntilExam: integer('days_until_exam'),
  dailyGoalMinutes: integer('daily_goal_minutes').default(60),
  plan: jsonb('plan').notNull(), // structured daily/weekly plan
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Daily Challenges
export const dailyChallenges = pgTable('daily_challenges', {
  id: serial('id').primaryKey(),
  date: text('date').notNull().unique(), // YYYY-MM-DD
  challenges: jsonb('challenges').notNull(), // array of challenge objects
  createdAt: timestamp('created_at').defaultNow(),
});

// User Daily Challenge Attempts
export const dailyChallengeAttempts = pgTable('daily_challenge_attempts', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  challengeDate: text('challenge_date').notNull(),
  completed: boolean('completed').default(false),
  score: real('score').default(0),
  xpEarned: integer('xp_earned').default(0),
  completedAt: timestamp('completed_at'),
});

// Achievements
export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  iconName: text('icon_name').notNull(),
  xpReward: integer('xp_reward').default(0),
  condition: jsonb('condition').notNull(), // { type, value }
});

// User Achievements
export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  achievementId: integer('achievement_id').references(() => achievements.id).notNull(),
  earnedAt: timestamp('earned_at').defaultNow(),
});

// Bookmarks
export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  questionId: uuid('question_id').references(() => questions.id).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Study Sessions (heatmap data)
export const studySessions = pgTable('study_sessions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  durationMinutes: integer('duration_minutes').default(0),
  topicsStudied: jsonb('topics_studied').$type<number[]>().default([]),
  xpEarned: integer('xp_earned').default(0),
  questionsAttempted: integer('questions_attempted').default(0),
  questionsCorrect: integer('questions_correct').default(0),
});

// Code Analysis History
export const codeAnalyses = pgTable('code_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  originalCode: text('original_code').notNull(),
  language: text('language').default('c'),
  analysis: jsonb('analysis').notNull(), // AI analysis result
  fixedCode: text('fixed_code'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Viva Sessions
export const vivaSessions = pgTable('viva_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  topicId: integer('topic_id').references(() => topics.id),
  difficulty: difficultyEnum('difficulty').default('medium'),
  questions: jsonb('questions').notNull(),
  answers: jsonb('answers').default([]),
  scores: jsonb('scores').default([]),
  overallScore: real('overall_score'),
  confidenceAnalysis: jsonb('confidence_analysis'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
