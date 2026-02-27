-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "userId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentGoal" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "ctaType" TEXT NOT NULL,
    "hookBank" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "altAngles" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "ctaVariations" TEXT NOT NULL,
    "thumbnailTexts" TEXT NOT NULL,
    "engagementBaits" TEXT NOT NULL,
    "repurposedContent" TEXT NOT NULL,
    "abVariants" TEXT NOT NULL,
    "rawOutput" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedContent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "contentId" TEXT,
    "template" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "scriptLines" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "voiceId" TEXT,
    "audioUrl" TEXT,
    "audioDuration" INTEGER,
    "wordBoundaries" TEXT,
    "backgroundImage" TEXT,
    "captionStyle" TEXT,
    "hookStyle" TEXT,
    "colorAccent" TEXT,
    "videoPath" TEXT,
    "thumbnailPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Video_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "GeneratedContent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "brandName" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#A855F7',
    "secondaryColor" TEXT NOT NULL DEFAULT '#EC4899',
    "accentColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "logoUrl" TEXT,
    "defaultVoice" TEXT NOT NULL DEFAULT 'jenny',
    "defaultTone" TEXT NOT NULL DEFAULT 'casual',
    "defaultPlatform" TEXT NOT NULL DEFAULT 'tiktok',
    "tagline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandKit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BrandKit_userId_key" ON "BrandKit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_userId_date_key" ON "UsageRecord"("userId", "date");
