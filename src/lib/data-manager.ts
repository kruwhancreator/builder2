import fs from 'fs';
import path from 'path';
import chapter1Initial from '@/data/sentence-builder-vol-2/chapter-1.json';

const DATA_FILE_PATH = path.join(process.cwd(), 'src/data/sentence-builder-vol-2/chapter-1.json');

// In-memory cache for fast access and runtime updates
let inMemoryData: any = null;

export function getChapterData(chapter: string = 'chapter-1'): any {
  if (inMemoryData) {
    return inMemoryData;
  }

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      inMemoryData = JSON.parse(fileContent);
      return inMemoryData;
    }
  } catch (err) {
    console.warn('Error reading chapter data file, using default initial data:', err);
  }

  inMemoryData = chapter1Initial;
  return inMemoryData;
}

export async function saveChapterData(newData: any, chapter: string = 'chapter-1'): Promise<boolean> {
  try {
    inMemoryData = newData;
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(newData, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving chapter data file:', err);
    return false;
  }
}
