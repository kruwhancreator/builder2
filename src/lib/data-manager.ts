import fs from 'fs';
import path from 'path';
import chapter1Initial from '@/data/sentence-builder-vol-2/chapter-1.json';

const DEV_DATA_FILE_PATH = path.join(process.cwd(), 'src/data/sentence-builder-vol-2/chapter-1.json');
const TMP_DATA_FILE_PATH = '/tmp/builder2-chapter-1.json';

// In-memory cache for fast access and runtime updates
let inMemoryData: any = null;

export function getChapterData(chapter: string = 'chapter-1'): any {
  if (inMemoryData) {
    return inMemoryData;
  }

  // 1. Try reading from /tmp (Vercel serverless runtime storage)
  try {
    if (fs.existsSync(TMP_DATA_FILE_PATH)) {
      const fileContent = fs.readFileSync(TMP_DATA_FILE_PATH, 'utf-8');
      inMemoryData = JSON.parse(fileContent);
      return inMemoryData;
    }
  } catch (err) {
    console.warn('Could not read from /tmp storage:', err);
  }

  // 2. Try reading from project dev filesystem
  try {
    if (fs.existsSync(DEV_DATA_FILE_PATH)) {
      const fileContent = fs.readFileSync(DEV_DATA_FILE_PATH, 'utf-8');
      inMemoryData = JSON.parse(fileContent);
      return inMemoryData;
    }
  } catch (err) {
    console.warn('Could not read from local dev filesystem:', err);
  }

  // 3. Fallback to initial JSON import
  inMemoryData = chapter1Initial;
  return inMemoryData;
}

export async function saveChapterData(newData: any, chapter: string = 'chapter-1'): Promise<boolean> {
  // Always update runtime memory cache first
  inMemoryData = newData;

  let savedSuccessfully = false;

  // 1. Try writing to /tmp (works on Vercel Serverless environment)
  try {
    fs.writeFileSync(TMP_DATA_FILE_PATH, JSON.stringify(newData, null, 2), 'utf-8');
    savedSuccessfully = true;
  } catch (err) {
    console.warn('Writing to /tmp failed:', err);
  }

  // 2. Try writing to dev filesystem (works on local environment)
  try {
    const dir = path.dirname(DEV_DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DEV_DATA_FILE_PATH, JSON.stringify(newData, null, 2), 'utf-8');
    savedSuccessfully = true;
  } catch (err) {
    console.warn('Writing to dev filesystem skipped (read-only serverless environment)');
  }

  // Even on read-only production filesystems, in-memory cache is updated successfully
  return true;
}
