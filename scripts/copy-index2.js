import { copyFile, mkdir, cp } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

async function copyIndex2Assets() {
  try {
    // Files and directories to copy
    const itemsToCopy = [
      { src: 'index2.html', dest: 'dist/index2.html' },
      { src: 'css', dest: 'dist/css' },
      { src: 'Javascript', dest: 'dist/javascript' } // Note: copying to lowercase to match HTML reference
    ];

    for (const item of itemsToCopy) {
      // Ensure destination directory exists
      const destDir = dirname(item.dest);
      if (!existsSync(destDir)) {
        await mkdir(destDir, { recursive: true });
      }

      // Check if source exists
      if (!existsSync(item.src)) {
        console.log(`⚠️  Source ${item.src} not found, skipping...`);
        continue;
      }

      // Copy file or directory
      if (item.src.includes('.')) {
        // It's a file
        await copyFile(item.src, item.dest);
        console.log(`✅ Successfully copied file ${item.src} to ${item.dest}`);
      } else {
        // It's a directory
        await cp(item.src, item.dest, { recursive: true });
        console.log(`✅ Successfully copied directory ${item.src} to ${item.dest}`);
      }
    }

    console.log('🎉 All index2.html assets copied successfully!');
  } catch (error) {
    console.error(`❌ Error copying assets:`, error);
    process.exit(1);
  }
}

copyIndex2Assets();